"use server";

import { revalidatePath } from "next/cache";
import { actionError } from "@/lib/action-result";
import { recordActivity } from "@/lib/audit";
import { assertCanManageCompany } from "@/lib/auth/guards";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { assertUserActionRateLimit } from "@/lib/rate-limit";
import { assertCompanyHasActivePlan } from "@/lib/subscription";
import { departmentSchema, idSchema } from "@/lib/validations";

export async function saveDepartmentAction(values: unknown) {
  try {
    const user = await requireUser();
    assertCanManageCompany(user);
    assertCompanyHasActivePlan(user.company);
    await assertUserActionRateLimit(user.id, "departments:save");

    const parsed = departmentSchema.parse(values);
    const data = {
      name: parsed.name,
      description: parsed.description || null,
      isActive: parsed.isActive,
    };
    let entityId = parsed.id ?? null;

    if (parsed.id) {
      const result = await prisma.department.updateMany({
        where: {
          id: parsed.id,
          companyId: user.companyId,
        },
        data,
      });

      if (result.count === 0) {
        throw new Error("Setor nao encontrado.");
      }
    } else {
      const department = await prisma.department.create({
        data: {
          ...data,
          companyId: user.companyId,
        },
      });
      entityId = department.id;
    }

    await recordActivity({
      companyId: user.companyId,
      actorId: user.id,
      type: parsed.id ? "DEPARTMENT_UPDATED" : "DEPARTMENT_CREATED",
      entityType: "Department",
      entityId,
      title: parsed.id ? "Setor atualizado" : "Setor criado",
      description: data.name,
    });

    revalidatePath("/departments");
    revalidatePath("/dashboard");
    return { ok: true, message: "Setor salvo." } as const;
  } catch (error) {
    return actionError(error, "Nao foi possivel salvar o setor.");
  }
}

export async function toggleDepartmentAction(id: string, isActive: boolean) {
  try {
    const user = await requireUser();
    assertCanManageCompany(user);
    assertCompanyHasActivePlan(user.company);
    await assertUserActionRateLimit(user.id, "departments:toggle");
    const parsedId = idSchema.parse(id);

    const result = await prisma.department.updateMany({
      where: {
        id: parsedId,
        companyId: user.companyId,
      },
      data: {
        isActive,
      },
    });

    if (result.count === 0) {
      throw new Error("Setor nao encontrado.");
    }

    await recordActivity({
      companyId: user.companyId,
      actorId: user.id,
      type: "DEPARTMENT_UPDATED",
      entityType: "Department",
      entityId: parsedId,
      title: isActive ? "Setor ativado" : "Setor inativado",
    });

    revalidatePath("/departments");
    return { ok: true, message: isActive ? "Setor ativado." : "Setor inativado." } as const;
  } catch (error) {
    return actionError(error, "Nao foi possivel alterar o setor.");
  }
}

export async function deleteDepartmentAction(id: string) {
  try {
    const user = await requireUser();
    assertCanManageCompany(user);
    assertCompanyHasActivePlan(user.company);
    await assertUserActionRateLimit(user.id, "departments:delete");
    const parsedId = idSchema.parse(id);

    const result = await prisma.department.deleteMany({
      where: {
        id: parsedId,
        companyId: user.companyId,
      },
    });

    if (result.count === 0) {
      throw new Error("Setor nao encontrado.");
    }

    await recordActivity({
      companyId: user.companyId,
      actorId: user.id,
      type: "DEPARTMENT_UPDATED",
      entityType: "Department",
      entityId: parsedId,
      title: "Setor excluido",
    });

    revalidatePath("/departments");
    return { ok: true, message: "Setor excluido." } as const;
  } catch {
    return {
      ok: false,
      error: "Este setor possui pessoas, tarefas ou metas. Inative o setor para preservar o historico.",
    } as const;
  }
}
