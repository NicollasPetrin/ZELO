"use server";

import type { SubscriptionPlan } from "@prisma/client";
import { actionError } from "@/lib/action-result";
import { recordActivity } from "@/lib/audit";
import { assertCanManageCompany } from "@/lib/auth/guards";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { calculateMonthlyPrice, formatPriceCents, planDetails } from "@/lib/plans";
import { assertUserActionRateLimit } from "@/lib/rate-limit";
import { subscriptionPlanSchema } from "@/lib/validations";

const CHECKOUT_NOT_CONFIGURED_MESSAGE =
  "Checkout de pagamento ainda nao configurado. Configure a processadora para permitir a compra online do plano.";

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

    if (!process.env.ASAAS_API_KEY) {
      throw new Error(CHECKOUT_NOT_CONFIGURED_MESSAGE);
    }

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
      },
    });

    return {
      ok: true,
      data: {
        checkoutUrl: null,
      },
      message: `Checkout do Plano ${plan.name} preparado para ${formatPriceCents(price.totalPriceCents)}/mes. Falta conectar a API da processadora para gerar o link de pagamento.`,
    } as const;
  } catch (error) {
    return actionError(error, "Nao foi possivel iniciar a compra do plano.");
  }
}
