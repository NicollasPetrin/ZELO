import "server-only";
import type { TaskStatus } from "@prisma/client";
import type { CurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { canViewTeamArea } from "@/lib/permissions";

export async function getDashboardData(user: CurrentUser) {
  const teamScope = canViewTeamArea(user.role);
  const closedStatuses: TaskStatus[] = ["COMPLETED", "CANCELED"];
  const taskWhere = {
    companyId: user.companyId,
    ...(teamScope ? {} : { assigneeId: user.id }),
  };
  const activeTaskWhere = {
    ...taskWhere,
    status: {
      notIn: closedStatuses,
    },
  };
  const now = new Date();
  const sevenDays = new Date();
  sevenDays.setDate(sevenDays.getDate() + 7);

  const [
    pending,
    inProgress,
    completed,
    urgent,
    overdue,
    goalsOnTrack,
    goalsAttention,
    upcomingTasks,
    overdueTasks,
  ] = await Promise.all([
    prisma.task.count({ where: { ...taskWhere, status: "PENDING" } }),
    prisma.task.count({ where: { ...taskWhere, status: "IN_PROGRESS" } }),
    prisma.task.count({ where: { ...taskWhere, status: "COMPLETED" } }),
    prisma.task.count({ where: { ...activeTaskWhere, priority: "URGENT" } }),
    prisma.task.count({
      where: {
        ...activeTaskWhere,
        OR: [{ status: "OVERDUE" }, { dueDate: { lt: now } }],
      },
    }),
    prisma.goal.count({ where: { companyId: user.companyId, status: "ON_TRACK" } }),
    prisma.goal.count({ where: { companyId: user.companyId, status: { in: ["ATTENTION", "LATE"] } } }),
    prisma.task.findMany({
      where: {
        ...activeTaskWhere,
        dueDate: {
          gte: now,
          lte: sevenDays,
        },
      },
      include: {
        assignee: true,
        department: true,
      },
      orderBy: {
        dueDate: "asc",
      },
      take: 6,
    }),
    prisma.task.findMany({
      where: {
        ...activeTaskWhere,
        OR: [{ status: "OVERDUE" }, { dueDate: { lt: now } }],
      },
      include: {
        assignee: true,
        department: true,
      },
      orderBy: {
        dueDate: "asc",
      },
    }),
  ]);

  const overdueByEmployee = new Map<string, number>();
  const overdueByDepartment = new Map<string, number>();
  overdueTasks.forEach((task) => {
    overdueByEmployee.set(task.assignee.name, (overdueByEmployee.get(task.assignee.name) ?? 0) + 1);
    overdueByDepartment.set(task.department.name, (overdueByDepartment.get(task.department.name) ?? 0) + 1);
  });

  const employeeHotspots = Array.from(overdueByEmployee.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const departmentHotspots = Array.from(overdueByDepartment.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const attentionItems = [
    overdue > 0 ? `${overdue} tarefa${overdue === 1 ? "" : "s"} atrasada${overdue === 1 ? "" : "s"}` : null,
    urgent > 0 ? `${urgent} tarefa${urgent === 1 ? "" : "s"} urgente${urgent === 1 ? "" : "s"} em aberto` : null,
    goalsAttention > 0 ? `${goalsAttention} meta${goalsAttention === 1 ? "" : "s"} precisam de atencao` : null,
    departmentHotspots[0] ? `${departmentHotspots[0][0]} tem ${departmentHotspots[0][1]} atraso${departmentHotspots[0][1] === 1 ? "" : "s"}` : null,
  ].filter(Boolean) as string[];

  return {
    teamScope,
    stats: {
      pending,
      inProgress,
      completed,
      urgent,
      overdue,
      goalsOnTrack,
      goalsAttention,
    },
    upcomingTasks,
    employeeHotspots,
    departmentHotspots,
    attentionItems,
  };
}
