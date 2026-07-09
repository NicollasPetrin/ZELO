import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth/password";

const prisma = new PrismaClient();
const passwordHash = hashPassword("123456");

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

async function ensurePlanCompany(input: DemoInput) {
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
}

async function main() {
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
  });

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
  });

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
      "Treinar gestores sobre rotina recorrente",
      "Mapear prioridades para novas funcionalidades",
    ],
    goalTitle: "Ativar controles avancados em todos os setores",
  });

  const users = await prisma.user.findMany({
    where: { email: { in: ["basico@demo.com", "gestao@demo.com", "completo@demo.com"] } },
    include: { company: true },
    orderBy: { email: "asc" },
  });

  console.log(users.map((user) => `${user.email} -> ${user.company.plan}`).join("\n"));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
