import "server-only";
import { notFound } from "next/navigation";
import type { Prisma, TaskPriority, TaskStatus } from "@prisma/client";
import type { CurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import type { BoardTask } from "@/features/tasks/task-board";
import { canManageTasks } from "@/lib/permissions";
import { isTaskLate } from "@/lib/task-status";
import { DEFAULT_PAGE_SIZE, pageOffset, paginatedResult } from "@/lib/pagination";
import { taskPriorities, taskStatuses } from "@/lib/validations";

export type TaskFilters = {
  q?: string;
  status?: string;
  priority?: string;
  departmentId?: string;
  assigneeId?: string;
};

export function normalizeTaskFilters(filters: TaskFilters) {
  const selectedStatus = taskStatuses.includes(filters.status as TaskStatus) ? (filters.status as TaskStatus) : undefined;
  const selectedPriority = taskPriorities.includes(filters.priority as TaskPriority) ? (filters.priority as TaskPriority) : undefined;

  return {
    q: filters.q?.trim() || undefined,
    status: selectedStatus,
    priority: selectedPriority,
    departmentId: filters.departmentId || undefined,
    assigneeId: filters.assigneeId || undefined,
  };
}

function buildTaskSearchWhere(filters: ReturnType<typeof normalizeTaskFilters>): Prisma.TaskWhereInput {
  return {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.priority ? { priority: filters.priority } : {}),
    ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
    ...(filters.assigneeId ? { assigneeId: filters.assigneeId } : {}),
    ...(filters.q
      ? {
          OR: [
            { title: { contains: filters.q } },
            { description: { contains: filters.q } },
          ],
        }
      : {}),
  };
}

export async function listMyTasks(user: CurrentUser, filters: TaskFilters, page = 1) {
  const normalized = normalizeTaskFilters(filters);
  const where: Prisma.TaskWhereInput = {
    companyId: user.companyId,
    assigneeId: user.id,
    ...buildTaskSearchWhere(normalized),
  };

  const [totalItems, items] = await prisma.$transaction([
    prisma.task.count({ where }),
    prisma.task.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        dueDate: true,
        priority: true,
        status: true,
        department: { select: { id: true, name: true } },
      },
      orderBy: [{ dueDate: "asc" }, { id: "asc" }],
      skip: pageOffset(page),
      take: DEFAULT_PAGE_SIZE,
    }),
  ]);

  return paginatedResult(items, totalItems, page);
}

export async function listTeamTasks(user: CurrentUser, filters: TaskFilters, page = 1) {
  const normalized = normalizeTaskFilters(filters);
  const where: Prisma.TaskWhereInput = {
    companyId: user.companyId,
    ...buildTaskSearchWhere(normalized),
  };

  const [totalItems, items] = await prisma.$transaction([
    prisma.task.count({ where }),
    prisma.task.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        dueDate: true,
        priority: true,
        status: true,
        assignee: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: [{ dueDate: "asc" }, { id: "asc" }],
      skip: pageOffset(page),
      take: DEFAULT_PAGE_SIZE,
    }),
  ]);

  return paginatedResult(items, totalItems, page);
}

/** Quantos dias as concluidas continuam no quadro. Depois saem, para a coluna nao crescer sem fim. */
export const BOARD_COMPLETED_DAYS = 14;

/** Teto de cards no quadro: e uma tela de trabalho, nao de arquivo. A lista continua com tudo. */
const BOARD_LIMIT = 300;

/**
 * Tarefas para o quadro: as abertas e as concluidas nos ultimos dias, sem as
 * canceladas. Usa os mesmos filtros e o mesmo escopo das listas: "mine" sao as
 * tarefas da pessoa, "team" as da empresa (so para quem gerencia).
 */
export async function listBoardTasks(user: CurrentUser, scope: "mine" | "team", filters: TaskFilters): Promise<BoardTask[]> {
  const normalized = normalizeTaskFilters(filters);
  const desde = new Date(Date.now() - BOARD_COMPLETED_DAYS * 86_400_000);
  const where: Prisma.TaskWhereInput = {
    companyId: user.companyId,
    ...(scope === "mine" ? { assigneeId: user.id } : {}),
    ...buildTaskSearchWhere(normalized),
    AND: [
      { status: { not: "CANCELED" } },
      { OR: [{ status: { not: "COMPLETED" } }, { completedAt: { gte: desde } }] },
    ],
  };

  const tarefas = await prisma.task.findMany({
    where,
    select: {
      id: true,
      title: true,
      dueDate: true,
      priority: true,
      status: true,
      requiresProof: true,
      assignee: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
      _count: { select: { proofs: true } },
    },
    orderBy: [{ dueDate: "asc" }, { id: "asc" }],
    take: BOARD_LIMIT,
  });
  const agora = new Date();

  return tarefas.map((tarefa) => ({
    id: tarefa.id,
    title: tarefa.title,
    dueDate: tarefa.dueDate.toISOString(),
    priority: tarefa.priority,
    status: tarefa.status,
    late: isTaskLate(tarefa, agora),
    requiresProof: tarefa.requiresProof,
    hasProof: tarefa._count.proofs > 0,
    assigneeName: tarefa.assignee.name,
    departmentName: tarefa.department.name,
  }));
}

export async function getTaskFormOptions(companyId: string) {
  const [departments, users] = await Promise.all([
    prisma.department.findMany({
      where: {
        companyId,
        isActive: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: {
        companyId,
        isActive: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return { departments, users };
}

export async function getTaskDetail(user: CurrentUser, id: string) {
  const canManage = canManageTasks(user.role);
  const task = await prisma.task.findFirst({
    where: {
      id,
      companyId: user.companyId,
      ...(canManage ? {} : { assigneeId: user.id }),
    },
    include: {
      assignee: true,
      creator: true,
      department: true,
      recurrenceRule: true,
      comments: {
        include: {
          author: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      attachments: {
        include: {
          author: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      proofs: {
        include: {
          author: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!task) {
    notFound();
  }

  return {
    task,
    canManage,
  };
}

export async function findTaskForUser(taskId: string, user: CurrentUser) {
  return prisma.task.findFirst({
    where: {
      id: taskId,
      companyId: user.companyId,
      ...(canManageTasks(user.role) ? {} : { assigneeId: user.id }),
    },
  });
}
