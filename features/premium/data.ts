import "server-only";
import type { GoalStatus, TaskPriority, TaskStatus } from "@prisma/client";
import type { CurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { getGoalProgress } from "@/lib/format";

const closedTaskStatuses: TaskStatus[] = ["COMPLETED", "CANCELED"];
const priorityOrder: TaskPriority[] = ["URGENT", "HIGH", "MEDIUM", "LOW"];
const statusOrder: TaskStatus[] = ["OVERDUE", "PENDING", "IN_PROGRESS", "IN_REVIEW", "COMPLETED", "CANCELED"];
const riskyGoalStatuses: GoalStatus[] = ["ATTENTION", "LATE"];

function percentage(value: number, total: number) {
  if (!total) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

function isOpenTaskStatus(status: TaskStatus) {
  return !closedTaskStatuses.includes(status);
}

function isTaskOperationallyLate(task: { status: TaskStatus; dueDate: Date }, now: Date) {
  return isOpenTaskStatus(task.status) && (task.status === "OVERDUE" || task.dueDate < now);
}

function sortByRisk<T extends { overdueTasks: number; goalsAtRisk?: number; openTasks?: number; totalTasks: number }>(rows: T[]) {
  return rows.sort((a, b) => {
    const riskA = a.overdueTasks * 3 + (a.goalsAtRisk ?? 0) * 2 + (a.openTasks ?? 0);
    const riskB = b.overdueTasks * 3 + (b.goalsAtRisk ?? 0) * 2 + (b.openTasks ?? 0);

    return riskB - riskA || b.totalTasks - a.totalTasks;
  });
}

export async function getPremiumWorkspaceData(user: CurrentUser) {
  const now = new Date();
  const nextFourteenDays = new Date(now);
  nextFourteenDays.setDate(nextFourteenDays.getDate() + 14);

  const [tasks, goals, departments, users] = await Promise.all([
    prisma.task.findMany({
      where: {
        companyId: user.companyId,
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        priority: true,
        status: true,
        assigneeId: true,
        departmentId: true,
        assignee: { select: { name: true } },
        department: { select: { name: true } },
      },
      orderBy: [{ dueDate: "asc" }],
    }),
    prisma.goal.findMany({
      where: {
        companyId: user.companyId,
      },
      select: {
        id: true,
        title: true,
        targetValue: true,
        currentValue: true,
        unit: true,
        status: true,
        departmentId: true,
        department: { select: { name: true } },
        responsible: { select: { name: true } },
      },
      orderBy: [{ status: "asc" }, { endDate: "asc" }],
    }),
    prisma.department.findMany({
      where: {
        companyId: user.companyId,
      },
      select: { id: true, name: true, isActive: true },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    }),
    prisma.user.findMany({
      where: {
        companyId: user.companyId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        department: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const openTasks = tasks.filter((task) => isOpenTaskStatus(task.status));
  const completedTasks = tasks.filter((task) => task.status === "COMPLETED");
  const overdueTasks = openTasks.filter((task) => isTaskOperationallyLate(task, now));
  const urgentTasks = openTasks.filter((task) => task.priority === "URGENT");
  const dueSoonTasks = openTasks.filter((task) => task.dueDate >= now && task.dueDate <= nextFourteenDays);
  const goalsAtRisk = goals.filter((goal) => riskyGoalStatuses.includes(goal.status));
  const averageGoalProgress = goals.length
    ? Math.round(goals.reduce((sum, goal) => sum + getGoalProgress(goal.currentValue, goal.targetValue), 0) / goals.length)
    : 0;
  const completionRate = percentage(completedTasks.length, tasks.length);
  const overdueRate = percentage(overdueTasks.length, openTasks.length);
  const goalRiskRate = percentage(goalsAtRisk.length, goals.length);
  const healthScore = Math.max(
    0,
    Math.min(100, 100 - Math.round(overdueRate * 0.45) - Math.round(goalRiskRate * 0.35) - (urgentTasks.length > 0 ? 8 : 0)),
  );

  const departmentTaskMetrics = new Map<string, { totalTasks: number; openTasks: number; overdueTasks: number; completedTasks: number }>();
  const employeeTaskMetrics = new Map<string, { totalTasks: number; openTasks: number; overdueTasks: number; completedTasks: number }>();

  for (const task of tasks) {
    const isOpen = isOpenTaskStatus(task.status);
    const isCompleted = task.status === "COMPLETED";
    const isOverdue = isTaskOperationallyLate(task, now);
    const departmentMetric = departmentTaskMetrics.get(task.departmentId) ?? { totalTasks: 0, openTasks: 0, overdueTasks: 0, completedTasks: 0 };
    const employeeMetric = employeeTaskMetrics.get(task.assigneeId) ?? { totalTasks: 0, openTasks: 0, overdueTasks: 0, completedTasks: 0 };

    departmentMetric.totalTasks += 1;
    departmentMetric.openTasks += isOpen ? 1 : 0;
    departmentMetric.overdueTasks += isOverdue ? 1 : 0;
    departmentMetric.completedTasks += isCompleted ? 1 : 0;
    employeeMetric.totalTasks += 1;
    employeeMetric.openTasks += isOpen ? 1 : 0;
    employeeMetric.overdueTasks += isOverdue ? 1 : 0;
    employeeMetric.completedTasks += isCompleted ? 1 : 0;
    departmentTaskMetrics.set(task.departmentId, departmentMetric);
    employeeTaskMetrics.set(task.assigneeId, employeeMetric);
  }

  const goalsAtRiskByDepartment = new Map<string, number>();
  for (const goal of goalsAtRisk) {
    if (goal.departmentId) {
      goalsAtRiskByDepartment.set(goal.departmentId, (goalsAtRiskByDepartment.get(goal.departmentId) ?? 0) + 1);
    }
  }

  const departmentMetrics = sortByRisk(
    departments.map((department) => {
      const metrics = departmentTaskMetrics.get(department.id) ?? { totalTasks: 0, openTasks: 0, overdueTasks: 0, completedTasks: 0 };

      return {
        id: department.id,
        name: department.name,
        isActive: department.isActive,
        ...metrics,
        goalsAtRisk: goalsAtRiskByDepartment.get(department.id) ?? 0,
        completionRate: percentage(metrics.completedTasks, metrics.totalTasks),
      };
    }),
  );

  const employeeMetrics = sortByRisk(
    users.map((teamUser) => {
      const metrics = employeeTaskMetrics.get(teamUser.id) ?? { totalTasks: 0, openTasks: 0, overdueTasks: 0, completedTasks: 0 };

      return {
        id: teamUser.id,
        name: teamUser.name,
        department: teamUser.department?.name ?? "Sem setor",
        ...metrics,
        completionRate: percentage(metrics.completedTasks, metrics.totalTasks),
      };
    }),
  );

  const priorityDistribution = priorityOrder.map((priority) => {
    const count = tasks.filter((task) => task.priority === priority).length;

    return {
      priority,
      count,
      percent: percentage(count, tasks.length),
    };
  });

  const statusDistribution = statusOrder.map((status) => {
    const count = tasks.filter((task) => task.status === status).length;

    return {
      status,
      count,
      percent: percentage(count, tasks.length),
    };
  });

  const topDepartment = departmentMetrics[0];
  const topEmployee = employeeMetrics[0];
  const recommendations = [
    overdueTasks.length > 0
      ? `Atacar ${overdueTasks.length} tarefa${overdueTasks.length === 1 ? "" : "s"} atrasada${overdueTasks.length === 1 ? "" : "s"} antes de abrir novas prioridades.`
      : null,
    topDepartment?.overdueTasks
      ? `${topDepartment.name} deve entrar primeiro na revisao: ${topDepartment.overdueTasks} atraso${topDepartment.overdueTasks === 1 ? "" : "s"} ativo${topDepartment.overdueTasks === 1 ? "" : "s"}.`
      : null,
    topEmployee?.openTasks
      ? `Revisar carga de ${topEmployee.name}: ${topEmployee.openTasks} tarefa${topEmployee.openTasks === 1 ? "" : "s"} em aberto.`
      : null,
    goalsAtRisk.length > 0
      ? `Atualizar plano de acao para ${goalsAtRisk.length} meta${goalsAtRisk.length === 1 ? "" : "s"} em atencao ou atraso.`
      : null,
    dueSoonTasks.length > 0
      ? `Confirmar responsaveis de ${dueSoonTasks.length} prazo${dueSoonTasks.length === 1 ? "" : "s"} dos proximos 14 dias.`
      : null,
  ].filter(Boolean) as string[];

  if (!recommendations.length) {
    recommendations.push("Operacao sem alertas criticos. Use os relatorios completos para manter o padrao que funcionou bem.");
  }

  const criticalTasks = Array.from(new Map(overdueTasks.concat(urgentTasks).map((task) => [task.id, task])).values());

  return {
    companyName: user.company.name,
    generatedAt: now,
    monthLabel: new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(now),
    totals: {
      activeUsers: users.length,
      activeDepartments: departments.filter((department) => department.isActive).length,
      totalTasks: tasks.length,
      openTasks: openTasks.length,
      completedTasks: completedTasks.length,
      overdueTasks: overdueTasks.length,
      urgentTasks: urgentTasks.length,
      dueSoonTasks: dueSoonTasks.length,
      totalGoals: goals.length,
      goalsAtRisk: goalsAtRisk.length,
      completionRate,
      overdueRate,
      averageGoalProgress,
      healthScore,
    },
    priorityDistribution,
    statusDistribution,
    departmentMetrics,
    employeeMetrics,
    criticalTasks: criticalTasks.slice(0, 6),
    dueSoonTasks: dueSoonTasks.slice(0, 6),
    goalsAtRisk: goalsAtRisk.slice(0, 6),
    recommendations,
  };
}
