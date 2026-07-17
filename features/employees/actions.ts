"use server";

import { Prisma, type SubscriptionPlan } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { actionError } from "@/lib/action-result";
import { recordActivity } from "@/lib/audit";
import { assertCanManageTeam } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { calculateMonthlyPrice, canActivateAdditionalUser, getPlanAccess, planDetails } from "@/lib/plans";
import { assertUserActionRateLimit } from "@/lib/rate-limit";
import { assertCompanyHasActivePlan } from "@/lib/subscription";
import { employeeSchema, idSchema } from "@/lib/validations";

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
    await assertUserActionRateLimit(user.id, "employees:save");

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
    let entityId = parsed.id ?? null;

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

          const result = await tx.user.updateMany({
            where: {
              id: parsed.id,
              companyId: user.companyId,
            },
            data: {
              ...data,
              ...(parsed.password ? { passwordHash: hashPassword(parsed.password) } : {}),
            },
          });

          if (result.count === 0) {
            throw new Error("Funcionario nao encontrado.");
          }
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

          const employee = await tx.user.create({
            data: {
              ...data,
              companyId: user.companyId,
              passwordHash: hashPassword(parsed.password ?? ""),
            },
          });
          entityId = employee.id;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    }

    await recordActivity({
      companyId: user.companyId,
      actorId: user.id,
      type: parsed.id ? "USER_UPDATED" : "USER_CREATED",
      entityType: "User",
      entityId,
      title: parsed.id ? "Funcionario atualizado" : "Funcionario criado",
      description: data.email,
      metadata: {
        role: data.role,
        isActive: data.isActive,
      },
    });

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
    await assertUserActionRateLimit(user.id, "employees:toggle");
    const parsedId = idSchema.parse(id);

    if (parsedId === user.id) {
      throw new Error("Voce nao pode inativar o proprio acesso.");
    }

    let successMessage = isActive ? "Funcionario ativado." : "Funcionario inativado.";

    await prisma.$transaction(
      async (tx) => {
        const existingEmployee = await tx.user.findFirst({
          where: {
            id: parsedId,
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

        const result = await tx.user.updateMany({
          where: {
            id: parsedId,
            companyId: user.companyId,
          },
          data: {
            isActive,
          },
        });

        if (result.count === 0) {
          throw new Error("Funcionario nao encontrado.");
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    await recordActivity({
      companyId: user.companyId,
      actorId: user.id,
      type: "USER_UPDATED",
      entityType: "User",
      entityId: parsedId,
      title: isActive ? "Funcionario ativado" : "Funcionario inativado",
    });

    revalidatePath("/employees");
    revalidatePath("/settings");
    return { ok: true, message: successMessage } as const;
  } catch (error) {
    return actionError(error, "Nao foi possivel alterar o funcionario.");
  }
}

export async function deleteEmployeeAction(id: string) {
  try {
    const user = await requireUser();
    assertCanManageTeam(user);
    assertCompanyHasActivePlan(user.company);
    await assertUserActionRateLimit(user.id, "employees:delete");
    const parsedId = idSchema.parse(id);

    if (parsedId === user.id) {
      throw new Error("Voce nao pode excluir o proprio acesso.");
    }

    let employeeName = "";

    await prisma.$transaction(async (tx) => {
      const employee = await tx.user.findFirst({
        where: {
          id: parsedId,
          companyId: user.companyId,
        },
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              assignedTasks: true,
              createdTasks: true,
              comments: true,
              attachments: true,
              goals: true,
              activityLogs: true,
              taskActivities: true,
              subscriptionEvents: true,
              reportSnapshots: true,
              supportTickets: true,
            },
          },
        },
      });

      if (!employee) {
        throw new Error("Funcionario nao encontrado.");
      }
      employeeName = employee.name;

      const blockers = [
        employee._count.assignedTasks ? `${employee._count.assignedTasks} tarefa(s) atribuida(s)` : null,
        employee._count.createdTasks ? `${employee._count.createdTasks} tarefa(s) criada(s)` : null,
        employee._count.comments ? `${employee._count.comments} comentario(s)` : null,
        employee._count.attachments ? `${employee._count.attachments} anexo(s)` : null,
        employee._count.goals ? `${employee._count.goals} meta(s)` : null,
        employee._count.activityLogs ? `${employee._count.activityLogs} registro(s) de atividade` : null,
        employee._count.taskActivities ? `${employee._count.taskActivities} historico(s) de tarefa` : null,
        employee._count.subscriptionEvents ? `${employee._count.subscriptionEvents} evento(s) de assinatura` : null,
        employee._count.reportSnapshots ? `${employee._count.reportSnapshots} relatorio(s)` : null,
        employee._count.supportTickets ? `${employee._count.supportTickets} chamado(s)` : null,
      ].filter(Boolean);

      if (blockers.length > 0) {
        throw new Error(
          `Nao foi possivel excluir ${employee.name}, pois existe historico vinculado: ${blockers.join(", ")}. Inative o acesso para preservar os dados da operacao.`,
        );
      }

      const result = await tx.user.deleteMany({
        where: {
          id: employee.id,
          companyId: user.companyId,
        },
      });

      if (result.count === 0) {
        throw new Error("Funcionario nao encontrado.");
      }
    });

    await recordActivity({
      companyId: user.companyId,
      actorId: user.id,
      type: "USER_UPDATED",
      entityType: "User",
      entityId: parsedId,
      title: "Funcionario excluido",
      description: employeeName,
    });

    revalidatePath("/employees");
    revalidatePath("/dashboard");
    revalidatePath("/settings");
    return { ok: true, message: "Funcionario excluido." } as const;
  } catch (error) {
    return actionError(error, "Nao foi possivel excluir o funcionario.");
  }
}
