import type {
  GoalPeriod,
  GoalStatus,
  GoalUnit,
  NotificationType,
  RecurrenceType,
  TaskPriority,
  TaskStatus,
  UserRole,
} from "@prisma/client";

export const roleLabels: Record<UserRole, string> = {
  OWNER: "Dono",
  MANAGER: "Gerente",
  EMPLOYEE: "Funcionario",
};

export const priorityLabels: Record<TaskPriority, string> = {
  LOW: "Baixa",
  MEDIUM: "Media",
  HIGH: "Alta",
  URGENT: "Urgente",
};

export const statusLabels: Record<TaskStatus, string> = {
  PENDING: "Pendente",
  IN_PROGRESS: "Em andamento",
  IN_REVIEW: "Em revisao",
  COMPLETED: "Concluida",
  OVERDUE: "Atrasada",
  CANCELED: "Cancelada",
};

export const recurrenceLabels: Record<RecurrenceType, string> = {
  NONE: "Sem recorrencia",
  DAILY: "Diaria",
  WEEKLY: "Semanal",
  MONTHLY: "Mensal",
  SPECIFIC_WEEKDAYS: "Dias especificos da semana",
  SPECIFIC_MONTH_DAY: "Dia especifico do mes",
};

export const goalUnitLabels: Record<GoalUnit, string> = {
  BRL: "R$",
  PERCENT: "%",
  NUMBER: "Numero",
  TASKS: "Tarefas",
  CLIENTS: "Clientes",
  SALES: "Vendas",
};

export const goalPeriodLabels: Record<GoalPeriod, string> = {
  WEEKLY: "Semanal",
  MONTHLY: "Mensal",
  QUARTERLY: "Trimestral",
  CUSTOM: "Personalizado",
};

export const goalStatusLabels: Record<GoalStatus, string> = {
  ON_TRACK: "No caminho",
  ATTENTION: "Atencao",
  LATE: "Atrasada",
  COMPLETED: "Concluida",
};

export const notificationLabels: Record<NotificationType, string> = {
  TASK_ASSIGNED: "Tarefa atribuida",
  TASK_DUE_SOON: "Prazo proximo",
  TASK_OVERDUE: "Tarefa atrasada",
  NEW_COMMENT: "Comentario novo",
  STATUS_UPDATED: "Status atualizado",
  GOAL_ATTENTION: "Meta em atencao",
};
