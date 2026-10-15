import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { recordActivity } from "@/lib/audit";
import { buildLogoKey, LOGO_MAX_BYTES, validateLogoFile } from "@/lib/company-logo";
import { prisma } from "@/lib/db/client";
import { isStorageConfigured, STORAGE_NOT_CONFIGURED_MESSAGE } from "@/lib/env";
import { createId } from "@/lib/id";
import { canManageCompany } from "@/lib/permissions";
import { assertUserActionRateLimit } from "@/lib/rate-limit";
import { deleteObject, getObject, putObject, StorageError } from "@/lib/storage/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store, max-age=0" } as const;

/**
 * Entrega a logo para quem e da empresa.
 *
 * Passa por aqui, e nao por link publico do bucket, pelo mesmo motivo das fotos
 * de prova: o bucket fica fechado. A URL leva a data do envio (?v=), entao o
 * navegador pode guardar a imagem por bastante tempo sem nunca mostrar uma logo
 * trocada.
 */
export async function GET() {
  try {
    const user = await requireUser();
    const empresa = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: { logoKey: true, logoContentType: true },
    });

    if (!empresa?.logoKey || !isStorageConfigured()) {
      return new NextResponse(null, { status: 404 });
    }

    const objeto = await getObject(empresa.logoKey);

    if (!objeto.body) {
      return new NextResponse(null, { status: 404 });
    }

    return new NextResponse(objeto.body, {
      headers: {
        "Content-Type": empresa.logoContentType || objeto.contentType,
        "Cache-Control": "private, max-age=604800",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof StorageError) {
      console.error("[logo] falha ao ler do armazenamento:", error.message);
    }

    return new NextResponse(null, { status: 404 });
  }
}

async function exigirDono() {
  const user = await requireUser();

  if (!canManageCompany(user.role)) {
    return { user, erro: NextResponse.json({ error: "Só o dono pode trocar a logo da empresa." }, { status: 403, headers: noStore }) };
  }

  return { user, erro: null };
}

/** Apaga o arquivo antigo sem deixar a falha atrapalhar quem trocou a logo: sobra um arquivo, nada quebra. */
async function apagarSemFalhar(objectKey: string | null) {
  if (!objectKey) {
    return;
  }

  try {
    await deleteObject(objectKey);
  } catch (error) {
    console.error("[logo] não foi possível apagar a logo antiga:", error instanceof Error ? error.message : error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, erro } = await exigirDono();
    if (erro) {
      return erro;
    }
    await assertUserActionRateLimit(user.id, "company:logo");

    if (!isStorageConfigured()) {
      return NextResponse.json({ error: STORAGE_NOT_CONFIGURED_MESSAGE }, { status: 503, headers: noStore });
    }

    const form = await request.formData();
    const arquivo = form.get("logo");

    if (!(arquivo instanceof File)) {
      return NextResponse.json({ error: "Nenhuma imagem foi enviada." }, { status: 400, headers: noStore });
    }

    // O tamanho e conferido antes de ler o arquivo inteiro para a memoria.
    if (arquivo.size > LOGO_MAX_BYTES) {
      return NextResponse.json({ error: "A logo passa de 2 MB. Use uma imagem menor." }, { status: 400, headers: noStore });
    }

    const bytes = Buffer.from(await arquivo.arrayBuffer());
    const validacao = validateLogoFile({ size: bytes.length, bytes });

    if (!validacao.ok) {
      return NextResponse.json({ error: validacao.reason }, { status: 400, headers: noStore });
    }

    const anterior = await prisma.company.findUnique({ where: { id: user.companyId }, select: { logoKey: true } });
    const objectKey = buildLogoKey(user.companyId, createId(), validacao.extension);

    // Primeiro o arquivo, depois o registro: um registro sem arquivo mostraria uma logo quebrada.
    await putObject(objectKey, bytes, validacao.contentType);
    await prisma.company.update({
      where: { id: user.companyId },
      data: { logoKey: objectKey, logoContentType: validacao.contentType, logoUpdatedAt: new Date() },
    });
    await apagarSemFalhar(anterior?.logoKey ?? null);

    await recordActivity({
      companyId: user.companyId,
      actorId: user.id,
      type: "COMPANY_UPDATED",
      entityType: "Company",
      entityId: user.companyId,
      title: "Logo da empresa atualizada",
      description: null,
      metadata: { sizeBytes: bytes.length, contentType: validacao.contentType },
    });

    return NextResponse.json({ ok: true }, { headers: noStore });
  } catch (error) {
    if (error instanceof StorageError) {
      console.error("[logo] falha no armazenamento:", error.message);

      return NextResponse.json(
        { error: "Não foi possível guardar a logo agora. Tente de novo em instantes." },
        { status: 502, headers: noStore },
      );
    }

    console.error("[logo] falha ao trocar a logo:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível enviar a logo." },
      { status: 400, headers: noStore },
    );
  }
}

export async function DELETE() {
  try {
    const { user, erro } = await exigirDono();
    if (erro) {
      return erro;
    }
    await assertUserActionRateLimit(user.id, "company:logo");

    const anterior = await prisma.company.findUnique({ where: { id: user.companyId }, select: { logoKey: true } });
    await prisma.company.update({
      where: { id: user.companyId },
      data: { logoKey: null, logoContentType: null, logoUpdatedAt: new Date() },
    });
    await apagarSemFalhar(anterior?.logoKey ?? null);

    return NextResponse.json({ ok: true }, { headers: noStore });
  } catch (error) {
    console.error("[logo] falha ao remover a logo:", error);

    return NextResponse.json({ error: "Não foi possível remover a logo." }, { status: 400, headers: noStore });
  }
}
