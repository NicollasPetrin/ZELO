import { brasiliaDay, FUSO_OPERACAO } from "@/lib/due-date";
import { goalUnitLabels } from "@/lib/labels";
import type { GoalUnit, TaskStatus } from "@prisma/client";

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    // Fuso fixo: no servidor (UTC) um prazo das 22h de Brasilia ja seria o dia
    // seguinte, e a tela mostraria a data errada.
    timeZone: FUSO_OPERACAO,
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: FUSO_OPERACAO,
  }).format(new Date(date));
}

export function toDateInputValue(date?: Date | string | null) {
  if (!date) {
    return "";
  }

  return brasiliaDay(new Date(date));
}

export function getGoalProgress(currentValue: number, targetValue: number) {
  if (!targetValue) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round((currentValue / targetValue) * 100)));
}

export function formatGoalValue(value: number, unit: GoalUnit) {
  if (unit === "BRL") {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  }

  if (unit === "PERCENT") {
    return `${value}%`;
  }

  return `${value} ${goalUnitLabels[unit].toLowerCase()}`;
}

export function isTaskLate(status: TaskStatus, dueDate: Date | string) {
  return !["COMPLETED", "CANCELED"].includes(status) && new Date(dueDate) < new Date();
}
