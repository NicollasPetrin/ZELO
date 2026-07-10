"use server";

import { Prisma, type SubscriptionPlan } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { actionError } from "@/lib/action-result";
import { assertCanManageTeam } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { calculateMonthlyPrice, canActivateAdditionalUser, getPlanAccess, planDetails } from "@/lib/plans";
import { assertCompanyHasActivePlan } from "@/lib/subscription";
import { employeeSchema } from "@/lib/validations";

function userLimitMessage(plan: SubscriptionPlan) {
  const maxUsers = planDetails[plan].maxUsers;

  return `O Plano ${planDetails[plan].name} permite ate ${maxUsers} usuarios ativos. Para adicionar mais pessoas, faca upgrade de plano.`;
}

async function assertCanActivateUser(tx: Prisma.TransactionClient, companyId: string, plan: SubscriptionPlan) {
  const activeUsers = await tx.user.count({
    where: {
      companyId,
      isActive: true,
    },
  });

  if (!canActivateAdditionalUser(plan, activeUsers)) {
    throw new Error(userLimitMessage(plan));
  }

  return activeUsers;
}

export async function saveEmployeeAction(values: unknown) {
  try {
    const user = await requireUser();
    assertCanManageTeam(user);
    const activePlan = assertCompanyHasActivePlan(user.company);

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

    let extraUserMessage: string | null = null;

    if (parsed.id) {
      await prisma.$transaction(
        async (tx) => {
          const existingEmployee = await tx.user.findFirst({
            where: {
              id: parsed.id,
              companyId: user.companyId,
            },
            select: {
              id: true,
              isActive: true,
            },
          });

          if (!existingEmployee) {
            throw new Error("Funcionario nao encontrado.");
          }

          if (!existingEmployee.isActive && parsed.isActive) {
            await assertCanActivateUser(tx, user.companyId, activePlan);
          }

          await tx.user.update({
            where: {
              id: parsed.id,
              companyId: user.companyId,
            },
            data: {
              ...data,
              ...(parsed.password ? { passwordHash: hashPassword(parsed.password) } : {}),
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } else {
      await prisma.$transaction(
        async (tx) => {
          if (parsed.isActive) {
            const activeUsers = await assertCanActivateUser(tx, user.companyId, activePlan);
            const nextUserCount = activeUsers + 1;
            const price = calculateMonthlyPrice(activePlan, nextUserCount);
            const access = getPlanAccess(activePlan);

            if (price.requiresUpgrade) {
              throw new Error(userLimitMessage(activePlan));
            }

            if (price.extraUsers > 0) {
              extraUserMessage = `Funcionario salvo. Este usuario fica acima dos ${access.includedUsers} incluidos no Plano ${planDetails[activePlan].name} e adiciona ${planDetails[activePlan].pricePerExtraUser}/mes a assinatura.`;
            }
          }

          await tx.user.create({
            data: {
              ...data,
              companyId: user.companyId,
              passwordHash: hashPassword(parsed.password ?? ""),
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    }

    revalidatePath("/employees");
    revalidatePath("/dashboard");
    return { ok: true, message: extraUserMessage ?? "Funcionario salvo." } as const;
  } catch (error) {
    return actionError(error, "Nao foi possivel salvar o funcionario.");
  }
}

export async function toggleEmployeeAction(id: string, isActive: boolean) {
  try {
    const user = await requireUser();
    assertCanManageTeam(user);
    const activePlan = assertCompanyHasActivePlan(user.company);

    if (id === user.id) {
      throw new Error("Voce nao pode inativar o proprio acesso.");
    }

    await prisma.$transaction(
      async (tx) => {
        const existingEmployee = await tx.user.findFirst({
          where: {
            id,
            companyId: user.companyId,
          },
          select: {
            id: true,
            isActive: true,
          },
        });

        if (!existingEmployee) {
          throw new Error("Funcionario nao encontrado.");
        }

        if (!existingEmployee.isActive && isActive) {
          await assertCanActivateUser(tx, user.companyId, activePlan);
        }

        await tx.user.update({
          where: {
            id,
            companyId: user.companyId,
          },
          data: {
            isActive,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    revalidatePath("/employees");
    return { ok: true, message: isActive ? "Funcionario ativado." : "Funcionario inativado." } as const;
  } catch (error) {
    return actionError(error, "Nao foi possivel alterar o funcionario.");
  }
}
