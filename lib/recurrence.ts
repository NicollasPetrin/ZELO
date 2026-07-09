import type { RecurrenceRule } from "@prisma/client";

export function getNextRecurrenceDate(rule: Pick<RecurrenceRule, "type" | "weekDays" | "monthDay" | "startDate" | "endDate">, from = new Date()) {
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
