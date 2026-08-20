import "server-only";
import type { Prisma, SubscriptionPlan } from "@prisma/client";
import { decodeCheckoutReference } from "@/lib/asaas/reference";
import { ASAAS_PROVIDER, type AsaasWebhookEvent } from "@/lib/asaas/types";
import { prisma } from "@/lib/db/client";

/** Eventos que liberam o acesso ao plano. */
const GRANTING_EVENTS = new Set(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);

/** Eventos que indicam que o dinheiro nao entrou ou voltou. */
const REVOKING_EVENTS = new Set(["PAYMENT_REFUNDED", "PAYMENT_CHARGEBACK_REQUESTED"]);

export type ProcessOutcome =
  | { handled: true; action: "granted" | "past_due" | "revoked" | "invoice_opened"; companyId: string }
  | { handled: false; reason: string };

/** Um ciclo mensal a partir da data de pagamento. */
function addOneMonth(from: Date) {
  const end = new Date(from);
  end.setMonth(end.getMonth() + 1);

  return end;
}

async function findPlanCatalogId(planCode: SubscriptionPlan) {
  const plan = await prisma.planCatalog.findUnique({
    where: { code: planCode },
    select: { id: true },
  });

  return plan?.id ?? null;
}

/**
 * Traduz um evento de cobranca do Asaas em estado de assinatura da empresa.
 *
 * Roda dentro da mesma transacao que registra o evento, para que gravar e
 * aplicar sejam uma coisa so: ou o evento fica registrado e aplicado, ou nao
 * acontece nada e o Asaas reenvia.
 */
export async function applyPaymentEvent(
  tx: Prisma.TransactionClient,
  event: AsaasWebhookEvent,
): Promise<ProcessOutcome> {
  const payment = event.payment;

  if (!payment) {
    return { handled: false, reason: "evento sem objeto de cobranca" };
  }

  const reference = decodeCheckoutReference(payment.externalReference);

  if (!reference) {
    // Cobranca criada fora da Zelo, ou de uma versao anterior do checkout.
    return { handled: false, reason: "externalReference nao reconhecido" };
  }

  const company = await tx.company.findUnique({
    where: { id: reference.companyId },
    select: { id: true },
  });

  if (!company) {
    return { handled: false, reason: "empresa do externalReference nao existe" };
  }

  const planId = await findPlanCatalogId(reference.planCode);

  if (!planId) {
    return { handled: false, reason: `plano ${reference.planCode} ausente do catalogo` };
  }

  const existing = await tx.companySubscription.findFirst({
    where: { companyId: company.id },
    orderBy: { currentPeriodEnd: "desc" },
    select: { id: true },
  });

  if (GRANTING_EVENTS.has(event.event)) {
    const paidAt = payment.paymentDate ? new Date(payment.paymentDate) : new Date();
    const start = Number.isNaN(paidAt.getTime()) ? new Date() : paidAt;
    const end = addOneMonth(start);

    const data = {
      companyId: company.id,
      planId,
      provider: ASAAS_PROVIDER,
      externalId: payment.subscription ?? null,
      status: "ACTIVE" as const,
      currentPeriodStart: start,
      currentPeriodEnd: end,
      canceledAt: null,
    };

    const subscription = existing
      ? await tx.companySubscription.update({ where: { id: existing.id }, data })
      : await tx.companySubscription.create({ data });

    // O plano tambem fica na empresa porque varias telas leem dali.
    await tx.company.update({
      where: { id: company.id },
      data: { plan: reference.planCode },
    });

    await tx.invoice.upsert({
      where: { externalId: payment.id },
      create: {
        companyId: company.id,
        subscriptionId: subscription.id,
        number: payment.id,
        provider: ASAAS_PROVIDER,
        externalId: payment.id,
        checkoutUrl: payment.invoiceUrl ?? null,
        status: "PAID",
        amountCents: Math.round(payment.value * 100),
        dueDate: new Date(payment.dueDate),
        paidAt: start,
        periodStart: start,
        periodEnd: end,
        description: `Plano ${reference.planCode}`,
      },
      update: {
        status: "PAID",
        paidAt: start,
      },
    });

    return { handled: true, action: "granted", companyId: company.id };
  }

  if (event.event === "PAYMENT_OVERDUE" && existing) {
    await tx.companySubscription.update({
      where: { id: existing.id },
      data: { status: "PAST_DUE" },
    });

    return { handled: true, action: "past_due", companyId: company.id };
  }

  if (REVOKING_EVENTS.has(event.event) && existing) {
    await tx.companySubscription.update({
      where: { id: existing.id },
      data: { status: "CANCELED", canceledAt: new Date() },
    });

    await tx.company.update({
      where: { id: company.id },
      data: { plan: null },
    });

    return { handled: true, action: "revoked", companyId: company.id };
  }

  if (event.event === "PAYMENT_CREATED") {
    await tx.invoice.upsert({
      where: { externalId: payment.id },
      create: {
        companyId: company.id,
        subscriptionId: existing?.id ?? null,
        number: payment.id,
        provider: ASAAS_PROVIDER,
        externalId: payment.id,
        checkoutUrl: payment.invoiceUrl ?? null,
        status: "OPEN",
        amountCents: Math.round(payment.value * 100),
        dueDate: new Date(payment.dueDate),
        periodStart: new Date(),
        periodEnd: addOneMonth(new Date()),
        description: `Plano ${reference.planCode}`,
      },
      update: {},
    });

    return { handled: true, action: "invoice_opened", companyId: company.id };
  }

  return { handled: false, reason: `evento ${event.event} sem efeito sobre a assinatura` };
}
