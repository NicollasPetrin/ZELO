import "server-only";
import type { Prisma, TaskStatus } from "@prisma/client";
import type { CurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { canViewTeamArea } from "@/lib/permissions";

export async function getDashboardData(user: CurrentUser) {
  const teamScope = canViewTeamArea(user.role);
  const closedStatuses: TaskStatus[] = ["COMPLETED", "CANCELED"];
  const taskWhere: Prisma.TaskWhereInput = {
    companyId: user.companyId,
    ...(teamScope ? {} : { assigneeId: user.id }),
  };
  const activeTaskWhere: Prisma.TaskWhereInput = {
    ...taskWhere,
    status: {
      notIn: closedStatuses,
    },
  };
  const now = new Date();
  const sevenDays = new Date();
  sevenDays.setDate(sevenDays.getDate() + 7);
  const overdueWhere: Prisma.TaskWhereInput = {
    ...activeTaskWhere,
    OR: [{ status: "OVERDUE" }, { dueDate: { lt: now } }],
  };

  const [
    taskStatusGroups,
    urgent,
    overdue,
    goalStatusGroups,
    upcomingTasks,
    overdueByEmployeeGroups,
    overdueByDepartmentGroups,
  ] = await Promise.all([
    prisma.task.groupBy({
      by: ["status"],
      where: taskWhere,
      _count: { _all: true },
    }),
    prisma.task.count({ where: { ...activeTaskWhere, priority: "URGENT" } }),
    prisma.task.count({ where: overdueWhere }),
    prisma.goal.groupBy({
      by: ["status"],
      where: { companyId: user.companyId },
      _count: { _all: true },
    }),
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
    prisma.task.groupBy({
      by: ["assigneeId"],
      where: overdueWhere,
      _count: { _all: true },
      orderBy: { _count: { assigneeId: "desc" } },
      take: 3,
    }),
    prisma.task.groupBy({
      by: ["departmentId"],
      where: overdueWhere,
      _count: { _all: true },
      orderBy: { _count: { departmentId: "desc" } },
      take: 3,
    }),
  ]);

  const [hotspotUsers, hotspotDepartments] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: overdueByEmployeeGroups.map((item) => item.assigneeId) }, companyId: user.companyId },
      select: { id: true, name: true },
    }),
    prisma.department.findMany({
      where: { id: { in: overdueByDepartmentGroups.map((item) => item.departmentId) }, companyId: user.companyId },
      select: { id: true, name: true },
    }),
  ]);
  const taskStatusCounts = new Map(taskStatusGroups.map((item) => [item.status, item._count._all]));
  const goalStatusCounts = new Map(goalStatusGroups.map((item) => [item.status, item._count._all]));
  const userNames = new Map(hotspotUsers.map((item) => [item.id, item.name]));
  const departmentNames = new Map(hotspotDepartments.map((item) => [item.id, item.name]));
  const pending = taskStatusCounts.get("PENDING") ?? 0;
  const inProgress = taskStatusCounts.get("IN_PROGRESS") ?? 0;
  const completed = taskStatusCounts.get("COMPLETED") ?? 0;
  const goalsOnTrack = goalStatusCounts.get("ON_TRACK") ?? 0;
  const goalsAttention = (goalStatusCounts.get("ATTENTION") ?? 0) + (goalStatusCounts.get("LATE") ?? 0);

  const employeeHotspots = overdueByEmployeeGroups.map((item) => [userNames.get(item.assigneeId) ?? "Funcionario removido", item._count._all] as [string, number]);
  const departmentHotspots = overdueByDepartmentGroups.map((item) => [departmentNames.get(item.departmentId) ?? "Setor removido", item._count._all] as [string, number]);
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
