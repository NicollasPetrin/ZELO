import type { SubscriptionPlan } from "@prisma/client";

export const NO_ACTIVE_SUBSCRIPTION_MESSAGE =
  "Sua empresa ainda nao possui assinatura ativa. Escolha um plano para liberar as funcionalidades.";

type ActivePlanCompany = {
  subscriptions?: Array<{
    plan: {
      code: SubscriptionPlan;
    };
  }>;
};

export function getActivePlanCode(company: ActivePlanCompany): SubscriptionPlan | null {
  return company.subscriptions?.[0]?.plan.code ?? null;
}

export function assertActivePlanCode(plan: SubscriptionPlan | null | undefined): SubscriptionPlan {
  if (!plan) {
    throw new Error(NO_ACTIVE_SUBSCRIPTION_MESSAGE);
  }

  return plan;
}

export function assertCompanyHasActivePlan(company: ActivePlanCompany): SubscriptionPlan {
  return assertActivePlanCode(getActivePlanCode(company));
}
