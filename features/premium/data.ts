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
      include: {
        assignee: true,
        department: true,
      },
      orderBy: [{ dueDate: "asc" }],
    }),
    prisma.goal.findMany({
      where: {
        companyId: user.companyId,
      },
      include: {
        department: true,
        responsible: true,
      },
      orderBy: [{ status: "asc" }, { endDate: "asc" }],
    }),
    prisma.department.findMany({
      where: {
        companyId: user.companyId,
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    }),
    prisma.user.findMany({
      where: {
        companyId: user.companyId,
        isActive: true,
      },
      include: {
        department: true,
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

  const departmentMetrics = sortByRisk(
    departments.map((department) => {
      const departmentTasks = tasks.filter((task) => task.departmentId === department.id);
      const departmentOpenTasks = departmentTasks.filter((task) => isOpenTaskStatus(task.status));
      const departmentCompletedTasks = departmentTasks.filter((task) => task.status === "COMPLETED");
      const departmentOverdueTasks = departmentOpenTasks.filter((task) => isTaskOperationallyLate(task, now));
      const departmentGoalsAtRisk = goalsAtRisk.filter((goal) => goal.departmentId === department.id);

      return {
        id: department.id,
        name: department.name,
        isActive: department.isActive,
        totalTasks: departmentTasks.length,
        openTasks: departmentOpenTasks.length,
        overdueTasks: departmentOverdueTasks.length,
        completedTasks: departmentCompletedTasks.length,
        goalsAtRisk: departmentGoalsAtRisk.length,
        completionRate: percentage(departmentCompletedTasks.length, departmentTasks.length),
      };
    }),
  );

  const employeeMetrics = sortByRisk(
    users.map((teamUser) => {
      const userTasks = tasks.filter((task) => task.assigneeId === teamUser.id);
      const userOpenTasks = userTasks.filter((task) => isOpenTaskStatus(task.status));
      const userCompletedTasks = userTasks.filter((task) => task.status === "COMPLETED");
      const userOverdueTasks = userOpenTasks.filter((task) => isTaskOperationallyLate(task, now));

      return {
        id: teamUser.id,
        name: teamUser.name,
        department: teamUser.department?.name ?? "Sem setor",
        totalTasks: userTasks.length,
        openTasks: userOpenTasks.length,
        overdueTasks: userOverdueTasks.length,
        completedTasks: userCompletedTasks.length,
        completionRate: percentage(userCompletedTasks.length, userTasks.length),
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
