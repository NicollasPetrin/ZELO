"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { actionError } from "@/lib/action-result";
import { recordActivity } from "@/lib/audit";
import { assertCanManageCompany } from "@/lib/auth/guards";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { maskDocument, parseDocument } from "@/lib/document";
import { assertUserActionRateLimit } from "@/lib/rate-limit";
import { companySettingsSchema } from "@/lib/validations";

// Nao exportadas: um arquivo "use server" so pode exportar funcoes async, e
// exportar constantes aqui quebra o build sem que o TypeScript reclame.
const DOCUMENT_LOCKED_MESSAGE =
  "O documento nao pode ser alterado depois que a assinatura foi iniciada. Fale com o suporte para corrigir o cadastro.";

const DOCUMENT_TAKEN_MESSAGE = "Este CNPJ ou CPF ja esta cadastrado em outra empresa.";

export async function saveCompanySettingsAction(values: unknown) {
  try {
    const user = await requireUser();
    assertCanManageCompany(user);
    await assertUserActionRateLimit(user.id, "settings:save-company");

    const parsed = companySettingsSchema.parse(values);
    const documento = parsed.document ? parseDocument(parsed.document) : null;

    const atual = await prisma.company.findUniqueOrThrow({
      where: { id: user.companyId },
      select: { document: true, asaasCustomerId: true },
    });

    const mudouDocumento = (documento?.digits ?? null) !== (atual.document ?? null);

    // Depois que o cadastro do pagador existe na processadora, trocar o
    // documento aqui deixaria os dois lados descrevendo entidades diferentes, e
    // a cobranca sairia em nome de quem nao contratou.
    if (atual.asaasCustomerId && mudouDocumento) {
      throw new Error(DOCUMENT_LOCKED_MESSAGE);
    }

    await prisma.company.update({
      where: {
        id: user.companyId,
      },
      data: {
        name: parsed.name,
        // Guardado sempre so com digitos, para que a mesma empresa nunca entre
        // duas vezes por causa de pontuacao diferente.
        document: documento?.digits ?? null,
        segment: parsed.segment || null,
        employeeCount: parsed.employeeCount === "" ? null : parsed.employeeCount,
        isActive: parsed.isActive,
      },
    });

    await recordActivity({
      companyId: user.companyId,
      actorId: user.id,
      type: "COMPANY_UPDATED",
      entityType: "Company",
      entityId: user.companyId,
      title: "Configuracoes da empresa atualizadas",
      // Registra que o documento mudou sem reproduzi-lo por inteiro no historico.
      description:
        mudouDocumento && documento ? "Documento definido: " + maskDocument(documento.digits) : undefined,
    });

    revalidatePath("/settings");
    revalidatePath("/", "layout");
    return { ok: true, message: "Configuracoes salvas." } as const;
  } catch (error) {
    // A unicidade e garantida pelo banco; aqui so traduzimos para o usuario.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return actionError(new Error(DOCUMENT_TAKEN_MESSAGE), "Nao foi possivel salvar as configuracoes.");
    }

    return actionError(error, "Nao foi possivel salvar as configuracoes.");
  }
}
