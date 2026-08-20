"use server";

import type { SubscriptionPlan } from "@prisma/client";
import { actionError } from "@/lib/action-result";
import { createCheckout } from "@/lib/asaas/client";
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

    const appUrl = getAppUrl();
    const settingsUrl = `${appUrl}/settings#gerenciamento-assinatura`;

    const checkout = await createCheckout({
      billingTypes: ["CREDIT_CARD"],
      // Recorrencia no checkout hospedado so existe para cartao. PIX e boleto
      // seguem por assinatura avulsa, com pagamento manual a cada ciclo.
      chargeTypes: ["RECURRENT"],
      minutesToExpire: CHECKOUT_EXPIRATION_MINUTES,
      // E por aqui que o webhook reencontra a empresa quando o pagamento chega.
      externalReference: user.companyId,
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
