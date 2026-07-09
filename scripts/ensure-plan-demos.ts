import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth/password";
import { getPlanAccess, planDetails, planOrder } from "../lib/plans";

const prisma = new PrismaClient();
const DEMO_PASSWORD = "DemoZelo123";
const passwordHash = hashPassword(DEMO_PASSWORD);

type PlanCode = "BASIC" | "MANAGEMENT" | "COMPLETE";

type DemoInput = {
  plan: PlanCode;
  companyName: string;
  segment: string;
  employeeCount: number;
  ownerEmail: string;
  ownerName: string;
  departmentNames: string[];
  taskTitles: string[];
  goalTitle: string;
};

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(17, 0, 0, 0);
  return date;
}

function featureKey(feature: string) {
  return feature
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function ensurePlanCatalog() {
  const plans = new Map<PlanCode, { id: string }>();

  for (const [index, plan] of planOrder.entries()) {
    const details = planDetails[plan];
    const access = getPlanAccess(plan);
    const planRecord = await prisma.planCatalog.upsert({
      where: {
        code: plan,
      },
      update: {
        name: details.name,
        label: details.label,
        description: details.description,
        priceCents: details.priceCents,
        pricePerExtraUser: details.pricePerExtraUserCents,
        includedUsers: details.includedUsers,
        maxUsers: access.maxUsers,
        dashboardName: access.dashboardName,
        isHighlighted: details.highlight,
        isActive: true,
        sortOrder: index + 1,
      },
      create: {
        code: plan,
        name: details.name,
        label: details.label,
        description: details.description,
        priceCents: details.priceCents,
        pricePerExtraUser: details.pricePerExtraUserCents,
        includedUsers: details.includedUsers,
        maxUsers: access.maxUsers,
        dashboardName: access.dashboardName,
        isHighlighted: details.highlight,
        isActive: true,
        sortOrder: index + 1,
      },
    });

    await Promise.all(
      details.features.map((feature, featureIndex) =>
        prisma.planFeature.upsert({
          where: {
            planId_featureKey: {
              planId: planRecord.id,
              featureKey: featureKey(feature),
            },
          },
          update: {
            name: feature,
            included: true,
            sortOrder: featureIndex + 1,
          },
          create: {
            planId: planRecord.id,
            featureKey: featureKey(feature),
            name: feature,
            included: true,
            sortOrder: featureIndex + 1,
          },
        }),
      ),
    );

    plans.set(plan, planRecord);
  }

  return plans;
}

async function ensureDepartment(companyId: string, name: string) {
  return prisma.department.upsert({
    where: { companyId_name: { companyId, name } },
    update: { isActive: true },
    create: {
      companyId,
      name,
      description: `Rotina de ${name.toLowerCase()} da empresa demo.`,
      isActive: true,
    },
  });
}

async function ensurePlanCompany(input: DemoInput, planCatalog: Map<PlanCode, { id: string }>) {
  const existingCompany = await prisma.company.findFirst({ where: { name: input.companyName } });
  const company = existingCompany
    ? await prisma.company.update({
        where: { id: existingCompany.id },
        data: { plan: input.plan, segment: input.segment, employeeCount: input.employeeCount, isActive: true },
      })
    : await prisma.company.create({
        data: {
          name: input.companyName,
          plan: input.plan,
          segment: input.segment,
          employeeCount: input.employeeCount,
          isActive: true,
        },
      });

  const departments = [];

  for (const name of input.departmentNames) {
    departments.push(await ensureDepartment(company.id, name));
  }

  const primaryDepartment = departments[0] ?? (await ensureDepartment(company.id, "Gestao"));
  const secondaryDepartment = departments[1] ?? primaryDepartment;

  const owner = await prisma.user.upsert({
    where: { email: input.ownerEmail },
    update: {
      companyId: company.id,
      departmentId: primaryDepartment.id,
      name: input.ownerName,
      passwordHash,
      role: "OWNER",
      position: "Acesso generico",
      isActive: true,
    },
    create: {
      companyId: company.id,
      departmentId: primaryDepartment.id,
      name: input.ownerName,
      email: input.ownerEmail,
      passwordHash,
      role: "OWNER",
      position: "Acesso generico",
      isActive: true,
    },
  });

  const operatorEmail = `operacao.${input.ownerEmail}`;
  const operator = await prisma.user.upsert({
    where: { email: operatorEmail },
    update: {
      companyId: company.id,
      departmentId: secondaryDepartment.id,
      passwordHash,
      isActive: true,
    },
    create: {
      companyId: company.id,
      departmentId: secondaryDepartment.id,
      name: `Operacao ${input.companyName}`,
      email: operatorEmail,
      passwordHash,
      role: "EMPLOYEE",
      position: "Funcionario demo",
      isActive: true,
    },
  });

  for (const [index, title] of input.taskTitles.entries()) {
    const exists = await prisma.task.findFirst({ where: { companyId: company.id, title } });

    if (!exists) {
      const department = departments[index % departments.length] ?? primaryDepartment;

      await prisma.task.create({
        data: {
          companyId: company.id,
          departmentId: department.id,
          assigneeId: index % 2 === 0 ? operator.id : owner.id,
          creatorId: owner.id,
          title,
          description: `Atividade criada para demonstrar o Plano ${input.plan}.`,
          dueDate: daysFromNow(index === 0 ? -1 : index + 1),
          priority: index === 0 ? "HIGH" : "MEDIUM",
          status: index === 0 ? "OVERDUE" : "PENDING",
        },
      });
    }
  }

  const goalExists = await prisma.goal.findFirst({ where: { companyId: company.id, title: input.goalTitle } });

  if (goalExists) {
    await prisma.goal.update({
      where: { id: goalExists.id },
      data: {
        departmentId: input.plan === "BASIC" ? null : primaryDepartment.id,
        responsibleId: input.plan === "BASIC" ? null : owner.id,
      },
    });
  } else {
    await prisma.goal.create({
      data: {
        companyId: company.id,
        departmentId: input.plan === "BASIC" ? null : primaryDepartment.id,
        responsibleId: input.plan === "BASIC" ? null : owner.id,
        title: input.goalTitle,
        description: "Meta demo para acompanhar a evolucao da operacao.",
        targetValue: 100,
        currentValue: input.plan === "BASIC" ? 42 : input.plan === "MANAGEMENT" ? 68 : 81,
        unit: "PERCENT",
        period: "MONTHLY",
        status: input.plan === "BASIC" ? "ATTENTION" : "ON_TRACK",
        startDate: daysFromNow(-8),
        endDate: daysFromNow(22),
      },
    });
  }

  const planRecord = planCatalog.get(input.plan);

  if (!planRecord) {
    throw new Error(`Plano ${input.plan} nao encontrado no catalogo.`);
  }

  const periodStart = daysFromNow(-3);
  const periodEnd = daysFromNow(27);
  const existingSubscription = await prisma.companySubscription.findFirst({
    where: {
      companyId: company.id,
      status: "ACTIVE",
    },
  });
  const subscription = existingSubscription
    ? await prisma.companySubscription.update({
        where: {
          id: existingSubscription.id,
        },
        data: {
          planId: planRecord.id,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          canceledAt: null,
        },
      })
    : await prisma.companySubscription.create({
        data: {
          companyId: company.id,
          planId: planRecord.id,
          status: "ACTIVE",
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        },
      });

  const paymentMethod = await prisma.paymentMethod.upsert({
    where: {
      id: `${company.id}-demo-payment-method`,
    },
    update: {
      isDefault: true,
      holderName: input.ownerName,
    },
    create: {
      id: `${company.id}-demo-payment-method`,
      companyId: company.id,
      type: "DEMO",
      provider: "Demo",
      holderName: input.ownerName,
      isDefault: true,
    },
  });

  await prisma.invoice.upsert({
    where: {
      number: `DEMO-${input.plan}`,
    },
    update: {
      companyId: company.id,
      subscriptionId: subscription.id,
      paymentMethodId: paymentMethod.id,
      amountCents: planDetails[input.plan].priceCents,
      periodStart,
      periodEnd,
      status: "PAID",
    },
    create: {
      companyId: company.id,
      subscriptionId: subscription.id,
      paymentMethodId: paymentMethod.id,
      number: `DEMO-${input.plan}`,
      status: "PAID",
      amountCents: planDetails[input.plan].priceCents,
      dueDate: daysFromNow(-1),
      paidAt: daysFromNow(-2),
      periodStart,
      periodEnd,
      description: `Mensalidade demo do Plano ${planDetails[input.plan].name}`,
    },
  });

  await prisma.usageSnapshot.create({
    data: {
      companyId: company.id,
      subscriptionId: subscription.id,
      activeUsers: await prisma.user.count({ where: { companyId: company.id, isActive: true } }),
      departments: await prisma.department.count({ where: { companyId: company.id, isActive: true } }),
      tasks: await prisma.task.count({ where: { companyId: company.id } }),
      goals: await prisma.goal.count({ where: { companyId: company.id } }),
      storageMb: 0,
    },
  });
}

async function main() {
  const planCatalog = await ensurePlanCatalog();

  await ensurePlanCompany({
    plan: "BASIC",
    companyName: "Demo Plano Basico",
    segment: "Servicos locais",
    employeeCount: 5,
    ownerEmail: "basico@demo.com",
    ownerName: "Dono Plano Basico",
    departmentNames: ["Gestao", "Operacao", "Atendimento"],
    taskTitles: [
      "Definir responsavel por cada tarefa da semana",
      "Atualizar prazos das entregas em aberto",
      "Comentar pendencias do atendimento",
    ],
    goalTitle: "Organizar 80% da rotina no mes",
  }, planCatalog);

  await ensurePlanCompany({
    plan: "MANAGEMENT",
    companyName: "Mercado Boa Gestao",
    segment: "Varejo alimenticio",
    employeeCount: 18,
    ownerEmail: "gestao@demo.com",
    ownerName: "Demo Plano Gestao",
    departmentNames: ["Gestao", "Operacao", "Atendimento", "Financeiro"],
    taskTitles: ["Revisar rotina semanal da equipe gestora"],
    goalTitle: "Concluir 90% das tarefas no prazo",
  }, planCatalog);

  await ensurePlanCompany({
    plan: "COMPLETE",
    companyName: "Demo Plano Completo",
    segment: "Clinica multidisciplinar",
    employeeCount: 48,
    ownerEmail: "completo@demo.com",
    ownerName: "Dono Plano Completo",
    departmentNames: ["Gestao", "Operacao", "Financeiro", "Atendimento", "Administrativo"],
    taskTitles: [
      "Revisar estrutura mensal de tarefas e metas",
      "Preparar relatorio gerencial da operacao",
      "Configurar rotina recorrente dos setores",
      "Mapear prioridades para novas funcionalidades",
    ],
    goalTitle: "Ativar controles avancados em todos os setores",
  }, planCatalog);

  const users = await prisma.user.findMany({
    where: { email: { in: ["basico@demo.com", "gestao@demo.com", "completo@demo.com"] } },
    include: { company: true },
    orderBy: { email: "asc" },
  });

  console.log(users.map((user) => `${user.email} -> ${user.company.plan}`).join("\n"));
  console.log(`Senha: ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
