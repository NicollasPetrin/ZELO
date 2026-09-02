"use server";

import type { SubscriptionPlan } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { actionError } from "@/lib/action-result";
import { AsaasError, createCheckout, deleteSubscription } from "@/lib/asaas/client";
import { ASAAS_PROVIDER } from "@/lib/asaas/types";
import { ensureAsaasCustomer } from "@/features/billing/asaas-customer";
import { recordActivity } from "@/lib/audit";
import { assertCanManageCompany } from "@/lib/auth/guards";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { ASAAS_NOT_CONFIGURED_MESSAGE, getAppUrl, isAsaasConfigured } from "@/lib/env";
import { calculateMonthlyPrice, formatPriceCents, planDetails } from "@/lib/plans";
import { assertUserActionRateLimit } from "@/lib/rate-limit";
import { subscriptionPlanSchema } from "@/lib/validations";

const CHECKOUT_EXPIRATION_MINUTES = 60;

function formatBrDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

/** O Asaas espera a data no formato YYYY-MM-DD. */
function formatDueDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function startPlanCheckoutAction(planCode: SubscriptionPlan) {
  try {
    const user = await requireUser();
    assertCanManageCompany(user);
    await assertUserActionRateLimit(user.id, "billing:start-plan-checkout");
    const parsedPlanCode = subscriptionPlanSchema.parse(planCode);

    if (user.company.isDemo) {
      throw new Error("Contas demo nao podem iniciar checkout real.");
    }

    const plan = planDetails[parsedPlanCode];
    const activeUserCount = await prisma.user.count({
      where: {
        companyId: user.companyId,
        isActive: true,
      },
    });
    const price = calculateMonthlyPrice(parsedPlanCode, activeUserCount);

    if (price.requiresUpgrade || price.totalPriceCents === null) {
      throw new Error(`O Plano ${plan.name} nao comporta ${activeUserCount} usuarios ativos. Escolha um plano maior.`);
    }

    if (!isAsaasConfigured()) {
      throw new Error(ASAAS_NOT_CONFIGURED_MESSAGE);
    }

    // O pagamento nao carrega de volta nem a empresa nem o plano, entao os dois
    // sao amarrados aqui: a empresa pelo cliente do Asaas, e o plano pela
    // intencao registrada no proprio cadastro dela.
    const asaasCustomerId = await ensureAsaasCustomer({
      id: user.company.id,
      name: user.company.name,
      document: user.company.document,
      email: user.company.email,
      phone: user.company.phone,
      postalCode: user.company.postalCode,
      address: user.company.address,
      addressNumber: user.company.addressNumber,
      addressComplement: user.company.addressComplement,
      province: user.company.province,
      asaasCustomerId: user.company.asaasCustomerId,
    });

    await prisma.company.update({
      where: { id: user.companyId },
      data: { pendingPlanCode: parsedPlanCode },
    });

    const appUrl = getAppUrl();
    // O retorno carrega o desfecho para que a pagina saiba o que dizer. Sem
    // isso, quem paga volta para uma tela que ainda mostra "sem plano ativo",
    // porque a confirmacao chega por webhook e pode demorar mais que o
    // redirecionamento.
    const retorno = (estado: string) => `${appUrl}/settings?pagamento=${estado}`;

    const checkout = await createCheckout({
      billingTypes: ["CREDIT_CARD"],
      // Recorrencia no checkout hospedado so existe para cartao. PIX e boleto
      // seguem por assinatura avulsa, com pagamento manual a cada ciclo.
      chargeTypes: ["RECURRENT"],
      minutesToExpire: CHECKOUT_EXPIRATION_MINUTES,
      customer: asaasCustomerId,
      items: [
        {
          name: `Plano ${plan.name}`,
          description: `Assinatura mensal da Zelo para ${activeUserCount} usuario(s) ativo(s).`,
          quantity: 1,
          value: price.totalPriceCents / 100,
        },
      ],
      subscription: {
        cycle: "MONTHLY",
        nextDueDate: formatDueDate(new Date()),
      },
      callback: {
        successUrl: retorno("confirmado"),
        cancelUrl: retorno("cancelado"),
        expiredUrl: retorno("expirado"),
        autoRedirect: true,
      },
    });

    await recordActivity({
      companyId: user.companyId,
      actorId: user.id,
      type: "SUBSCRIPTION_CHANGED",
      entityType: "SubscriptionPlan",
      entityId: parsedPlanCode,
      title: "Checkout de plano iniciado",
      description: `Plano ${plan.name}`,
      metadata: {
        activeUserCount,
        totalPriceCents: price.totalPriceCents,
        checkoutId: checkout.id,
      },
    });

    return {
      ok: true,
      data: {
        checkoutUrl: checkout.link,
      },
      message: `Redirecionando para o pagamento do Plano ${plan.name}, ${formatPriceCents(price.totalPriceCents)}/mes.`,
    } as const;
  } catch (error) {
    return actionError(error, "Nao foi possivel iniciar a compra do plano.");
  }
}

/**
 * Cancela a renovacao da assinatura, mantendo o acesso ate o fim do periodo
 * que ja foi pago.
 *
 * A ordem importa: a renovacao e interrompida no Asaas primeiro e so entao a
 * empresa e marcada como cancelada. Fazer o contrario abriria a hipotese de
 * tirar o acesso do cliente e continuar cobrando dele no mes seguinte.
 */
export async function cancelSubscriptionAction() {
  try {
    const user = await requireUser();
    assertCanManageCompany(user);
    await assertUserActionRateLimit(user.id, "billing:cancel-subscription");

    if (user.company.isDemo) {
      throw new Error("Contas demo nao possuem assinatura real para cancelar.");
    }

    const subscription = await prisma.companySubscription.findFirst({
      where: {
        companyId: user.companyId,
        status: { in: ["TRIALING", "ACTIVE", "PAST_DUE"] },
      },
      orderBy: { currentPeriodEnd: "desc" },
      include: { plan: { select: { code: true, name: true } } },
    });

    if (!subscription) {
      throw new Error("Nao ha assinatura ativa para cancelar.");
    }

    if (subscription.cancelAtPeriodEnd) {
      throw new Error("Esta assinatura ja esta cancelada e vale ate o fim do periodo contratado.");
    }

    if (subscription.provider === ASAAS_PROVIDER && subscription.externalId) {
      if (!isAsaasConfigured()) {
        throw new Error(ASAAS_NOT_CONFIGURED_MESSAGE);
      }

      try {
        await deleteSubscription(subscription.externalId);
      } catch (error) {
        // 404 significa que a assinatura ja nao existe la: o efeito desejado
        // ja vale, entao seguir e correto. Qualquer outra falha interrompe,
        // porque marcar como cancelada aqui sem ter cancelado la deixaria a
        // cobranca correndo.
        if (!(error instanceof AsaasError) || error.status !== 404) {
          throw error;
        }
      }
    }

    const agora = new Date();

    await prisma.$transaction([
      prisma.companySubscription.update({
        where: { id: subscription.id },
        data: { cancelAtPeriodEnd: true, canceledAt: agora },
      }),
      // Cobranca aberta com vencimento a frente nao vai mais acontecer; deixa-la
      // em aberto faria a empresa continuar vendo uma fatura a pagar.
      prisma.invoice.updateMany({
        where: {
          subscriptionId: subscription.id,
          status: "OPEN",
          dueDate: { gt: agora },
        },
        data: { status: "CANCELED" },
      }),
    ]);

    await recordActivity({
      companyId: user.companyId,
      actorId: user.id,
      type: "SUBSCRIPTION_CHANGED",
      entityType: "CompanySubscription",
      entityId: subscription.id,
      title: "Assinatura cancelada",
      description: `Plano ${subscription.plan.name}, acesso ate o fim do periodo contratado`,
      metadata: {
        planCode: subscription.plan.code,
        currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
        externalId: subscription.externalId,
      },
    });

    revalidatePath("/settings");
    revalidatePath("/", "layout");

    return {
      ok: true,
      message:
        `Assinatura cancelada. O acesso continua ate ${formatBrDate(subscription.currentPeriodEnd)} ` +
        "e nenhuma nova cobranca sera feita.",
    } as const;
  } catch (error) {
    return actionError(error, "Nao foi possivel cancelar a assinatura.");
  }
}
