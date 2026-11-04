import "server-only";
import { recordActivity } from "@/lib/audit";
import { prisma } from "@/lib/db/client";
import { nextOccurrenceAfter } from "@/lib/recurrence";
import { syncTaskCalendarSafely } from "@/features/calendar/sync";

/**
 * Cria a proxima ocorrencia de uma tarefa recorrente que acabou de ser
 * concluida.
 *
 * A regra de recorrencia era gravada e mostrada na tela, mas nada criava a
 * tarefa seguinte: quem concluia "abrir o caixa" na segunda nao via a tarefa
 * na terca. Aqui a rotina anda: nasce uma tarefa nova, pendente, com o mesmo
 * responsavel, setor, prioridade e exigencia de prova, no proximo prazo.
 *
 * A regra muda para a ocorrencia nova. Assim a serie tem sempre uma unica
 * tarefa aberta, e reabrir e concluir de novo a antiga nao cria uma segunda
 * copia da seguinte. Se duas conclusoes chegam juntas, a segunda nao acha mais
 * a regra na tarefa antiga e a transacao desfaz a copia extra.
 *
 * Nunca derruba a conclusao: se algo falhar aqui, a tarefa continua concluida
 * e o erro vai para o log.
 */
export async function advanceRecurringTaskSafely(taskId: string, actor: { id: string; companyId: string }) {
  try {
    const task = await prisma.task.findFirst({
      where: { id: taskId, companyId: actor.companyId },
      include: { recurrenceRule: true },
    });

    if (!task?.recurrenceRule || task.recurrenceRule.type === "NONE") {
      return null;
    }

    const proximoPrazo = nextOccurrenceAfter(task.recurrenceRule, task.dueDate);

    if (!proximoPrazo) {
      return null;
    }

    const proxima = await prisma.$transaction(async (tx) => {
      const criada = await tx.task.create({
        data: {
          companyId: task.companyId,
          departmentId: task.departmentId,
          assigneeId: task.assigneeId,
          creatorId: task.creatorId,
          title: task.title,
          description: task.description,
          dueDate: proximoPrazo,
          priority: task.priority,
          requiresProof: task.requiresProof,
          status: "PENDING",
        },
      });

      await tx.recurrenceRule.update({
        where: { taskId: task.id },
        data: { taskId: criada.id },
      });

      return criada;
    });

    await recordActivity({
      companyId: task.companyId,
      actorId: actor.id,
      type: "TASK_CREATED",
      entityType: "Task",
      entityId: proxima.id,
      title: "Próxima ocorrência da rotina criada",
      description: task.title,
      metadata: { previousTaskId: task.id, recurrence: task.recurrenceRule.type },
    });

    // A agenda e espelho da tarefa: a ocorrencia nova tambem tem que chegar la.
    await syncTaskCalendarSafely(proxima.id);

    return proxima;
  } catch (error) {
    console.error("[recorrencia] falha ao criar a proxima ocorrencia", taskId, error);
    return null;
  }
}
