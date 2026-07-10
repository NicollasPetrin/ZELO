"use server";

import { revalidatePath } from "next/cache";
import { actionError } from "@/lib/action-result";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { assertCompanyHasActivePlan } from "@/lib/subscription";

export async function markNotificationReadAction(id: string) {
  try {
    const user = await requireUser();
    assertCompanyHasActivePlan(user.company);

    await prisma.notification.update({
      where: {
        id,
        userId: user.id,
      },
      data: {
        isRead: true,
      },
    });

    revalidatePath("/notifications");
    revalidatePath("/", "layout");
    return { ok: true, message: "Notificacao lida." } as const;
  } catch (error) {
    return actionError(error, "Nao foi possivel marcar como lida.");
  }
}

export async function markAllNotificationsReadAction() {
  try {
    const user = await requireUser();
    assertCompanyHasActivePlan(user.company);

    await prisma.notification.updateMany({
      where: {
        userId: user.id,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    revalidatePath("/notifications");
    revalidatePath("/", "layout");
    return { ok: true, message: "Notificacoes atualizadas." } as const;
  } catch (error) {
    return actionError(error, "Nao foi possivel atualizar notificacoes.");
  }
}
