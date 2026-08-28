import "server-only";
import type { Prisma, SubscriptionPlan } from "@prisma/client";
import { ASAAS_PROVIDER, type AsaasWebhookEvent } from "@/lib/asaas/types";
import { addOneMonth, nextPeriod } from "@/lib/billing-period";

/** Eventos que liberam o acesso ao plano. */
const GRANTING_EVENTS = new Set(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);

/** Eventos que indicam que o dinheiro nao entrou ou voltou. */
const REVOKING_EVENTS = new Set(["PAYMENT_REFUNDED", "PAYMENT_CHARGEBACK_REQUESTED"]);

export type ProcessOutcome =
  | {
      handled: true;
      action: "granted" | "past_due" | "revoked" | "invoice_opened" | "trial_started";
      companyId: string;
    }
  | { handled: false; reason: string };

/**
 * Traduz um evento de cobranca do Asaas em estado de assinatura da empresa.
 *
 * A empresa e encontrada pelo cliente do Asaas, e nao pelo externalReference:
 * o valor informado no checkout nao chega ao pagamento nem a assinatura criada
 * por ele, entao o cliente e o unico vinculo que sobrevive ate aqui.
 *
 * Roda dentro da mesma transacao que registra o evento, para que gravar e
 * aplicar sejam uma coisa so.
 */
export async function applyPaymentEvent(
  tx: Prisma.TransactionClient,
  event: AsaasWebhookEvent,
): Promise<ProcessOutcome> {
  const payment = event.payment;

  if (!payment) {
    return { handled: false, reason: "evento sem objeto de cobranca" };
  }

  const company = await tx.company.findUnique({
    where: { asaasCustomerId: payment.customer },
    select: { id: true, pendingPlanCode: true },
  });

  if (!company) {
    // Cobranca de um cliente que a Zelo nunca criou: nada a liberar.
    return { handled: false, reason: `nenhuma empresa vinculada ao cliente ${payment.customer}` };
  }

  const existing = await tx.companySubscription.findFirst({
    where: { companyId: company.id },
    orderBy: { currentPeriodEnd: "desc" },
    include: { plan: { select: { code: true } } },
  });

  // Numa compra, o plano vem da intencao registrada no checkout. Numa renovacao
  // nao ha intencao pendente, entao vale o plano da assinatura que ja existe.
  const planCode: SubscriptionPlan | null = company.pendingPlanCode ?? existing?.plan.code ?? null;

  if (!planCode) {
    return { handled: false, reason: "nao foi possivel determinar o plano da cobranca" };
  }

  const plan = await tx.planCatalog.findUnique({
    where: { code: planCode },
    select: { id: true },
  });

  if (!plan) {
    return { handled: false, reason: `plano ${planCode} ausente do catalogo` };
  }

  if (GRANTING_EVENTS.has(event.event)) {
    const paidAt = payment.paymentDate ? new Date(payment.paymentDate) : new Date();
    const paidAtValido = Number.isNaN(paidAt.getTime()) ? new Date() : paidAt;

    // Uma mesma cobranca no cartao gera dois eventos: CONFIRMED quando e
    // autorizada e RECEIVED cerca de um mes depois, quando o dinheiro cai.
    // Ambos liberam acesso, entao sem esta verificacao a mesma cobranca
    // estenderia o periodo duas vezes e daria um mes de graca por ciclo.
    const faturaExistente = await tx.invoice.findUnique({
      where: { externalId: payment.id },
      select: { id: true, status: true, periodStart: true, periodEnd: true },
    });
    const cobrancaJaLiberou = faturaExistente?.status === "PAID";

    const { start, end } = cobrancaJaLiberou
      ? { start: faturaExistente.periodStart, end: faturaExistente.periodEnd }
      : nextPeriod(existing?.currentPeriodEnd ?? null, paidAtValido);

    const data = {
      companyId: company.id,
      planId: plan.id,
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

    await tx.company.update({
      where: { id: company.id },
      data: {
        plan: planCode,
        // A intencao foi consumida: numa renovacao futura o plano vem da
        // assinatura, nao daqui.
        pendingPlanCode: null,
      },
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
        description: `Plano ${planCode}`,
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
    const vencimento = new Date(payment.dueDate);
    const venceNoFuturo = !Number.isNaN(vencimento.getTime()) && vencimento.getTime() > Date.now();

    // Primeira cobranca da empresa, datada para frente: e um teste gratuito. O
    // cartao ja foi validado no checkout, nada foi cobrado ainda, e o acesso
    // vale ate a data em que a cobranca vence.
    //
    // Numa renovacao comum tambem chega PAYMENT_CREATED com vencimento futuro,
    // mas ai ja existe assinatura — por isso a condicao exige que nao exista.
    if (!existing && venceNoFuturo) {
      const trial = await tx.companySubscription.create({
        data: {
          companyId: company.id,
          planId: plan.id,
          provider: ASAAS_PROVIDER,
          externalId: payment.subscription ?? null,
          status: "TRIALING",
          currentPeriodStart: new Date(),
          currentPeriodEnd: vencimento,
          trialEndsAt: vencimento,
        },
      });

      await tx.company.update({
        where: { id: company.id },
        data: { plan: planCode, pendingPlanCode: null },
      });

      await tx.invoice.upsert({
        where: { externalId: payment.id },
        create: {
          companyId: company.id,
          subscriptionId: trial.id,
          number: payment.id,
          provider: ASAAS_PROVIDER,
          externalId: payment.id,
          checkoutUrl: payment.invoiceUrl ?? null,
          status: "OPEN",
          amountCents: Math.round(payment.value * 100),
          dueDate: vencimento,
          periodStart: new Date(),
          periodEnd: vencimento,
          description: `Plano ${planCode} - teste gratuito`,
        },
        update: {},
      });

      return { handled: true, action: "trial_started", companyId: company.id };
    }

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
        description: `Plano ${planCode}`,
      },
      update: {},
    });

    return { handled: true, action: "invoice_opened", companyId: company.id };
  }

  return { handled: false, reason: `evento ${event.event} sem efeito sobre a assinatura` };
}
