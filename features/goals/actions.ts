"use server";

import { revalidatePath } from "next/cache";
import { actionError } from "@/lib/action-result";
import { recordActivity } from "@/lib/audit";
import { assertCanManageGoals } from "@/lib/auth/guards";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { getPlanAccess } from "@/lib/plans";
import { assertUserActionRateLimit } from "@/lib/rate-limit";
import { assertCompanyHasActivePlan } from "@/lib/subscription";
import { goalSchema, idSchema } from "@/lib/validations";

function dateValue(value: string) {
  return new Date(`${value}T12:00:00`);
}

export async function saveGoalAction(values: unknown) {
  try {
    const user = await requireUser();
    assertCanManageGoals(user);
    await assertUserActionRateLimit(user.id, "goals:save");

    const parsed = goalSchema.parse(values);
    const activePlan = assertCompanyHasActivePlan(user.company);
    const access = getPlanAccess(activePlan);

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
    let entityId = parsed.id ?? null;

    if (parsed.id) {
      const result = await prisma.goal.updateMany({
        where: {
          id: parsed.id,
          companyId: user.companyId,
        },
        data,
      });

      if (result.count === 0) {
        throw new Error("Meta nao encontrada.");
      }
    } else {
      const goal = await prisma.goal.create({
        data: {
          ...data,
          companyId: user.companyId,
        },
      });
      entityId = goal.id;
    }

    await recordActivity({
      companyId: user.companyId,
      actorId: user.id,
      type: parsed.id ? "GOAL_UPDATED" : "GOAL_CREATED",
      entityType: "Goal",
      entityId,
      title: parsed.id ? "Meta atualizada" : "Meta criada",
      description: data.title,
      metadata: {
        status: data.status,
        period: data.period,
      },
    });

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
    assertCompanyHasActivePlan(user.company);
    await assertUserActionRateLimit(user.id, "goals:delete");
    const parsedId = idSchema.parse(id);

    const result = await prisma.goal.deleteMany({
      where: {
        id: parsedId,
        companyId: user.companyId,
      },
    });

    if (result.count === 0) {
      throw new Error("Meta nao encontrada.");
    }

    await recordActivity({
      companyId: user.companyId,
      actorId: user.id,
      type: "GOAL_UPDATED",
      entityType: "Goal",
      entityId: parsedId,
      title: "Meta excluida",
    });

    revalidatePath("/goals");
    revalidatePath("/dashboard");
    return { ok: true, message: "Meta excluida." } as const;
  } catch (error) {
    return actionError(error, "Nao foi possivel excluir a meta.");
  }
}
