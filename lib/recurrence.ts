import type { RecurrenceRule } from "@prisma/client";
import { DEFAULT_DUE_TIME, brasiliaDay, brasiliaTime, dueDateAt } from "@/lib/due-date";

/**
 * O calculo abaixo anda de dia em dia no relogio do servidor; no fim, o dia
 * encontrado recebe o horario padrao de Brasilia, o mesmo das tarefas criadas
 * pelo formulario.
 */
function noHorarioPadrao(date: Date) {
  const dia = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  return dueDateAt(dia, DEFAULT_DUE_TIME) ?? date;
}

export function getNextRecurrenceDate(rule: Pick<RecurrenceRule, "type" | "weekDays" | "monthDay" | "startDate" | "endDate">, from = new Date()) {
  const next = calcularProxima(rule, from);

  return next ? noHorarioPadrao(next) : null;
}

function calcularProxima(rule: Pick<RecurrenceRule, "type" | "weekDays" | "monthDay" | "startDate" | "endDate">, from: Date) {
  if (rule.type === "NONE") {
    return null;
  }

  const next = new Date(Math.max(from.getTime(), rule.startDate.getTime()));
  next.setHours(17, 0, 0, 0);

  if (rule.type === "DAILY") {
    next.setDate(next.getDate() + 1);
  }

  if (rule.type === "WEEKLY") {
    next.setDate(next.getDate() + 7);
  }

  if (rule.type === "MONTHLY") {
    next.setMonth(next.getMonth() + 1);
  }

  if (rule.type === "SPECIFIC_WEEKDAYS") {
    const days = (rule.weekDays ?? "")
      .split(",")
      .map((day) => Number(day.trim()))
      .filter((day) => day >= 0 && day <= 6);

    for (let offset = 1; offset <= 14; offset += 1) {
      const candidate = new Date(next);
      candidate.setDate(candidate.getDate() + offset);

      if (days.includes(candidate.getDay())) {
        return rule.endDate && candidate > rule.endDate ? null : candidate;
      }
    }
  }

  if (rule.type === "SPECIFIC_MONTH_DAY" && rule.monthDay) {
    next.setMonth(next.getMonth() + 1);
    next.setDate(Math.min(rule.monthDay, 28));
  }

  if (rule.endDate && next > rule.endDate) {
    return null;
  }

  return next;
}

type RegraOcorrencia = Pick<RecurrenceRule, "type" | "weekDays" | "monthDay" | "startDate" | "endDate">;

/** Soma dias a um dia AAAA-MM-DD, sem passar pelo relogio do servidor. */
function somarDias(dia: string, dias: number) {
  const [ano, mes, d] = dia.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, d + dias)).toISOString().slice(0, 10);
}

function diaDaSemana(dia: string) {
  const [ano, mes, d] = dia.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, d)).getUTCDay();
}

/** Dia `diaDoMes` do mes seguinte a `dia`, preso ao ultimo dia quando o mes e curto (31 vira 28, 29 ou 30). */
function noMesSeguinte(dia: string, diaDoMes: number) {
  const [ano, mes] = dia.split("-").map(Number);
  const ultimo = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  const alvo = new Date(Date.UTC(ano, mes, Math.min(diaDoMes, ultimo)));
  return alvo.toISOString().slice(0, 10);
}

function proximoDia(regra: RegraOcorrencia, dia: string, ancora: number): string | null {
  switch (regra.type) {
    case "DAILY":
      return somarDias(dia, 1);
    case "WEEKLY":
      return somarDias(dia, 7);
    case "MONTHLY":
      return noMesSeguinte(dia, ancora);
    case "SPECIFIC_WEEKDAYS": {
      const dias = (regra.weekDays ?? "")
        .split(",")
        .map((valor) => Number(valor.trim()))
        .filter((valor) => Number.isInteger(valor) && valor >= 0 && valor <= 6);

      for (let passo = 1; dias.length && passo <= 7; passo += 1) {
        const candidato = somarDias(dia, passo);
        if (dias.includes(diaDaSemana(candidato))) return candidato;
      }

      return null;
    }
    case "SPECIFIC_MONTH_DAY": {
      if (!regra.monthDay || regra.monthDay < 1) return null;
      const [ano, mes, d] = dia.split("-").map(Number);
      const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
      const nesteMes = Math.min(regra.monthDay, ultimo);
      // Ainda da tempo neste mes: o dia combinado vem depois do prazo atual.
      return nesteMes > d ? `${dia.slice(0, 8)}${String(nesteMes).padStart(2, "0")}` : noMesSeguinte(dia, regra.monthDay);
    }
    default:
      return null;
  }
}

/**
 * Prazo da proxima ocorrencia de uma rotina, contado a partir do prazo da
 * ocorrencia que acabou de ser concluida.
 *
 * - Anda no calendario de Brasilia, nao no relogio do servidor (UTC). Pelo
 *   relogio do servidor, um prazo as 21h15 ja e o dia seguinte, e a rotina
 *   pularia um dia.
 * - Mantem o horario da ocorrencia: abrir o caixa as 7h volta as 7h.
 * - Rotina mensal guarda o dia do mes de inicio: a do dia 31 cai em 30/11 e
 *   volta para 31/12, em vez de escorregar para 30 para sempre.
 * - Nao devolve dia que ja passou: a rotina diaria concluida com tres dias de
 *   atraso volta hoje, e nao como mais tres pendencias atrasadas.
 * - Respeita a data final da regra: depois dela, nao ha proxima.
 */
export function nextOccurrenceAfter(regra: RegraOcorrencia, prazoAtual: Date, agora: Date = new Date()): Date | null {
  if (regra.type === "NONE") {
    return null;
  }

  const hora = brasiliaTime(prazoAtual);
  const hoje = brasiliaDay(agora);
  const ancora = Number(brasiliaDay(regra.startDate).slice(8, 10));
  const fim = regra.endDate ? brasiliaDay(regra.endDate) : null;

  let dia: string | null = brasiliaDay(prazoAtual);

  // Limite de voltas so por seguranca: um ano de rotina diaria atrasada.
  for (let volta = 0; volta < 400; volta += 1) {
    dia = dia ? proximoDia(regra, dia, ancora) : null;

    if (!dia || (fim && dia > fim)) {
      return null;
    }

    if (dia >= hoje) {
      return dueDateAt(dia, hora);
    }
  }

  return null;
}
