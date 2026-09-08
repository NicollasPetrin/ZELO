import "server-only";
import { listPaymentsByCustomer } from "@/lib/asaas/client";
import { paymentStatusToEvent } from "@/lib/asaas/payment-status";
import { applyPaymentEvent } from "@/features/billing/activate-subscription";
import { prisma } from "@/lib/db/client";

export type SyncResult = {
  /** Cobrancas que o Asaas conhece para este cliente. */
  found: number;
  /** Quantas surtiram efeito sobre a assinatura. */
  applied: number;
  /** Motivos das que nao surtiram, para aparecer no diagnostico. */
  ignored: string[];
};

/**
 * Reconstroi o estado da assinatura perguntando ao Asaas, em vez de esperar o
 * webhook.
 *
 * O webhook e a via normal, mas ele e uma entrega: pode nao sair, pode ser
 * recusada por token errado, e a fila do Asaas se interrompe sozinha depois de
 * varias falhas. Enquanto isso o cliente pagou e nao recebeu o plano, que e o
 * pior defeito possivel num produto por assinatura. Aqui a aplicacao vai buscar
 * a informacao, e o resultado nao depende de nenhuma entrega ter dado certo.
 *
 * Reaproveita applyPaymentEvent de proposito: liberar acesso e uma regra so, e
 * duplicar essa regra numa segunda implementacao seria criar duas verdades.
 * Como aquela funcao ja e idempotente por cobranca, rodar isto varias vezes nao
 * estende periodo nenhum duas vezes.
 */
export async function syncSubscriptionFromAsaas(customerId: string): Promise<SyncResult> {
  const { data: payments } = await listPaymentsByCustomer(customerId);
  const ignored: string[] = [];
  let applied = 0;

  for (const payment of payments) {
    const event = paymentStatusToEvent(payment.status);

    if (!event) {
      ignored.push(`${payment.id}: estado ${payment.status} nao altera assinatura`);
      continue;
    }

    // Uma transacao por cobranca: uma que falhe nao desfaz as anteriores, que
    // ja representam dinheiro real.
    const outcome = await prisma.$transaction((tx) =>
      applyPaymentEvent(tx, { id: `sync:${payment.id}:${event}`, event, payment }),
    );

    if (outcome.handled) {
      applied += 1;
    } else {
      ignored.push(`${payment.id}: ${outcome.reason}`);
    }
  }

  return { found: payments.length, applied, ignored };
}
