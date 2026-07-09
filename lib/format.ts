import { goalUnitLabels } from "@/lib/labels";
import type { GoalUnit, TaskStatus } from "@prisma/client";

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function toDateInputValue(date?: Date | string | null) {
  if (!date) {
    return "";
  }

  return new Date(date).toISOString().slice(0, 10);
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
