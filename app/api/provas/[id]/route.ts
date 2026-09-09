import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { isStorageConfigured } from "@/lib/env";
import { canManageTasks } from "@/lib/permissions";
import { getObject, StorageError } from "@/lib/storage/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Entrega a foto de prova para quem tem direito de ve-la.
 *
 * O bucket fica fechado e a imagem passa por aqui de proposito. Um link publico
 * de armazenamento vale para qualquer um que o receba, e foto de dentro da
 * operacao de um cliente nao pode depender de ninguem guardar segredo de uma
 * URL. Aqui a permissao e conferida a cada leitura: quem cobrou a tarefa, quem
 * a executou, ou quem gerencia a empresa.
 */
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;

    const prova = await prisma.taskProof.findFirst({
      where: {
        id,
        task: {
          companyId: user.companyId,
          ...(canManageTasks(user.role)
            ? {}
            : { OR: [{ assigneeId: user.id }, { creatorId: user.id }] }),
        },
      },
      select: { objectKey: true, contentType: true },
    });

    if (!prova || !isStorageConfigured()) {
      return new NextResponse(null, { status: 404 });
    }

    const objeto = await getObject(prova.objectKey);

    if (!objeto.body) {
      return new NextResponse(null, { status: 404 });
    }

    return new NextResponse(objeto.body, {
      headers: {
        "Content-Type": prova.contentType || objeto.contentType,
        // Privado e de curta duracao: a imagem pode ficar no cache do navegador
        // de quem tem acesso, nunca em cache compartilhado.
        "Cache-Control": "private, max-age=300",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof StorageError) {
      console.error("[prova] falha ao ler do armazenamento:", error.message);
    }

    return new NextResponse(null, { status: 404 });
  }
}
