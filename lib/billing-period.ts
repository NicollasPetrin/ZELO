/**
 * Calculo do periodo de vigencia de uma assinatura mensal.
 *
 * Fica separado do acesso ao banco para poder ser testado: e a regra que decide
 * ate quando o cliente tem acesso, e errar nela ou entrega mes de graca ou tira
 * dias que a pessoa pagou.
 */

export type BillingPeriod = {
  start: Date;
  end: Date;
};

export function addOneMonth(from: Date) {
  const end = new Date(from);
  end.setMonth(end.getMonth() + 1);

  return end;
}

/**
 * Proximo periodo a partir de um pagamento.
 *
 * Quando a assinatura ainda esta vigente, o novo ciclo comeca onde o anterior
 * termina — e nao na data do pagamento. Isso evita que quem paga adiantado
 * perca os dias restantes, e que quem paga no vencimento acumule sobra.
 *
 * Quando ja venceu, o ciclo comeca no pagamento: os dias parados no atraso nao
 * sao devolvidos nem cobrados.
 */
export function nextPeriod(currentPeriodEnd: Date | null, paidAt: Date): BillingPeriod {
  const aindaVigente = currentPeriodEnd !== null && currentPeriodEnd.getTime() > paidAt.getTime();
  const start = aindaVigente ? currentPeriodEnd : paidAt;

  return { start, end: addOneMonth(start) };
}
