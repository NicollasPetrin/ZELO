import "server-only";
import { notFound } from "next/navigation";
import type { Prisma, TaskPriority, TaskStatus } from "@prisma/client";
import type { CurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { canManageTasks } from "@/lib/permissions";
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

/**
 * Opcoes dos seletores do formulario de tarefa.
 *
 * O `select` e obrigatorio, nao economia: estas listas sao entregues como
 * propriedade de um componente cliente, e o React serializa o objeto inteiro no
 * payload da pagina — inclusive os campos que a tela nunca mostra. Buscar a
 * linha completa de User colocaria o hash de senha de toda a equipe dentro do
 * HTML de quem abrir /team-tasks.
 */
export async function getTaskFormOptions(companyId: string) {
  const [departments, users] = await Promise.all([
    prisma.department.findMany({
      where: {
        companyId,
        isActive: true,
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: {
        companyId,
        isActive: true,
      },
      select: { id: true, name: true },
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
      // Somente o que a tela mostra. `assignee: true` traria a linha inteira de
      // User, hash de senha incluso, para dentro do render.
      assignee: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
      recurrenceRule: true,
      comments: {
        select: {
          id: true,
          text: true,
          createdAt: true,
          author: { select: { id: true, name: true } },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      attachments: {
        select: {
          id: true,
          fileName: true,
          fileUrl: true,
          fileType: true,
          fileSize: true,
          createdAt: true,
          author: { select: { id: true, name: true } },
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
