"use server";

import { revalidatePath } from "next/cache";
import { actionError } from "@/lib/action-result";
import { recordActivity } from "@/lib/audit";
import { assertCanManageTasks } from "@/lib/auth/guards";
import { requireUser } from "@/lib/auth/session";
import { findTaskForUser } from "@/features/tasks/data";
import { prisma } from "@/lib/db/client";
import { getPlanAccess } from "@/lib/plans";
import { assertUserActionRateLimit } from "@/lib/rate-limit";
import { reconcileTaskStatus } from "@/lib/task-status";
import { assertCompanyHasActivePlan } from "@/lib/subscription";
import { canComplete, PROOF_REQUIRED_MESSAGE, statusAfterRejection } from "@/lib/task-proof";
import {
  attachmentSchema,
  commentSchema,
  idSchema,
  proofReviewSchema,
  taskSchema,
  taskStatusSchema,
} from "@/lib/validations";

function taskDate(value: string) {
  const date = new Date(`${value}T17:00:00`);
  return Number.isNaN(date.getTime()) ? new Date(value) : date;
}

function recurrenceData(parsed: ReturnType<typeof taskSchema.parse>, taskId: string) {
  if (parsed.recurrenceType === "NONE") {
    return null;
  }

  return {
    taskId,
    type: parsed.recurrenceType,
    weekDays: parsed.weekDays || null,
    monthDay: parsed.monthDay === "" ? null : parsed.monthDay,
    startDate: parsed.recurrenceStartDate ? taskDate(parsed.recurrenceStartDate) : taskDate(parsed.dueDate),
    endDate: parsed.recurrenceEndDate ? taskDate(parsed.recurrenceEndDate) : null,
  };
}

export async function createTaskAction(values: unknown) {
  try {
    const user = await requireUser();
    assertCanManageTasks(user);
    await assertUserActionRateLimit(user.id, "tasks:create");

    const parsed = taskSchema.parse(values);
    const activePlan = assertCompanyHasActivePlan(user.company);
    const access = getPlanAccess(activePlan);

    if (!access.canUseRecurringTasks && parsed.recurrenceType !== "NONE") {
      throw new Error("Tarefas recorrentes estao disponiveis a partir do Plano Gestao.");
    }

    const [department, assignee] = await Promise.all([
      prisma.department.findFirst({ where: { id: parsed.departmentId, companyId: user.companyId, isActive: true } }),
      prisma.user.findFirst({ where: { id: parsed.assigneeId, companyId: user.companyId, isActive: true } }),
    ]);

    if (!department || !assignee) {
      throw new Error("Responsavel ou setor invalido.");
    }

    // "Atrasada" vem do prazo, nao da escolha de quem preenche o formulario.
    const novaData = taskDate(parsed.dueDate);
    const statusCriacao = reconcileTaskStatus(parsed.status, novaData);

    const task = await prisma.task.create({
      data: {
        companyId: user.companyId,
        departmentId: parsed.departmentId,
        assigneeId: parsed.assigneeId,
        creatorId: user.id,
        title: parsed.title,
        description: parsed.description,
        dueDate: novaData,
        priority: parsed.priority,
        requiresProof: parsed.requiresProof,
        status: statusCriacao,
        completedAt: statusCriacao === "COMPLETED" ? new Date() : null,
      },
    });

    const recurrence = recurrenceData(parsed, task.id);
    if (recurrence) {
      await prisma.recurrenceRule.create({ data: recurrence });
    }

    await prisma.notification.create({
      data: {
        companyId: user.companyId,
        userId: parsed.assigneeId,
        type: "TASK_ASSIGNED",
        title: "Nova tarefa atribuida",
        message: `${user.name} atribuiu a tarefa "${parsed.title}" para voce.`,
        link: `/tasks/${task.id}`,
        relatedTaskId: task.id,
      },
    });

    await recordActivity({
      companyId: user.companyId,
      actorId: user.id,
      type: "TASK_CREATED",
      entityType: "Task",
      entityId: task.id,
      title: "Tarefa criada",
      description: parsed.title,
      metadata: {
        assigneeId: parsed.assigneeId,
        priority: parsed.priority,
        status: parsed.status,
      },
    });

    revalidatePath("/team-tasks");
    revalidatePath("/my-tasks");
    revalidatePath("/dashboard");
    revalidatePath("/notifications");
    return { ok: true, data: { id: task.id }, message: "Tarefa criada." } as const;
  } catch (error) {
    return actionError(error, "Nao foi possivel criar a tarefa.");
  }
}

export async function updateTaskAction(values: unknown) {
  try {
    const user = await requireUser();
    assertCanManageTasks(user);
    await assertUserActionRateLimit(user.id, "tasks:update");

    const parsed = taskSchema.parse(values);
    const activePlan = assertCompanyHasActivePlan(user.company);
    const access = getPlanAccess(activePlan);

    if (!access.canUseRecurringTasks && parsed.recurrenceType !== "NONE") {
      throw new Error("Tarefas recorrentes estao disponiveis a partir do Plano Gestao.");
    }

    if (!parsed.id) {
      throw new Error("Tarefa invalida.");
    }
    const parsedTaskId = idSchema.parse(parsed.id);

    const task = await prisma.task.findFirst({
      where: {
        id: parsedTaskId,
        companyId: user.companyId,
      },
    });

    if (!task) {
      throw new Error("Tarefa nao encontrada.");
    }

    const [department, assignee] = await Promise.all([
      prisma.department.findFirst({ where: { id: parsed.departmentId, companyId: user.companyId, isActive: true } }),
      prisma.user.findFirst({ where: { id: parsed.assigneeId, companyId: user.companyId, isActive: true } }),
    ]);

    if (!department || !assignee) {
      throw new Error("Responsavel ou setor invalido.");
    }

    // Sem isto, adiar o prazo de uma tarefa atrasada deixava o status como
    // estava e ela continuava aparecendo atrasada para sempre.
    const dataAtualizada = taskDate(parsed.dueDate);
    const statusAtualizado = reconcileTaskStatus(parsed.status, dataAtualizada);

    const updateResult = await prisma.task.updateMany({
      where: {
        id: task.id,
        companyId: user.companyId,
      },
      data: {
        departmentId: parsed.departmentId,
        assigneeId: parsed.assigneeId,
        title: parsed.title,
        description: parsed.description,
        dueDate: dataAtualizada,
        priority: parsed.priority,
        requiresProof: parsed.requiresProof,
        status: statusAtualizado,
        completedAt: statusAtualizado === "COMPLETED" ? task.completedAt ?? new Date() : null,
      },
    });

    if (updateResult.count === 0) {
      throw new Error("Tarefa nao encontrada.");
    }

    const recurrence = recurrenceData(parsed, task.id);
    if (recurrence) {
      await prisma.recurrenceRule.upsert({
        where: {
          taskId: task.id,
        },
        create: recurrence,
        update: {
          type: recurrence.type,
          weekDays: recurrence.weekDays,
          monthDay: recurrence.monthDay,
          startDate: recurrence.startDate,
          endDate: recurrence.endDate,
        },
      });
    } else {
      await prisma.recurrenceRule.deleteMany({ where: { taskId: task.id } });
    }

    await recordActivity({
      companyId: user.companyId,
      actorId: user.id,
      type: "TASK_UPDATED",
      entityType: "Task",
      entityId: task.id,
      title: "Tarefa atualizada",
      description: parsed.title,
      metadata: {
        assigneeId: parsed.assigneeId,
        priority: parsed.priority,
        status: parsed.status,
      },
    });

    revalidatePath("/team-tasks");
    revalidatePath("/my-tasks");
    revalidatePath(`/tasks/${task.id}`);
    revalidatePath("/dashboard");
    return { ok: true, data: { id: task.id }, message: "Tarefa atualizada." } as const;
  } catch (error) {
    return actionError(error, "Nao foi possivel atualizar a tarefa.");
  }
}

export async function updateTaskStatusAction(values: unknown) {
  try {
    const user = await requireUser();
    assertCompanyHasActivePlan(user.company);
    await assertUserActionRateLimit(user.id, "tasks:update-status");
    const parsed = taskStatusSchema.parse(values);
    const taskId = idSchema.parse(parsed.taskId);
    const task = await findTaskForUser(taskId, user);

    if (!task) {
      throw new Error("Voce nao tem permissao para alterar esta tarefa.");
    }

    // Aqui so o status muda, mas alguem pode marcar "Atrasada" numa tarefa
    // cujo prazo ainda nem chegou.
    const statusReconciliado = reconcileTaskStatus(parsed.status, task.dueDate);

    // Sem esta conferencia, marcar "concluida" continuaria valendo como prova
    // de que algo foi feito — que e justamente o que a foto veio corrigir.
    if (statusReconciliado === "COMPLETED") {
      const provas = await prisma.taskProof.count({ where: { taskId: task.id } });

      if (!canComplete(task, provas)) {
        throw new Error(PROOF_REQUIRED_MESSAGE);
      }
    }

    const updateResult = await prisma.task.updateMany({
      where: {
        id: task.id,
        companyId: user.companyId,
      },
      data: {
        status: statusReconciliado,
        completedAt: statusReconciliado === "COMPLETED" ? task.completedAt ?? new Date() : null,
      },
    });

    if (updateResult.count === 0) {
      throw new Error("Tarefa nao encontrada.");
    }

    const recipientId = task.creatorId === user.id ? task.assigneeId : task.creatorId;
    if (recipientId !== user.id) {
      await prisma.notification.create({
        data: {
          companyId: user.companyId,
          userId: recipientId,
          type: "STATUS_UPDATED",
          title: "Status atualizado",
          message: `${user.name} atualizou "${task.title}".`,
          link: `/tasks/${task.id}`,
          relatedTaskId: task.id,
        },
      });
    }

    await recordActivity({
      companyId: user.companyId,
      actorId: user.id,
      type: "TASK_UPDATED",
      entityType: "Task",
      entityId: task.id,
      title: "Status da tarefa atualizado",
      description: task.title,
      metadata: {
        status: parsed.status,
      },
    });

    revalidatePath("/team-tasks");
    revalidatePath("/my-tasks");
    revalidatePath(`/tasks/${task.id}`);
    revalidatePath("/dashboard");
    revalidatePath("/notifications");
    return { ok: true, message: "Status atualizado." } as const;
  } catch (error) {
    return actionError(error, "Nao foi possivel atualizar o status.");
  }
}

export async function addTaskCommentAction(values: unknown) {
  try {
    const user = await requireUser();
    assertCompanyHasActivePlan(user.company);
    await assertUserActionRateLimit(user.id, "tasks:add-comment");
    const parsed = commentSchema.parse(values);
    const taskId = idSchema.parse(parsed.taskId);
    const task = await findTaskForUser(taskId, user);

    if (!task) {
      throw new Error("Voce nao tem permissao para comentar nesta tarefa.");
    }

    await prisma.taskComment.create({
      data: {
        taskId: task.id,
        authorId: user.id,
        text: parsed.text,
      },
    });

    const recipients = new Set([task.assigneeId, task.creatorId]);
    recipients.delete(user.id);

    await Promise.all(
      Array.from(recipients).map((recipientId) =>
        prisma.notification.create({
          data: {
            companyId: user.companyId,
            userId: recipientId,
            type: "NEW_COMMENT",
            title: "Novo comentario",
            message: `${user.name} comentou em "${task.title}".`,
            link: `/tasks/${task.id}`,
            relatedTaskId: task.id,
          },
        }),
      ),
    );

    await recordActivity({
      companyId: user.companyId,
      actorId: user.id,
      type: "TASK_COMMENTED",
      entityType: "Task",
      entityId: task.id,
      title: "Comentario em tarefa",
      description: task.title,
    });

    revalidatePath(`/tasks/${task.id}`);
    revalidatePath("/notifications");
    return { ok: true, message: "Comentario registrado." } as const;
  } catch (error) {
    return actionError(error, "Nao foi possivel comentar.");
  }
}

export async function addTaskAttachmentAction(values: unknown) {
  try {
    const user = await requireUser();
    assertCompanyHasActivePlan(user.company);
    await assertUserActionRateLimit(user.id, "tasks:add-attachment");
    const parsed = attachmentSchema.parse(values);
    const taskId = idSchema.parse(parsed.taskId);
    const task = await findTaskForUser(taskId, user);

    if (!task) {
      throw new Error("Voce nao tem permissao para anexar nesta tarefa.");
    }

    await prisma.taskAttachment.create({
      data: {
        taskId: task.id,
        authorId: user.id,
        fileName: parsed.fileName,
        fileUrl: parsed.fileUrl,
        fileType: parsed.fileType || null,
        fileSize: parsed.fileSize === "" ? null : parsed.fileSize,
      },
    });

    await recordActivity({
      companyId: user.companyId,
      actorId: user.id,
      type: "TASK_UPDATED",
      entityType: "Task",
      entityId: task.id,
      title: "Anexo registrado em tarefa",
      description: parsed.fileName,
    });

    revalidatePath(`/tasks/${task.id}`);
    return { ok: true, message: "Anexo registrado." } as const;
  } catch (error) {
    return actionError(error, "Nao foi possivel registrar o anexo.");
  }
}

/**
 * Aprova a prova enviada e conclui a tarefa.
 *
 * Quem aprova nao pode ser quem executou: a revisao existe para haver um
 * segundo par de olhos, e deixar o responsavel aprovar a si mesmo devolveria a
 * situacao anterior, em que dizer "pronto" bastava.
 */
export async function approveTaskProofAction(values: unknown) {
  try {
    const user = await requireUser();
    assertCompanyHasActivePlan(user.company);
    assertCanManageTasks(user);
    await assertUserActionRateLimit(user.id, "tasks:approve-proof");
    const parsed = proofReviewSchema.parse(values);

    const task = await prisma.task.findFirst({
      where: { id: parsed.taskId, companyId: user.companyId },
      select: { id: true, title: true, assigneeId: true, requiresProof: true, completedAt: true },
    });

    if (!task) {
      throw new Error("Tarefa nao encontrada.");
    }

    const provas = await prisma.taskProof.count({ where: { taskId: task.id } });

    if (!canComplete(task, provas)) {
      throw new Error(PROOF_REQUIRED_MESSAGE);
    }

    await prisma.task.update({
      where: { id: task.id },
      data: { status: "COMPLETED", completedAt: task.completedAt ?? new Date() },
    });

    if (task.assigneeId !== user.id) {
      await prisma.notification.create({
        data: {
          companyId: user.companyId,
          userId: task.assigneeId,
          type: "STATUS_UPDATED",
          title: "Prova aprovada",
          message: `${user.name} aprovou a conclusao de "${task.title}".`,
          link: `/tasks/${task.id}`,
          relatedTaskId: task.id,
        },
      });
    }

    await recordActivity({
      companyId: user.companyId,
      actorId: user.id,
      type: "TASK_UPDATED",
      entityType: "Task",
      entityId: task.id,
      title: "Prova aprovada",
      description: task.title,
    });

    revalidatePath(`/tasks/${task.id}`);
    revalidatePath("/team-tasks");

    return { ok: true, message: "Prova aprovada e tarefa concluida." } as const;
  } catch (error) {
    return actionError(error, "Nao foi possivel aprovar a prova.");
  }
}

/** Recusa a prova e devolve a tarefa para execucao, com o motivo registrado. */
export async function rejectTaskProofAction(values: unknown) {
  try {
    const user = await requireUser();
    assertCompanyHasActivePlan(user.company);
    assertCanManageTasks(user);
    await assertUserActionRateLimit(user.id, "tasks:reject-proof");
    const parsed = proofReviewSchema.parse(values);

    const task = await prisma.task.findFirst({
      where: { id: parsed.taskId, companyId: user.companyId },
      select: { id: true, title: true, assigneeId: true },
    });

    if (!task) {
      throw new Error("Tarefa nao encontrada.");
    }

    const motivo = parsed.reason?.trim();

    await prisma.$transaction([
      prisma.task.update({
        where: { id: task.id },
        data: { status: statusAfterRejection(), completedAt: null },
      }),
      // O motivo vira comentario para ficar na tarefa, visivel a quem vai
      // refazer o servico. Uma recusa sem explicacao so gera outra ida e volta.
      ...(motivo
        ? [
            prisma.taskComment.create({
              data: { taskId: task.id, authorId: user.id, text: `Prova recusada: ${motivo}` },
            }),
          ]
        : []),
    ]);

    if (task.assigneeId !== user.id) {
      await prisma.notification.create({
        data: {
          companyId: user.companyId,
          userId: task.assigneeId,
          type: "STATUS_UPDATED",
          title: "Prova recusada",
          message: motivo
            ? `${user.name} recusou a prova de "${task.title}": ${motivo}`
            : `${user.name} recusou a prova de "${task.title}".`,
          link: `/tasks/${task.id}`,
          relatedTaskId: task.id,
        },
      });
    }

    await recordActivity({
      companyId: user.companyId,
      actorId: user.id,
      type: "TASK_UPDATED",
      entityType: "Task",
      entityId: task.id,
      title: "Prova recusada",
      description: task.title,
      metadata: motivo ? { motivo } : undefined,
    });

    revalidatePath(`/tasks/${task.id}`);
    revalidatePath("/team-tasks");

    return { ok: true, message: "Prova recusada e tarefa devolvida." } as const;
  } catch (error) {
    return actionError(error, "Nao foi possivel recusar a prova.");
  }
}
