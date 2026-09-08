"use server";

import { redirect } from "next/navigation";
import { parsePhone } from "@/lib/phone";
import { createSession, deleteSession, getCurrentUser } from "@/lib/auth/session";
import { hashPassword, needsRehash, verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/client";
import { parseDocument } from "@/lib/document";
import { readText } from "@/lib/form-data";
import { assertIpRateLimit, assertRateLimit } from "@/lib/rate-limit";
import { loginSchema, signupSchema } from "@/lib/validations";

const DUMMY_PASSWORD_HASH = hashPassword("SenhaFalsaSegura123");
const DEFAULT_DEPARTMENTS = ["Gestao", "Operacao", "Atendimento"];

export async function loginAction(formData: FormData) {
  try {
    await assertIpRateLimit("login", 10, 15 * 60_000);
  } catch {
    redirect("/login?error=rate");
  }

  const parsed = loginSchema.safeParse({
    email: readText(formData, "email"),
    password: readText(formData, "password"),
  });

  if (!parsed.success) {
    redirect("/login?error=preencha");
  }

  try {
    await assertRateLimit({
      key: `login:email:${parsed.data.email}`,
      limit: 8,
      windowMs: 15 * 60_000,
    });
  } catch {
    redirect("/login?error=rate");
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

  // O login e o unico momento em que a senha em claro existe aqui, entao e a
  // unica chance de reescrever um hash em formato fraco. Sem isto, uma conta
  // antiga guarda para sempre um SHA-256 sem sal. Falhar a reescrita nao pode
  // impedir a entrada de quem acertou a senha.
  if (needsRehash(user.passwordHash)) {
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hashPassword(parsed.data.password) },
      });
    } catch (error) {
      console.error("[auth] falha ao atualizar o hash da senha:", error);
    }
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function signupAction(formData: FormData) {
  try {
    await assertIpRateLimit("signup", 5, 60 * 60_000);
  } catch {
    redirect("/signup?error=rate");
  }

  const parsed = signupSchema.safeParse({
    companyName: readText(formData, "companyName"),
    document: readText(formData, "document"),
    phone: readText(formData, "phone"),
    postalCode: readText(formData, "postalCode"),
    address: readText(formData, "address"),
    addressNumber: readText(formData, "addressNumber"),
    addressComplement: readText(formData, "addressComplement"),
    province: readText(formData, "province"),
    segment: readText(formData, "segment"),
    ownerName: readText(formData, "ownerName"),
    email: readText(formData, "email"),
    password: readText(formData, "password"),
    confirmPassword: readText(formData, "confirmPassword"),
    plan: readText(formData, "plan"),
  });

  if (!parsed.success) {
    redirect("/signup?error=dados");
  }

  try {
    await assertRateLimit({
      key: `signup:email:${parsed.data.email}`,
      limit: 3,
      windowMs: 60 * 60_000,
    });
  } catch {
    redirect("/signup?error=rate");
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

  const documento = parsed.data.document ? parseDocument(parsed.data.document) : null;
  const telefone = parsed.data.phone ? parsePhone(parsed.data.phone) : null;

  // O documento e unico por empresa. Conferir antes evita quebrar a transacao
  // de criacao inteira por causa de um conflito previsivel.
  if (documento) {
    const empresaComDocumento = await prisma.company.findUnique({
      where: { document: documento.digits },
      select: { id: true },
    });

    if (empresaComDocumento) {
      redirect("/signup?error=documento");
    }
  }

  const userId = await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name: parsed.data.companyName,
        document: documento?.digits ?? null,
        phone: telefone?.digits ?? null,
        postalCode: parsed.data.postalCode ? parsed.data.postalCode.replace(/\D/g, "") : null,
        address: parsed.data.address || null,
        addressNumber: parsed.data.addressNumber || null,
        addressComplement: parsed.data.addressComplement || null,
        province: parsed.data.province || null,
        segment: parsed.data.segment || null,
        email: parsed.data.email,
        employeeCount: 1,
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

  // A conta nasce cadastrada e sem plano. Comecar o teste e um ato dentro do
  // produto, nao um efeito colateral de preencher um formulario: assim a pessoa
  // ve o que esta contratando antes de o relogio dos 30 dias comecar a correr,
  // e o cadastro deixa de depender de qualquer coisa dar certo depois dele.
  //
  // O plano escolhido na landing viaja na URL so para chegar destacado.
  redirect(parsed.data.plan ? `/settings?welcome=1&plano=${parsed.data.plan}` : "/settings?welcome=1");
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
