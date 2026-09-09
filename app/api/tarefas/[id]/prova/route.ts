import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createId } from "@/lib/id";
import { findTaskForUser } from "@/features/tasks/data";
import { requireUser } from "@/lib/auth/session";
import { recordActivity } from "@/lib/audit";
import { prisma } from "@/lib/db/client";
import { isStorageConfigured, STORAGE_NOT_CONFIGURED_MESSAGE } from "@/lib/env";
import { assertUserActionRateLimit } from "@/lib/rate-limit";
import { putObject, StorageError } from "@/lib/storage/r2";
import { assertCompanyHasActivePlan } from "@/lib/subscription";
import { buildProofKey, statusAfterProof, validateProofFile } from "@/lib/task-proof";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store, max-age=0" } as const;

/**
 * Recebe a foto que comprova a conclusao de uma tarefa.
 *
 * E uma rota, e nao uma Server Action, por causa do tamanho: acoes tem limite
 * de corpo pensado para formulario, e foto de celular passa desse limite com
 * folga.
 *
 * O arquivo sobe pela aplicacao em vez de ir direto do navegador ao
 * armazenamento. Passar por aqui custa um pouco de banda e paga por isso com a
 * conferencia de quem esta enviando, de que a tarefa e daquela pessoa e do que
 * o arquivo realmente e — coisas que um envio direto entregaria a quem quisesse
 * mandar qualquer coisa para dentro do bucket.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    assertCompanyHasActivePlan(user.company);
    await assertUserActionRateLimit(user.id, "tasks:send-proof");

    if (!isStorageConfigured()) {
      return NextResponse.json({ error: STORAGE_NOT_CONFIGURED_MESSAGE }, { status: 503, headers: noStore });
    }

    const { id } = await context.params;
    const task = await findTaskForUser(id, user);

    if (!task) {
      return NextResponse.json({ error: "Tarefa nao encontrada." }, { status: 404, headers: noStore });
    }

    const form = await request.formData();
    const arquivo = form.get("foto");
    const nota = String(form.get("nota") ?? "").trim().slice(0, 500);

    if (!(arquivo instanceof File)) {
      return NextResponse.json({ error: "Nenhuma foto foi enviada." }, { status: 400, headers: noStore });
    }

    const validacao = validateProofFile({ type: arquivo.type, size: arquivo.size });

    if (!validacao.ok) {
      return NextResponse.json({ error: validacao.reason }, { status: 400, headers: noStore });
    }

    const proofId = createId();
    const objectKey = buildProofKey(user.companyId, task.id, proofId, validacao.extension);
    const bytes = Buffer.from(await arquivo.arrayBuffer());

    // Primeiro o arquivo, depois o registro: um registro sem arquivo mostraria
    // uma prova quebrada na tela. Um arquivo sem registro apenas ocupa espaco.
    await putObject(objectKey, bytes, arquivo.type);

    await prisma.$transaction([
      prisma.taskProof.create({
        data: {
          id: proofId,
          taskId: task.id,
          authorId: user.id,
          note: nota || null,
          objectKey,
          contentType: arquivo.type,
          sizeBytes: arquivo.size,
        },
      }),
      prisma.task.update({
        where: { id: task.id },
        data: { status: statusAfterProof(task.status) },
      }),
    ]);

    // Quem cobrou a tarefa precisa saber que ha algo para revisar.
    if (task.creatorId !== user.id) {
      await prisma.notification.create({
        data: {
          companyId: user.companyId,
          userId: task.creatorId,
          type: "STATUS_UPDATED",
          title: "Prova de conclusao enviada",
          message: `${user.name} enviou a foto de "${task.title}" para revisao.`,
          link: `/tasks/${task.id}`,
          relatedTaskId: task.id,
        },
      });
    }

    await recordActivity({
      companyId: user.companyId,
      actorId: user.id,
      type: "TASK_UPDATED",
      entityType: "Task",
      entityId: task.id,
      title: "Prova de conclusao enviada",
      description: task.title,
      metadata: { proofId, sizeBytes: arquivo.size, contentType: arquivo.type },
    });

    return NextResponse.json({ ok: true, proofId }, { headers: noStore });
  } catch (error) {
    if (error instanceof StorageError) {
      console.error("[prova] falha no armazenamento:", error.message);

      return NextResponse.json(
        { error: "Nao foi possivel guardar a foto agora. Tente de novo em instantes." },
        { status: 502, headers: noStore },
      );
    }

    console.error("[prova] falha ao registrar a prova:", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nao foi possivel enviar a prova." },
      { status: 400, headers: noStore },
    );
  }
}
