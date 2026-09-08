import type { HandledPaymentEvent } from "@/lib/asaas/types";

/**
 * Traduz o estado atual de uma cobranca no evento equivalente.
 *
 * Serve para reconciliar sem webhook: o estado que a cobranca tem agora vale
 * tanto quanto o aviso que deveria ter chegado quando ela mudou. Assim o mesmo
 * codigo que trata o webhook trata tambem a conferencia sob demanda.
 */
export function paymentStatusToEvent(status: string): HandledPaymentEvent | null {
  switch (status) {
    // Dinheiro autorizado ou ja recebido: os dois liberam o plano.
    case "CONFIRMED":
    case "RECEIVED":
    case "RECEIVED_IN_CASH":
      return "PAYMENT_CONFIRMED";

    // Cobranca existe e ainda vai vencer. E este o estado da primeira cobranca
    // de quem entrou pelo mes gratuito: o cartao foi validado, nada foi cobrado
    // e o acesso vale ate o vencimento.
    case "PENDING":
    case "AWAITING_RISK_ANALYSIS":
      return "PAYMENT_CREATED";

    case "OVERDUE":
      return "PAYMENT_OVERDUE";

    // Somente estorno concluido revoga. REFUND_REQUESTED e pedido em analise, e
    // cortar o acesso antes do dinheiro voltar puniria o cliente por um pedido
    // que ainda pode ser negado.
    case "REFUNDED":
      return "PAYMENT_REFUNDED";

    case "CHARGEBACK_REQUESTED":
      return "PAYMENT_CHARGEBACK_REQUESTED";

    default:
      return null;
  }
}
