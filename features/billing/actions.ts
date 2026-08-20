"use server";

import type { SubscriptionPlan } from "@prisma/client";
import { actionError } from "@/lib/action-result";
import { createCheckout } from "@/lib/asaas/client";
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
    const settingsUrl = `${appUrl}/settings#gerenciamento-assinatura`;

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
        successUrl: settingsUrl,
        cancelUrl: settingsUrl,
        expiredUrl: settingsUrl,
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
