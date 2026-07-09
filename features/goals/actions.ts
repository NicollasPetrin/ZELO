"use server";

import { revalidatePath } from "next/cache";
import { actionError } from "@/lib/action-result";
import { assertCanManageGoals } from "@/lib/auth/guards";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { getPlanAccess } from "@/lib/plans";
import { goalSchema } from "@/lib/validations";

function dateValue(value: string) {
  return new Date(`${value}T12:00:00`);
}

export async function saveGoalAction(values: unknown) {
  try {
    const user = await requireUser();
    assertCanManageGoals(user);

    const parsed = goalSchema.parse(values);
    const access = getPlanAccess(user.company.plan);

    if (!access.canUseGoalAssignments && (parsed.departmentId || parsed.responsibleId)) {
      throw new Error("Metas por setor ou responsavel estao disponiveis a partir do Plano Gestao.");
    }

    const data = {
      title: parsed.title,
      description: parsed.description || null,
      targetValue: parsed.targetValue,
      currentValue: parsed.currentValue,
      unit: parsed.unit,
      period: parsed.period,
      status: parsed.status,
      departmentId: access.canUseGoalAssignments ? parsed.departmentId || null : null,
      responsibleId: access.canUseGoalAssignments ? parsed.responsibleId || null : null,
      startDate: dateValue(parsed.startDate),
      endDate: dateValue(parsed.endDate),
    };

    if (parsed.id) {
      await prisma.goal.update({
        where: {
          id: parsed.id,
          companyId: user.companyId,
        },
        data,
      });
    } else {
      await prisma.goal.create({
        data: {
          ...data,
          companyId: user.companyId,
        },
      });
    }

    revalidatePath("/goals");
    revalidatePath("/dashboard");
    return { ok: true, message: "Meta salva." } as const;
  } catch (error) {
    return actionError(error, "Nao foi possivel salvar a meta.");
  }
}

export async function deleteGoalAction(id: string) {
  try {
    const user = await requireUser();
    assertCanManageGoals(user);

    await prisma.goal.delete({
      where: {
        id,
        companyId: user.companyId,
      },
    });

    revalidatePath("/goals");
    revalidatePath("/dashboard");
    return { ok: true, message: "Meta excluida." } as const;
  } catch (error) {
    return actionError(error, "Nao foi possivel excluir a meta.");
  }
}
