"use server";

import type { SubscriptionPlan } from "@prisma/client";
import { redirect } from "next/navigation";
import { ensureAsaasCustomer } from "@/features/billing/asaas-customer";
import { createCheckout } from "@/lib/asaas/client";
import { getAppUrl } from "@/lib/env";
import { parsePhone } from "@/lib/phone";
import { planDetails } from "@/lib/plans";
import { createSession, deleteSession, getCurrentUser } from "@/lib/auth/session";
import { hashPassword, needsRehash, verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/client";
import { parseDocument } from "@/lib/document";
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
    email: formData.get("email"),
    password: formData.get("password"),
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
    companyName: formData.get("companyName"),
    document: formData.get("document"),
    phone: formData.get("phone"),
    postalCode: formData.get("postalCode"),
    address: formData.get("address"),
    addressNumber: formData.get("addressNumber"),
    addressComplement: formData.get("addressComplement"),
    province: formData.get("province"),
    segment: formData.get("segment"),
    ownerName: formData.get("ownerName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    plan: formData.get("plan"),
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

  if (!parsed.data.plan) {
    redirect("/settings?welcome=1");
  }

  // Conta criada e sessao aberta: daqui em diante qualquer falha ainda deixa a
  // pessoa dentro do produto, com o plano a um clique. Perder a conta por causa
  // de um erro da processadora seria bem pior.
  //
  // O redirecionamento fica fora do try de proposito: redirect() sinaliza por
  // excecao, e chamado aqui dentro seria confundido com falha do checkout.
  let checkoutUrl: string | null = null;

  try {
    checkoutUrl = await startSignupCheckout(userId, parsed.data.plan);
  } catch (error) {
    console.error("[signup] conta criada, mas o checkout falhou:", error);
  }

  if (!checkoutUrl) {
    redirect("/settings?pagamento=indisponivel");
  }

  redirect(checkoutUrl);
}

/** Cria o cliente na processadora e devolve o link de pagamento do plano. */
async function startSignupCheckout(userId: string, plan: SubscriptionPlan) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { company: true },
  });

  const asaasCustomerId = await ensureAsaasCustomer({
    id: user.company.id,
    name: user.company.name,
    document: user.company.document,
    email: user.company.email,
    phone: user.company.phone,
    postalCode: user.company.postalCode,
    address: user.company.address,
    addressNumber: user.company.addressNumber,
    addressComplement: user.company.addressComplement,
    province: user.company.province,
    asaasCustomerId: user.company.asaasCustomerId,
  });

  await prisma.company.update({
    where: { id: user.company.id },
    data: { pendingPlanCode: plan },
  });

  const detalhes = planDetails[plan];
  const appUrl = getAppUrl();
  const retorno = (estado: string) => `${appUrl}/settings?pagamento=${estado}`;

  const checkout = await createCheckout({
    billingTypes: ["CREDIT_CARD"],
    customer: asaasCustomerId,
    chargeTypes: ["RECURRENT"],
    minutesToExpire: 60,
    items: [
      {
        name: `Plano ${detalhes.name}`,
        description: "Assinatura mensal da Zelo.",
        quantity: 1,
        value: detalhes.priceCents / 100,
      },
    ],
    subscription: {
      cycle: "MONTHLY",
      nextDueDate: new Date().toISOString().slice(0, 10),
    },
    callback: {
      successUrl: retorno("confirmado"),
      cancelUrl: retorno("cancelado"),
      expiredUrl: retorno("expirado"),
      autoRedirect: true,
    },
  });

  return checkout.link;
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
