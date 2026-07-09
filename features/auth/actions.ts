"use server";

import { redirect } from "next/navigation";
import { createSession, deleteSession, getCurrentUser } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/client";
import { getPlanAccess, planDetails, planOrder } from "@/lib/plans";
import { loginSchema, signupSchema } from "@/lib/validations";

const DUMMY_PASSWORD_HASH = hashPassword("SenhaFalsaSegura123");
const DEFAULT_SIGNUP_PLAN = "BASIC" as const;
const DEFAULT_DEPARTMENTS = ["Gestao", "Operacao", "Atendimento"];

function featureKey(feature: string) {
  return feature
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirect("/login?error=preencha");
  }

  const user = await prisma.user.findUnique({
    where: {
      email: parsed.data.email,
    },
    include: {
      company: true,
    },
  });

  const passwordIsValid = verifyPassword(parsed.data.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);

  if (!user || !user.isActive || !user.company.isActive || !passwordIsValid) {
    redirect("/login?error=credenciais");
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function signupAction(formData: FormData) {
  const parsed = signupSchema.safeParse({
    companyName: formData.get("companyName"),
    segment: formData.get("segment"),
    ownerName: formData.get("ownerName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    redirect("/signup?error=dados");
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email: parsed.data.email,
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    redirect("/signup?error=email");
  }

  const userId = await prisma.$transaction(async (tx) => {
    const details = planDetails[DEFAULT_SIGNUP_PLAN];
    const access = getPlanAccess(DEFAULT_SIGNUP_PLAN);
    let planRecord = await tx.planCatalog.findUnique({
      where: {
        code: DEFAULT_SIGNUP_PLAN,
      },
    });

    if (!planRecord) {
      planRecord = await tx.planCatalog.create({
        data: {
          code: DEFAULT_SIGNUP_PLAN,
          name: details.name,
          label: details.label,
          description: details.description,
          priceCents: details.priceCents,
          pricePerExtraUser: details.pricePerExtraUserCents,
          includedUsers: details.includedUsers,
          maxUsers: details.maxUsers,
          dashboardName: access.dashboardName,
          isHighlighted: details.highlight,
          sortOrder: planOrder.indexOf(DEFAULT_SIGNUP_PLAN) + 1,
          features: {
            create: details.features.map((feature, index) => ({
              featureKey: featureKey(feature),
              name: feature,
              sortOrder: index + 1,
            })),
          },
        },
      });
    }

    const company = await tx.company.create({
      data: {
        name: parsed.data.companyName,
        segment: parsed.data.segment || null,
        email: parsed.data.email,
        employeeCount: 1,
        plan: DEFAULT_SIGNUP_PLAN,
        isActive: true,
      },
    });

    const managementDepartment = await tx.department.create({
      data: {
        companyId: company.id,
        name: DEFAULT_DEPARTMENTS[0],
        description: "Gestao geral da empresa.",
      },
    });

    await tx.department.createMany({
      data: DEFAULT_DEPARTMENTS.slice(1).map((name) => ({
        companyId: company.id,
        name,
        description: `Rotina de ${name.toLowerCase()} da empresa.`,
      })),
    });

    const owner = await tx.user.create({
      data: {
        companyId: company.id,
        departmentId: managementDepartment.id,
        name: parsed.data.ownerName,
        email: parsed.data.email,
        passwordHash: hashPassword(parsed.data.password),
        role: "OWNER",
        position: "Dono",
        isActive: true,
      },
    });

    const currentPeriodStart = new Date();
    const currentPeriodEnd = new Date(currentPeriodStart);
    currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30);

    await tx.companySubscription.create({
      data: {
        companyId: company.id,
        planId: planRecord.id,
        status: "ACTIVE",
        currentPeriodStart,
        currentPeriodEnd,
        events: {
          create: {
            actorId: owner.id,
            type: "SUBSCRIPTION_CHANGED",
            title: `Plano ${details.name} ativado`,
            description: "Conta criada pelo cadastro publico.",
          },
        },
      },
    });

    await tx.activityLog.create({
      data: {
        companyId: company.id,
        actorId: owner.id,
        type: "COMPANY_CREATED",
        entityType: "Company",
        entityId: company.id,
        title: "Empresa cadastrada",
        description: "Conta criada pelo cadastro publico.",
      },
    });

    return owner.id;
  });

  await createSession(userId);
  redirect("/dashboard");
}

export async function logoutAction() {
  await deleteSession();
  redirect("/login");
}

export async function redirectIfAuthenticated() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }
}
