import type { RecurrenceRule } from "@prisma/client";
import { DEFAULT_DUE_TIME, dueDateAt } from "@/lib/due-date";

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
