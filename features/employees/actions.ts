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

function extraUserApprovalMessage(plan: SubscriptionPlan) {
  return `Este funcionario ficara acima dos usuarios incluidos no Plano ${planDetails[plan].name} e adicionara ${planDetails[plan].pricePerExtraUser}/mes a assinatura. Confirme o aceite do custo adicional para continuar.`;
}

function extraUserSavedMessage(plan: SubscriptionPlan) {
  const access = getPlanAccess(plan);

  return `Funcionario salvo. Este usuario fica acima dos ${access.includedUsers} incluidos no Plano ${planDetails[plan].name} e adiciona ${planDetails[plan].pricePerExtraUser}/mes a assinatura.`;
}

async function validateUserActivation({
  tx,
  companyId,
  plan,
  confirmExtraUserCharge,
}: {
  tx: Prisma.TransactionClient;
  companyId: string;
  plan: SubscriptionPlan;
  confirmExtraUserCharge: boolean;
}) {
  const activeUsers = await tx.user.count({
    where: {
      companyId,
      isActive: true,
    },
  });

  if (!canActivateAdditionalUser(plan, activeUsers)) {
    throw new Error(userLimitMessage(plan));
  }

  const price = calculateMonthlyPrice(plan, activeUsers + 1);

  if (price.requiresUpgrade) {
    throw new Error(userLimitMessage(plan));
  }

  if (price.extraUsers > 0 && !confirmExtraUserCharge) {
    throw new Error(extraUserApprovalMessage(plan));
  }

  return price;
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
            const price = await validateUserActivation({
              tx,
              companyId: user.companyId,
              plan: activePlan,
              confirmExtraUserCharge: parsed.confirmExtraUserCharge,
            });

            if (price.extraUsers > 0) {
              extraUserMessage = extraUserSavedMessage(activePlan);
            }
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
            const price = await validateUserActivation({
              tx,
              companyId: user.companyId,
              plan: activePlan,
              confirmExtraUserCharge: parsed.confirmExtraUserCharge,
            });

            if (price.extraUsers > 0) {
              extraUserMessage = extraUserSavedMessage(activePlan);
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
    revalidatePath("/settings");
    return { ok: true, message: extraUserMessage ?? "Funcionario salvo." } as const;
  } catch (error) {
    return actionError(error, "Nao foi possivel salvar o funcionario.");
  }
}

export async function toggleEmployeeAction(id: string, isActive: boolean, confirmExtraUserCharge = false) {
  try {
    const user = await requireUser();
    assertCanManageTeam(user);
    const activePlan = assertCompanyHasActivePlan(user.company);

    if (id === user.id) {
      throw new Error("Voce nao pode inativar o proprio acesso.");
    }

    let successMessage = isActive ? "Funcionario ativado." : "Funcionario inativado.";

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
          const price = await validateUserActivation({
            tx,
            companyId: user.companyId,
            plan: activePlan,
            confirmExtraUserCharge,
          });

          if (price.extraUsers > 0) {
            successMessage = extraUserSavedMessage(activePlan);
          }
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
    revalidatePath("/settings");
    return { ok: true, message: successMessage } as const;
  } catch (error) {
    return actionError(error, "Nao foi possivel alterar o funcionario.");
  }
}
