import type { TaskStatus } from "@prisma/client";

/**
 * "Atrasada" nao e um estado que alguem escolhe: e a consequencia de um prazo
 * vencido. Guardar OVERDUE como status fixo faz a tarefa continuar atrasada
 * depois que o prazo e adiado, porque nada recalcula o campo.
 *
 * Esta funcao reconcilia o status com a data antes de gravar.
 */
export function reconcileTaskStatus(status: TaskStatus, dueDate: Date, now: Date = new Date()): TaskStatus {
  if (status !== "OVERDUE") {
    return status;
  }

  // Prazo de volta ao futuro: a tarefa volta a ser simplesmente pendente.
  if (dueDate.getTime() > now.getTime()) {
    return "PENDING";
  }

  return status;
}

/** Se a tarefa deve aparecer como atrasada, olhando status e prazo juntos. */
export function isTaskLate(
  task: { status: TaskStatus; dueDate: Date },
  now: Date = new Date(),
): boolean {
  if (task.status === "COMPLETED" || task.status === "CANCELED") {
    return false;
  }

  return task.status === "OVERDUE" || task.dueDate.getTime() < now.getTime();
}
