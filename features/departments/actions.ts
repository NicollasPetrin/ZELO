"use server";

import { revalidatePath } from "next/cache";
import { actionError } from "@/lib/action-result";
import { assertCanManageCompany } from "@/lib/auth/guards";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { departmentSchema } from "@/lib/validations";

export async function saveDepartmentAction(values: unknown) {
  try {
    const user = await requireUser();
    assertCanManageCompany(user);

    const parsed = departmentSchema.parse(values);
    const data = {
      name: parsed.name,
      description: parsed.description || null,
      isActive: parsed.isActive,
    };

    if (parsed.id) {
      await prisma.department.update({
        where: {
          id: parsed.id,
          companyId: user.companyId,
        },
        data,
      });
    } else {
      await prisma.department.create({
        data: {
          ...data,
          companyId: user.companyId,
        },
      });
    }

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

    await prisma.department.update({
      where: {
        id,
        companyId: user.companyId,
      },
      data: {
        isActive,
      },
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

    await prisma.department.delete({
      where: {
        id,
        companyId: user.companyId,
      },
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
