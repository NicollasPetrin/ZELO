"use server";

import { revalidatePath } from "next/cache";
import { actionError } from "@/lib/action-result";
import { assertCanManageTeam } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { calculateMonthlyPrice, getPlanAccess, planDetails } from "@/lib/plans";
import { employeeSchema } from "@/lib/validations";

export async function saveEmployeeAction(values: unknown) {
  try {
    const user = await requireUser();
    assertCanManageTeam(user);

    const parsed = employeeSchema.parse(values);
    const department = await prisma.department.findFirst({
      where: {
        id: parsed.departmentId,
        companyId: user.companyId,
      },
    });

    if (!department) {
      throw new Error("Setor invalido.");
    }

    const data = {
      name: parsed.name,
      email: parsed.email,
      role: parsed.role,
      departmentId: parsed.departmentId,
      position: parsed.position || null,
      isActive: parsed.isActive,
    };

    if (parsed.id) {
      await prisma.user.update({
        where: {
          id: parsed.id,
          companyId: user.companyId,
        },
        data: {
          ...data,
          ...(parsed.password ? { passwordHash: hashPassword(parsed.password) } : {}),
        },
      });
    } else {
      const access = getPlanAccess(user.company.plan);
      const activeUsers = await prisma.user.count({
        where: {
          companyId: user.companyId,
          isActive: true,
        },
      });
      const nextUserCount = activeUsers + 1;
      const price = calculateMonthlyPrice(user.company.plan, nextUserCount);

      if (price.requiresUpgrade) {
        throw new Error(
          `O Plano ${planDetails[user.company.plan].name} permite ate ${access.maxUsers} usuarios ativos. Para adicionar mais pessoas, faca upgrade de plano.`,
        );
      }

      await prisma.user.create({
        data: {
          ...data,
          companyId: user.companyId,
          passwordHash: hashPassword(parsed.password ?? ""),
        },
      });

      if (price.extraUsers > 0) {
        revalidatePath("/employees");
        revalidatePath("/dashboard");
        return {
          ok: true,
          message: `Funcionario salvo. Este usuario fica acima dos ${access.includedUsers} incluidos no Plano ${planDetails[user.company.plan].name} e adiciona ${planDetails[user.company.plan].pricePerExtraUser}/mes a assinatura.`,
        } as const;
      }

      if (price.requiresUpgrade) {
        throw new Error("Limite de usuarios excedido. Faca upgrade de plano para continuar.");
      }
    }

    revalidatePath("/employees");
    revalidatePath("/dashboard");
    return { ok: true, message: "Funcionario salvo." } as const;
  } catch (error) {
    return actionError(error, "Nao foi possivel salvar o funcionario.");
  }
}

export async function toggleEmployeeAction(id: string, isActive: boolean) {
  try {
    const user = await requireUser();
    assertCanManageTeam(user);

    if (id === user.id) {
      throw new Error("Voce nao pode inativar o proprio acesso.");
    }

    await prisma.user.update({
      where: {
        id,
        companyId: user.companyId,
      },
      data: {
        isActive,
      },
    });

    revalidatePath("/employees");
    return { ok: true, message: isActive ? "Funcionario ativado." : "Funcionario inativado." } as const;
  } catch (error) {
    return actionError(error, "Nao foi possivel alterar o funcionario.");
  }
}
