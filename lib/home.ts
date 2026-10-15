import type { TaskPriority, TaskStatus } from "@prisma/client";
import { brasiliaDay, FUSO_OPERACAO } from "@/lib/due-date";
import { isTaskLate } from "@/lib/task-status";

export type HomeTask = { id: string; dueDate: Date; priority: TaskPriority; status: TaskStatus };

export type HomeBuckets<T> = { late: T[]; today: T[]; week: T[]; later: T[] };

const PESO: Record<TaskPriority, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

function diasEntre(de: string, ate: string) {
  return Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86_400_000);
}

/**
 * Separa as tarefas abertas da pessoa pelo que pede atencao primeiro: as
 * atrasadas, as de hoje, as dos proximos 7 dias e o resto. O dia e o do
 * calendario de Brasilia, e "atrasada" e a mesma regra do resto do sistema.
 */
export function bucketTasks<T extends HomeTask>(tasks: T[], now: Date = new Date()): HomeBuckets<T> {
  const hoje = brasiliaDay(now);
  const grupos: HomeBuckets<T> = { late: [], today: [], week: [], later: [] };

  for (const tarefa of tasks) {
    if (tarefa.status === "COMPLETED" || tarefa.status === "CANCELED") {
      continue;
    }
    if (isTaskLate(tarefa, now)) {
      grupos.late.push(tarefa);
      continue;
    }
    const dias = diasEntre(hoje, brasiliaDay(tarefa.dueDate));
    if (dias <= 0) {
      grupos.today.push(tarefa);
    } else if (dias <= 7) {
      grupos.week.push(tarefa);
    } else {
      grupos.later.push(tarefa);
    }
  }

  const porPrazo = (a: T, b: T) => a.dueDate.getTime() - b.dueDate.getTime() || PESO[a.priority] - PESO[b.priority];
  grupos.late.sort(porPrazo);
  grupos.today.sort(porPrazo);
  grupos.week.sort(porPrazo);
  grupos.later.sort(porPrazo);

  return grupos;
}

/**
 * A tarefa que vale fazer primeiro: a atrasada mais antiga; sem atraso, a de
 * maior prioridade, e no empate a que vence antes.
 */
export function focusTask<T extends HomeTask>(tasks: T[], now: Date = new Date()): T | null {
  const { late, today, week, later } = bucketTasks(tasks, now);
  if (late.length > 0) {
    return late[0];
  }
  const abertas = [...today, ...week, ...later];
  abertas.sort((a, b) => PESO[a.priority] - PESO[b.priority] || a.dueDate.getTime() - b.dueDate.getTime());
  return abertas[0] ?? null;
}

/** Por que essa e a tarefa do foco, em uma frase curta. */
export function focusReason(task: HomeTask, now: Date = new Date()) {
  const dias = diasEntre(brasiliaDay(now), brasiliaDay(task.dueDate));
  const hora = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: FUSO_OPERACAO }).format(task.dueDate);

  if (isTaskLate(task, now)) {
    if (dias >= 0) {
      return `Venceu hoje às ${hora}`;
    }
    return dias === -1 ? "Venceu ontem" : `Venceu há ${-dias} dias`;
  }
  if (dias <= 0) {
    return `Vence hoje às ${hora}`;
  }
  if (dias === 1) {
    return `Vence amanhã às ${hora}`;
  }
  return `Vence em ${dias} dias`;
}

/** Bom dia, boa tarde ou boa noite, pelo relogio de Brasilia. */
export function greeting(now: Date = new Date()) {
  const hora = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: FUSO_OPERACAO }).format(now),
  ) % 24;
  if (hora >= 5 && hora < 12) {
    return "Bom dia";
  }
  if (hora >= 12 && hora < 18) {
    return "Boa tarde";
  }
  return "Boa noite";
}
