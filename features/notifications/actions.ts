"use server";

import { revalidatePath } from "next/cache";
import { actionError } from "@/lib/action-result";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { assertUserActionRateLimit } from "@/lib/rate-limit";
import { assertCompanyHasActivePlan } from "@/lib/subscription";
import { idSchema } from "@/lib/validations";

export async function markNotificationReadAction(id: string) {
  try {
    const user = await requireUser();
    assertCompanyHasActivePlan(user.company);
    await assertUserActionRateLimit(user.id, "notifications:mark-read");
    const parsedId = idSchema.parse(id);

    await prisma.notification.updateMany({
      where: {
        id: parsedId,
        userId: user.id,
        companyId: user.companyId,
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
    await assertUserActionRateLimit(user.id, "notifications:mark-all-read");

    await prisma.notification.updateMany({
      where: {
        userId: user.id,
        companyId: user.companyId,
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
