import type { SubscriptionPlan } from "@prisma/client";
import { planOrder } from "@/lib/plans";

const PREFIX = "zelo";
const SEPARATOR = ":";

export type CheckoutReference = {
  companyId: string;
  planCode: SubscriptionPlan;
};

/**
 * O Asaas devolve o externalReference intacto nos eventos de cobranca, e ele e
 * a unica coisa que liga um pagamento de volta a aplicacao. Como precisamos
 * saber tanto a empresa quanto o plano comprado, os dois viajam juntos aqui.
 *
 * O prefixo existe para que uma cobranca criada por fora da Zelo (direto no
 * painel do Asaas, por exemplo) nao seja confundida com uma assinatura nossa.
 */
export function encodeCheckoutReference(reference: CheckoutReference) {
  return [PREFIX, reference.companyId, reference.planCode].join(SEPARATOR);
}

export function decodeCheckoutReference(value: string | null | undefined): CheckoutReference | null {
  if (!value) {
    return null;
  }

  const parts = value.split(SEPARATOR);

  if (parts.length !== 3) {
    return null;
  }

  const [prefix, companyId, planCode] = parts;

  if (prefix !== PREFIX || !companyId) {
    return null;
  }

  if (!(planOrder as readonly string[]).includes(planCode)) {
    return null;
  }

  return {
    companyId,
    planCode: planCode as SubscriptionPlan,
  };
}
