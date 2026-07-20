import { PrismaClient, type TaskPriority, type TaskStatus } from "@prisma/client";
import { hashPassword } from "../lib/auth/password";

const prisma = new PrismaClient();
const COMPANY_NAME = "Zelo Load Test";
const LOAD_PASSWORD = "LoadZelo1234";

function readIntArg(name: string, fallback: number, max: number) {
  const index = process.argv.indexOf(`--${name}`);
  const raw = index >= 0 ? process.argv[index + 1] : undefined;
  const value = raw ? Number(raw) : fallback;

  if (!Number.isSafeInteger(value) || value < 1 || value > max) {
    throw new Error(`--${name} deve ser um inteiro entre 1 e ${max}.`);
  }

  return value;
}

function chunks<T>(items: T[], size: number) {
  const result: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }

  return result;
}

async function main() {
  if (process.env.LOAD_SEED_CONFIRM !== "ZELO_STAGING") {
    throw new Error("Seed bloqueado. Use apenas em staging com LOAD_SEED_CONFIRM=ZELO_STAGING.");
  }

  const targetUsers = readIntArg("users", 1_000, 5_000);
  const targetTasks = readIntArg("tasks", 20_000, 100_000);
  const completePlan = await prisma.planCatalog.findUnique({ where: { code: "COMPLETE" } });

  if (!completePlan) {
    throw new Error("Plano Completo nao encontrado. Aplique as migrations e o seed base primeiro.");
  }

  let company = await prisma.company.findFirst({ where: { name: COMPANY_NAME } });

  if (!company) {
    company = await prisma.company.create({
      data: {
        name: COMPANY_NAME,
        email: "load-test@zelo.invalid",
        segment: "Teste de carga",
        plan: "COMPLETE",
      },
    });
  }

  const departmentNames = ["Operacao", "Vendas", "Financeiro", "Atendimento", "Administrativo"];
  const departments = await Promise.all(
    departmentNames.map((name) =>
      prisma.department.upsert({
        where: { companyId_name: { companyId: company.id, name } },
        update: { isActive: true },
        create: { companyId: company.id, name, isActive: true },
      }),
    ),
  );

  const passwordHash = hashPassword(LOAD_PASSWORD);
  const owner = await prisma.user.upsert({
    where: { email: "load.owner@zelo.invalid" },
    update: { companyId: company.id, isActive: true, role: "OWNER" },
    create: {
      companyId: company.id,
      departmentId: departments[0].id,
      name: "Load Test Owner",
      email: "load.owner@zelo.invalid",
      passwordHash,
      role: "OWNER",
      position: "Teste de carga",
    },
  });

  const employeeRows = Array.from({ length: Math.max(0, targetUsers - 1) }, (_, index) => ({
    companyId: company.id,
    departmentId: departments[index % departments.length].id,
    name: `Usuario de Carga ${String(index + 1).padStart(4, "0")}`,
    email: `load.user${String(index + 1).padStart(4, "0")}@zelo.invalid`,
    passwordHash,
    role: index % 20 === 0 ? ("MANAGER" as const) : ("EMPLOYEE" as const),
    position: "Usuario sintetico",
    isActive: true,
  }));

  for (const batch of chunks(employeeRows, 500)) {
    await prisma.user.createMany({ data: batch, skipDuplicates: true });
  }

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  const activeSubscription = await prisma.companySubscription.findFirst({
    where: { companyId: company.id, status: "ACTIVE" },
  });

  if (!activeSubscription) {
    await prisma.companySubscription.create({
      data: {
        companyId: company.id,
        planId: completePlan.id,
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });
  }

  const users = await prisma.user.findMany({
    where: { companyId: company.id, isActive: true },
    select: { id: true },
    orderBy: { email: "asc" },
    take: targetUsers,
  });
  const existingTaskCount = await prisma.task.count({ where: { companyId: company.id } });
  const missingTaskCount = Math.max(0, targetTasks - existingTaskCount);
  const priorities: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
  const statuses: TaskStatus[] = ["PENDING", "IN_PROGRESS", "IN_REVIEW", "COMPLETED", "OVERDUE"];
  const taskRows = Array.from({ length: missingTaskCount }, (_, offset) => {
    const index = existingTaskCount + offset;
    const status = statuses[index % statuses.length];
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + (index % 61) - 30);

    return {
      companyId: company.id,
      departmentId: departments[index % departments.length].id,
      assigneeId: users[index % users.length].id,
      creatorId: owner.id,
      title: `Tarefa sintetica ${String(index + 1).padStart(6, "0")}`,
      description: "Registro gerado exclusivamente para validar desempenho em ambiente de staging.",
      dueDate,
      priority: priorities[index % priorities.length],
      status,
      completedAt: status === "COMPLETED" ? now : null,
    };
  });

  for (const batch of chunks(taskRows, 500)) {
    await prisma.task.createMany({ data: batch });
  }

  console.log(`Empresa: ${COMPANY_NAME}`);
  console.log(`Usuarios ativos: ${await prisma.user.count({ where: { companyId: company.id, isActive: true } })}`);
  console.log(`Tarefas: ${await prisma.task.count({ where: { companyId: company.id } })}`);
  console.log("Login de staging: load.owner@zelo.invalid / LoadZelo1234");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
