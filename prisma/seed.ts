import {
  PrismaClient,
  type SubscriptionPlan,
  type TaskPriority,
  type TaskStatus,
  type UserRole,
} from "@prisma/client";
import { hashPassword } from "../lib/auth/password";
import { getPlanAccess, planDetails, planOrder } from "../lib/plans";

const prisma = new PrismaClient();
const DEMO_PASSWORD = "DemoZelo123";
const passwordHash = hashPassword(DEMO_PASSWORD);

const planPrices: Record<SubscriptionPlan, number> = {
  BASIC: 5990,
  MANAGEMENT: 24990,
  COMPLETE: 59990,
};

const defaultDepartments = ["Vendas", "Financeiro", "Atendimento", "Estoque", "Operacao", "Administrativo", "Gestao"];

type DemoCompanyInput = {
  plan: SubscriptionPlan;
  companyName: string;
  segment: string;
  document: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  employeeCount: number;
  ownerName: string;
  ownerEmail: string;
  ownerPosition: string;
  departmentNames: string[];
  members: Array<{
    name: string;
    email: string;
    role: UserRole;
    departmentName: string;
    position: string;
  }>;
  tasks: Array<{
    title: string;
    description: string;
    assigneeEmail: string;
    creatorEmail?: string;
    departmentName: string;
    dueInDays: number;
    priority: TaskPriority;
    status: TaskStatus;
    recurring?: boolean;
  }>;
  goals: Array<{
    title: string;
    description: string;
    departmentName?: string;
    responsibleEmail?: string;
    targetValue: number;
    currentValue: number;
    unit: "BRL" | "PERCENT" | "NUMBER" | "TASKS" | "CLIENTS" | "SALES";
    status: "ON_TRACK" | "ATTENTION" | "LATE" | "COMPLETED";
  }>;
};

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(17, 0, 0, 0);
  return date;
}

function asJson(value: unknown) {
  return JSON.stringify(value);
}

async function resetDatabase() {
  await prisma.supportTicket.deleteMany();
  await prisma.reportSnapshot.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.usageSnapshot.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.paymentMethod.deleteMany();
  await prisma.subscriptionEvent.deleteMany();
  await prisma.companySubscription.deleteMany();
  await prisma.onboardingStep.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.taskAttachment.deleteMany();
  await prisma.taskComment.deleteMany();
  await prisma.taskActivity.deleteMany();
  await prisma.recurrenceRule.deleteMany();
  await prisma.task.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
  await prisma.company.deleteMany();
  await prisma.planFeature.deleteMany();
  await prisma.planCatalog.deleteMany();
}

async function seedPlans() {
  const plans = new Map<SubscriptionPlan, { id: string }>();

  for (const [index, plan] of planOrder.entries()) {
    const details = planDetails[plan];
    const access = getPlanAccess(plan);
    const catalogPlan = await prisma.planCatalog.create({
      data: {
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
        sortOrder: index + 1,
        features: {
          create: details.features.map((feature, featureIndex) => ({
            featureKey: feature
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/(^-|-$)/g, ""),
            name: feature,
            sortOrder: featureIndex + 1,
          })),
        },
      },
    });

    plans.set(plan, catalogPlan);
  }

  return plans;
}

async function createSubscriptionStack({
  companyId,
  ownerId,
  plan,
  plans,
  activeUsers,
  departments,
  tasks,
  goals,
}: {
  companyId: string;
  ownerId: string;
  plan: SubscriptionPlan;
  plans: Map<SubscriptionPlan, { id: string }>;
  activeUsers: number;
  departments: number;
  tasks: number;
  goals: number;
}) {
  const planRecord = plans.get(plan);

  if (!planRecord) {
    throw new Error(`Plano ${plan} nao foi cadastrado no catalogo.`);
  }

  const periodStart = daysFromNow(-15);
  const periodEnd = daysFromNow(15);
  const paymentMethod = await prisma.paymentMethod.create({
    data: {
      companyId,
      type: plan === "BASIC" ? "PIX" : "DEMO",
      provider: plan === "BASIC" ? "Pix Banco Demo" : "Ambiente demo",
      brand: plan === "BASIC" ? null : "Demo",
      last4: plan === "BASIC" ? null : plan === "MANAGEMENT" ? "0374" : "0999",
      holderName: "Responsavel financeiro",
      isDefault: true,
    },
  });
  const subscription = await prisma.companySubscription.create({
    data: {
      companyId,
      planId: planRecord.id,
      status: "ACTIVE",
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      events: {
        create: {
          actorId: ownerId,
          type: "SUBSCRIPTION_CHANGED",
          title: `Assinatura Plano ${planDetails[plan].name} ativada`,
          description: "Registro automatico criado pelo seed completo.",
        },
      },
    },
  });

  await prisma.invoice.create({
    data: {
      companyId,
      subscriptionId: subscription.id,
      paymentMethodId: paymentMethod.id,
      number: `ZL-${plan}-${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, "0")}`,
      status: "PAID",
      amountCents: planPrices[plan],
      dueDate: daysFromNow(-3),
      paidAt: daysFromNow(-4),
      periodStart,
      periodEnd,
      description: `Mensalidade do Plano ${planDetails[plan].name}`,
    },
  });

  await prisma.usageSnapshot.create({
    data: {
      companyId,
      subscriptionId: subscription.id,
      activeUsers,
      departments,
      tasks,
      goals,
      storageMb: plan === "COMPLETE" ? 920 : plan === "MANAGEMENT" ? 340 : 90,
    },
  });

  return subscription;
}

async function createDemoCompany(input: DemoCompanyInput, plans: Map<SubscriptionPlan, { id: string }>) {
  const company = await prisma.company.create({
    data: {
      name: input.companyName,
      segment: input.segment,
      document: input.document,
      phone: input.phone,
      email: input.email,
      city: input.city,
      state: input.state,
      employeeCount: input.employeeCount,
      plan: input.plan,
      isDemo: true,
      isActive: true,
    },
  });

  const departments = new Map<string, { id: string }>();

  for (const name of input.departmentNames) {
    const department = await prisma.department.create({
      data: {
        companyId: company.id,
        name,
        description: `Rotina de ${name.toLowerCase()} da empresa.`,
      },
    });
    departments.set(name, department);
  }

  const primaryDepartment = departments.get(input.departmentNames[0]);

  if (!primaryDepartment) {
    throw new Error(`Empresa ${input.companyName} precisa de pelo menos um setor.`);
  }

  const owner = await prisma.user.create({
    data: {
      companyId: company.id,
      departmentId: primaryDepartment.id,
      name: input.ownerName,
      email: input.ownerEmail,
      passwordHash,
      role: "OWNER",
      position: input.ownerPosition,
    },
  });
  const users = new Map<string, { id: string; name: string }>([[input.ownerEmail, owner]]);

  for (const member of input.members) {
    const department = departments.get(member.departmentName) ?? primaryDepartment;
    const user = await prisma.user.create({
      data: {
        companyId: company.id,
        departmentId: department.id,
        name: member.name,
        email: member.email,
        passwordHash,
        role: member.role,
        position: member.position,
      },
    });
    users.set(member.email, user);
  }

  for (const taskInput of input.tasks) {
    const assignee = users.get(taskInput.assigneeEmail) ?? owner;
    const creator = users.get(taskInput.creatorEmail ?? input.ownerEmail) ?? owner;
    const department = departments.get(taskInput.departmentName) ?? primaryDepartment;
    const task = await prisma.task.create({
      data: {
        companyId: company.id,
        departmentId: department.id,
        assigneeId: assignee.id,
        creatorId: creator.id,
        title: taskInput.title,
        description: taskInput.description,
        dueDate: daysFromNow(taskInput.dueInDays),
        priority: taskInput.priority,
        status: taskInput.status,
        completedAt: taskInput.status === "COMPLETED" ? daysFromNow(taskInput.dueInDays) : null,
      },
    });

    await prisma.taskActivity.create({
      data: {
        taskId: task.id,
        actorId: creator.id,
        type: "TASK_CREATED",
        toStatus: taskInput.status,
        description: `Tarefa criada para ${assignee.name}.`,
      },
    });

    await prisma.taskComment.create({
      data: {
        taskId: task.id,
        authorId: assignee.id,
        text: taskInput.status === "COMPLETED" ? "Concluido e conferido." : "Vou atualizar esta pendencia ainda hoje.",
      },
    });

    if (taskInput.recurring) {
      await prisma.recurrenceRule.create({
        data: {
          taskId: task.id,
          type: "MONTHLY",
          startDate: new Date(),
          monthDay: 5,
        },
      });
    }
  }

  for (const goalInput of input.goals) {
    const department = goalInput.departmentName ? departments.get(goalInput.departmentName) : null;
    const responsible = goalInput.responsibleEmail ? users.get(goalInput.responsibleEmail) : null;

    await prisma.goal.create({
      data: {
        companyId: company.id,
        departmentId: input.plan === "BASIC" ? null : department?.id,
        responsibleId: input.plan === "BASIC" ? null : responsible?.id,
        title: goalInput.title,
        description: goalInput.description,
        targetValue: goalInput.targetValue,
        currentValue: goalInput.currentValue,
        unit: goalInput.unit,
        period: "MONTHLY",
        status: goalInput.status,
        startDate: daysFromNow(-10),
        endDate: daysFromNow(20),
      },
    });
  }

  const [activeUsers, departmentCount, taskCount, goalCount] = await Promise.all([
    prisma.user.count({ where: { companyId: company.id, isActive: true } }),
    prisma.department.count({ where: { companyId: company.id, isActive: true } }),
    prisma.task.count({ where: { companyId: company.id } }),
    prisma.goal.count({ where: { companyId: company.id } }),
  ]);

  await createSubscriptionStack({
    companyId: company.id,
    ownerId: owner.id,
    plan: input.plan,
    plans,
    activeUsers,
    departments: departmentCount,
    tasks: taskCount,
    goals: goalCount,
  });

  await prisma.reportSnapshot.create({
    data: {
      companyId: company.id,
      createdById: owner.id,
      type: input.plan === "COMPLETE" ? "EXECUTIVE" : "HEALTH",
      title: `Snapshot executivo - ${input.companyName}`,
      summary: "Resumo consolidado de tarefas, metas, setores e responsaveis.",
      healthScore: input.plan === "BASIC" ? 58 : input.plan === "MANAGEMENT" ? 74 : 86,
      payload: asJson({
        activeUsers,
        departmentCount,
        taskCount,
        goalCount,
      }),
    },
  });

  await prisma.activityLog.createMany({
    data: [
      {
        companyId: company.id,
        actorId: owner.id,
        type: "COMPANY_CREATED",
        entityType: "Company",
        entityId: company.id,
        title: "Empresa cadastrada",
        description: "Empresa demo criada no banco completo.",
      },
      {
        companyId: company.id,
        actorId: owner.id,
        type: "SUBSCRIPTION_CHANGED",
        entityType: "CompanySubscription",
        title: `Plano ${planDetails[input.plan].name} ativo`,
        description: "Assinatura vinculada ao catalogo de planos.",
        metadata: asJson({ plan: input.plan }),
      },
      {
        companyId: company.id,
        actorId: owner.id,
        type: "REPORT_GENERATED",
        entityType: "ReportSnapshot",
        title: "Relatorio executivo gerado",
        description: "Snapshot criado para consultas historicas.",
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        companyId: company.id,
        userId: owner.id,
        type: "TASK_DUE_SOON",
        title: "Banco demo completo",
        message: `Dados do Plano ${planDetails[input.plan].name} estao prontos para teste.`,
        link: "/dashboard",
      },
      {
        companyId: company.id,
        userId: owner.id,
        type: "GOAL_ATTENTION",
        title: "Indicadores atualizados",
        message: "Confira metas, tarefas e riscos operacionais nos paineis da plataforma.",
        link: input.plan === "BASIC" ? "/goals" : "/reports",
      },
    ],
  });

  await prisma.supportTicket.create({
    data: {
      companyId: company.id,
      requesterId: owner.id,
      title: input.plan === "COMPLETE" ? "Duvida sobre relatorios completos" : "Duvida sobre configuracao inicial",
      description: "Ticket demo para demonstrar historico de suporte por empresa.",
      status: input.plan === "COMPLETE" ? "IN_PROGRESS" : "RESOLVED",
      priority: input.plan === "COMPLETE" ? "HIGH" : "MEDIUM",
    },
  });

  return company;
}

async function main() {
  await resetDatabase();
  const plans = await seedPlans();

  await createDemoCompany(
    {
      plan: "MANAGEMENT",
      companyName: "Mercado Boa Gestao",
      segment: "Varejo alimenticio",
      document: "12.345.678/0001-90",
      phone: "(11) 4002-2030",
      email: "financeiro@boagestao.demo",
      city: "Sao Paulo",
      state: "SP",
      employeeCount: 18,
      ownerName: "Demo Plano Gestao",
      ownerEmail: "gestao@demo.com",
      ownerPosition: "Dono",
      departmentNames: defaultDepartments,
      members: [
        { name: "Ana Silva", email: "ana@demo.com", role: "OWNER", departmentName: "Gestao", position: "Dona" },
        { name: "Carlos Lima", email: "carlos@demo.com", role: "MANAGER", departmentName: "Operacao", position: "Gerente operacional" },
        { name: "Joao Souza", email: "joao@demo.com", role: "EMPLOYEE", departmentName: "Estoque", position: "Auxiliar de estoque" },
        { name: "Maria Costa", email: "maria@demo.com", role: "EMPLOYEE", departmentName: "Atendimento", position: "Atendente" },
      ],
      tasks: [
        {
          title: "Conferir validade dos produtos do corredor 2",
          description: "Revisar gondolas, separar itens proximos do vencimento e registrar pendencias.",
          assigneeEmail: "joao@demo.com",
          creatorEmail: "gestao@demo.com",
          departmentName: "Estoque",
          dueInDays: -2,
          priority: "URGENT",
          status: "OVERDUE",
        },
        {
          title: "Atualizar lista de fornecedores ativos",
          description: "Confirmar contatos, prazos de entrega e responsaveis de cada fornecedor.",
          assigneeEmail: "carlos@demo.com",
          departmentName: "Administrativo",
          dueInDays: 4,
          priority: "MEDIUM",
          status: "IN_PROGRESS",
          recurring: true,
        },
        {
          title: "Ligar para clientes com pedidos pendentes",
          description: "Entrar em contato com clientes que deixaram pedidos reservados no atendimento.",
          assigneeEmail: "maria@demo.com",
          departmentName: "Atendimento",
          dueInDays: 1,
          priority: "HIGH",
          status: "PENDING",
        },
        {
          title: "Fechar caixa semanal",
          description: "Conferir entradas, divergencias e comprovantes antes da reuniao de segunda.",
          assigneeEmail: "carlos@demo.com",
          departmentName: "Financeiro",
          dueInDays: -1,
          priority: "HIGH",
          status: "OVERDUE",
        },
        {
          title: "Organizar vitrine de promocoes",
          description: "Trocar etiquetas, destacar itens com maior giro e fotografar a vitrine pronta.",
          assigneeEmail: "joao@demo.com",
          departmentName: "Vendas",
          dueInDays: 0,
          priority: "LOW",
          status: "COMPLETED",
        },
      ],
      goals: [
        {
          title: "Vender R$ 50.000 no mes",
          description: "Meta comercial principal do mes.",
          departmentName: "Vendas",
          responsibleEmail: "gestao@demo.com",
          targetValue: 50000,
          currentValue: 32750,
          unit: "BRL",
          status: "ON_TRACK",
        },
        {
          title: "Concluir 90% das tarefas no prazo",
          description: "Melhorar previsibilidade da operacao.",
          departmentName: "Operacao",
          responsibleEmail: "carlos@demo.com",
          targetValue: 90,
          currentValue: 72,
          unit: "PERCENT",
          status: "ATTENTION",
        },
      ],
    },
    plans,
  );

  await createDemoCompany(
    {
      plan: "BASIC",
      companyName: "Demo Plano Basico",
      segment: "Servicos locais",
      document: "98.765.432/0001-10",
      phone: "(21) 3003-1000",
      email: "contato@basicodemo.local",
      city: "Rio de Janeiro",
      state: "RJ",
      employeeCount: 5,
      ownerName: "Dono Plano Basico",
      ownerEmail: "basico@demo.com",
      ownerPosition: "Dono",
      departmentNames: ["Gestao", "Operacao", "Atendimento"],
      members: [
        { name: "Operacao Demo Basico", email: "operacao.basico@demo.com", role: "EMPLOYEE", departmentName: "Operacao", position: "Funcionario demo" },
      ],
      tasks: [
        {
          title: "Definir responsavel por cada tarefa da semana",
          description: "Centralizar combinados basicos da equipe.",
          assigneeEmail: "operacao.basico@demo.com",
          departmentName: "Operacao",
          dueInDays: -1,
          priority: "HIGH",
          status: "OVERDUE",
        },
        {
          title: "Atualizar prazos das entregas em aberto",
          description: "Revisar pendencias e ajustar prazos.",
          assigneeEmail: "basico@demo.com",
          departmentName: "Gestao",
          dueInDays: 3,
          priority: "MEDIUM",
          status: "PENDING",
        },
        {
          title: "Comentar pendencias do atendimento",
          description: "Registrar observacoes em cada tarefa.",
          assigneeEmail: "operacao.basico@demo.com",
          departmentName: "Atendimento",
          dueInDays: 5,
          priority: "LOW",
          status: "PENDING",
        },
      ],
      goals: [
        {
          title: "Organizar 80% da rotina no mes",
          description: "Meta simples para iniciar a rotina.",
          targetValue: 80,
          currentValue: 42,
          unit: "PERCENT",
          status: "ATTENTION",
        },
      ],
    },
    plans,
  );

  await createDemoCompany(
    {
      plan: "COMPLETE",
      companyName: "Demo Plano Completo",
      segment: "Clinica multidisciplinar",
      document: "45.678.901/0001-55",
      phone: "(31) 3555-9090",
      email: "direcao@completodemo.local",
      city: "Belo Horizonte",
      state: "MG",
      employeeCount: 48,
      ownerName: "Dono Plano Completo",
      ownerEmail: "completo@demo.com",
      ownerPosition: "Direcao",
      departmentNames: ["Gestao", "Operacao", "Financeiro", "Atendimento", "Administrativo", "Comercial"],
      members: [
        { name: "Marina Gestora", email: "marina.completo@demo.com", role: "MANAGER", departmentName: "Operacao", position: "Gerente de operacao" },
        { name: "Rafael Financeiro", email: "rafael.completo@demo.com", role: "MANAGER", departmentName: "Financeiro", position: "Coordenador financeiro" },
        { name: "Equipe Atendimento", email: "atendimento.completo@demo.com", role: "EMPLOYEE", departmentName: "Atendimento", position: "Atendimento" },
        { name: "Equipe Comercial", email: "comercial.completo@demo.com", role: "EMPLOYEE", departmentName: "Comercial", position: "Consultor comercial" },
      ],
      tasks: [
        {
          title: "Revisar alertas do painel executivo",
          description: "Conferir atrasos, metas em risco e gargalos por setor.",
          assigneeEmail: "marina.completo@demo.com",
          departmentName: "Gestao",
          dueInDays: -1,
          priority: "URGENT",
          status: "OVERDUE",
          recurring: true,
        },
        {
          title: "Preparar relatorio gerencial da operacao",
          description: "Consolidar atrasos, metas e prioridades por setor.",
          assigneeEmail: "completo@demo.com",
          departmentName: "Gestao",
          dueInDays: 2,
          priority: "HIGH",
          status: "IN_PROGRESS",
        },
        {
          title: "Configurar automacoes recorrentes",
          description: "Padronizar tarefas que precisam voltar todo mes dentro da plataforma.",
          assigneeEmail: "marina.completo@demo.com",
          departmentName: "Operacao",
          dueInDays: 6,
          priority: "MEDIUM",
          status: "PENDING",
        },
        {
          title: "Mapear prioridades para novas funcionalidades",
          description: "Registrar melhorias com prioridade de produto.",
          assigneeEmail: "rafael.completo@demo.com",
          departmentName: "Administrativo",
          dueInDays: 8,
          priority: "MEDIUM",
          status: "IN_REVIEW",
        },
        {
          title: "Conferir agenda de atendimento do mes",
          description: "Reduzir remarcacoes e gargalos da recepcao.",
          assigneeEmail: "atendimento.completo@demo.com",
          departmentName: "Atendimento",
          dueInDays: 4,
          priority: "HIGH",
          status: "PENDING",
        },
      ],
      goals: [
        {
          title: "Ativar controles avancados em todos os setores",
          description: "Meta de uso dos paineis e filtros completos.",
          departmentName: "Gestao",
          responsibleEmail: "completo@demo.com",
          targetValue: 100,
          currentValue: 81,
          unit: "PERCENT",
          status: "ON_TRACK",
        },
        {
          title: "Reduzir tarefas atrasadas para menos de 3",
          description: "Indicador operacional exibido nos relatorios completos.",
          departmentName: "Operacao",
          responsibleEmail: "marina.completo@demo.com",
          targetValue: 3,
          currentValue: 5,
          unit: "TASKS",
          status: "ATTENTION",
        },
        {
          title: "Manter satisfacao acima de 92%",
          description: "Indicador de atendimento premium.",
          departmentName: "Atendimento",
          responsibleEmail: "atendimento.completo@demo.com",
          targetValue: 92,
          currentValue: 94,
          unit: "PERCENT",
          status: "ON_TRACK",
        },
      ],
    },
    plans,
  );

  console.log("Seed completo concluido.");
  console.log(`Logins: basico@demo.com, gestao@demo.com, completo@demo.com / senha ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
