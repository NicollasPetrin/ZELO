/**
 * Prazo de tarefa: um dia e um horario de Brasilia.
 *
 * O servidor roda em UTC. Montar o prazo com o relogio do servidor fazia "17h"
 * virar 17h UTC, que para quem le no Brasil e 14h, e "amanha as 9h" dito por
 * voz viraria 6h da manha. Aqui o horario e sempre o de Brasilia, que e o
 * horario de quem cria, de quem executa e da agenda.
 *
 * O deslocamento e fixo em -03:00 porque o Brasil nao tem horario de verao
 * desde 2019; se voltar a ter, e so aqui que muda.
 */
export const FUSO_OPERACAO = "America/Sao_Paulo";

const DESLOCAMENTO = "-03:00";

/** Horario do prazo quando ninguem diz qual: fim do expediente. */
export const DEFAULT_DUE_TIME = "17:00";

const DIA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Instante do prazo para o dia (AAAA-MM-DD) e a hora (HH:MM) de Brasilia. Null se algum dos dois nao fizer sentido. */
export function dueDateAt(day: string, time: string = DEFAULT_DUE_TIME): Date | null {
  if (!DIA.test(day) || !HORA.test(time)) {
    return null;
  }

  const date = new Date(`${day}T${time}:00${DESLOCAMENTO}`);

  // "2026-02-31" passa na expressao e o Date rola para marco; conferir de volta
  // pega o dia que nao existe.
  if (Number.isNaN(date.getTime()) || brasiliaDay(date) !== day) {
    return null;
  }

  return date;
}

function partes(date: Date) {
  const lidas = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_OPERACAO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const pegar = (tipo: string) => lidas.find((p) => p.type === tipo)?.value ?? "00";
  // O Intl devolve 24 para a meia-noite em algumas plataformas.
  const hora = pegar("hour") === "24" ? "00" : pegar("hour");

  return { dia: `${pegar("year")}-${pegar("month")}-${pegar("day")}`, hora: `${hora}:${pegar("minute")}` };
}

/** Dia (AAAA-MM-DD) do instante, no calendario de Brasilia. */
export function brasiliaDay(date: Date) {
  return partes(date).dia;
}

/** Hora (HH:MM) do instante, no relogio de Brasilia. */
export function brasiliaTime(date: Date) {
  return partes(date).hora;
}
