"use server";

import { revalidatePath } from "next/cache";
import { actionError } from "@/lib/action-result";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { assertUserActionRateLimit } from "@/lib/rate-limit";
import { assertCompanyHasActivePlan } from "@/lib/subscription";
import { syncTaskCalendar } from "@/features/calendar/sync";

/**
 * Desliga a agenda e apaga os tokens.
 *
 * Os compromissos ja criados ficam onde estao, na agenda da pessoa. Sair de uma
 * integracao nao deveria significar perder registro do que estava combinado, e
 * quem quiser limpar apaga na propria agenda.
 */
export async function disconnectGoogleCalendarAction() {
  try {
    const user = await requireUser();
    await assertUserActionRateLimit(user.id, "calendar:disconnect");

    await prisma.$transaction([
      prisma.googleCalendarAccount.deleteMany({ where: { userId: user.id } }),
      // Os vinculos vao junto: sem token, eles apontariam para compromissos que
      // a aplicacao nao consegue mais tocar.
      prisma.taskCalendarEvent.deleteMany({ where: { userId: user.id } }),
    ]);

    revalidatePath("/agenda");

    return { ok: true, message: "Agenda desconectada. Os compromissos ja criados continuam no seu Google." } as const;
  } catch (error) {
    return actionError(error, "Nao foi possivel desconectar a agenda.");
  }
}

/**
 * Manda para a agenda todas as tarefas em aberto da pessoa.
 *
 * Usado logo depois de conectar: sem isso, a agenda so comecaria a refletir a
 * realidade a partir da proxima tarefa criada, e quem acabou de ligar veria uma
 * agenda vazia e concluiria que nao funcionou.
 */
export async function resyncMyTasksAction() {
  try {
    const user = await requireUser();
    assertCompanyHasActivePlan(user.company);
    await assertUserActionRateLimit(user.id, "calendar:resync");

    const conta = await prisma.googleCalendarAccount.findUnique({ where: { userId: user.id } });

    if (!conta) {
      throw new Error("Conecte sua agenda do Google antes de sincronizar.");
    }

    const tarefas = await prisma.task.findMany({
      where: {
        companyId: user.companyId,
        assigneeId: user.id,
        status: { in: ["PENDING", "IN_PROGRESS", "IN_REVIEW", "OVERDUE"] },
      },
      select: { id: true },
      orderBy: { dueDate: "asc" },
      // Teto para nao prender a requisicao nem estourar a cota do Google numa
      // base grande; o que passar disso entra conforme as tarefas forem mexidas.
      take: 100,
    });

    let enviadas = 0;

    for (const tarefa of tarefas) {
      await syncTaskCalendar(tarefa.id);
      enviadas += 1;
    }

    revalidatePath("/agenda");

    return {
      ok: true,
      message:
        enviadas === 0
          ? "Voce nao tem tarefas em aberto para colocar na agenda."
          : `${enviadas} tarefa(s) enviadas para a sua agenda.`,
    } as const;
  } catch (error) {
    return actionError(error, "Nao foi possivel sincronizar as tarefas.");
  }
}
