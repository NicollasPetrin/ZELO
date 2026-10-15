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
  EMPLOYEE: "Funcionário",
};

export const priorityLabels: Record<TaskPriority, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  URGENT: "Urgente",
};

export const statusLabels: Record<TaskStatus, string> = {
  PENDING: "Pendente",
  IN_PROGRESS: "Em andamento",
  IN_REVIEW: "Em revisão",
  COMPLETED: "Concluída",
  OVERDUE: "Atrasada",
  CANCELED: "Cancelada",
};

export const recurrenceLabels: Record<RecurrenceType, string> = {
  NONE: "Sem recorrência",
  DAILY: "Diária",
  WEEKLY: "Semanal",
  MONTHLY: "Mensal",
  SPECIFIC_WEEKDAYS: "Dias específicos da semana",
  SPECIFIC_MONTH_DAY: "Dia específico do mês",
};

export const goalUnitLabels: Record<GoalUnit, string> = {
  BRL: "R$",
  PERCENT: "%",
  NUMBER: "Número",
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
  ATTENTION: "Atenção",
  LATE: "Atrasada",
  COMPLETED: "Concluída",
};

export const notificationLabels: Record<NotificationType, string> = {
  SUBSCRIPTION_PAYMENT_DUE: "Pagamento da assinatura",
  TASK_ASSIGNED: "Tarefa atribuída",
  TASK_DUE_SOON: "Prazo próximo",
  TASK_OVERDUE: "Tarefa atrasada",
  NEW_COMMENT: "Comentário novo",
  STATUS_UPDATED: "Status atualizado",
  GOAL_ATTENTION: "Meta em atenção",
};
