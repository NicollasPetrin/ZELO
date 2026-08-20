import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { applyPaymentEvent } from "@/features/billing/activate-subscription";
import { ASAAS_PROVIDER } from "@/lib/asaas/types";
import {
  ASAAS_WEBHOOK_TOKEN_HEADER,
  isHandledEvent,
  isValidWebhookToken,
  parseWebhookPayload,
} from "@/lib/asaas/webhook";
import { prisma } from "@/lib/db/client";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 15;

const noStore = { "Cache-Control": "no-store, max-age=0" } as const;

export async function POST(request: NextRequest) {
  const expectedToken = env.ASAAS_WEBHOOK_TOKEN;

  // Sem token configurado nao ha como distinguir o Asaas de qualquer outro
  // emissor, entao nada e aceito.
  if (!expectedToken) {
    console.error("[asaas-webhook] ASAAS_WEBHOOK_TOKEN nao configurado.");

    return NextResponse.json({ error: "Webhook nao configurado." }, { status: 503, headers: noStore });
  }

  if (!isValidWebhookToken(request.headers.get(ASAAS_WEBHOOK_TOKEN_HEADER), expectedToken)) {
    return NextResponse.json({ error: "Token invalido." }, { status: 401, headers: noStore });
  }

  const rawBody = await request.text();
  const parsed = parseWebhookPayload(rawBody);

  if (!parsed.ok) {
    console.error("[asaas-webhook] payload rejeitado:", parsed.error);

    return NextResponse.json({ error: parsed.error }, { status: 400, headers: noStore });
  }

  const event = parsed.data;

  // Reentrega e esperada: o Asaas entrega "at least once". Um evento ja
  // processado e reconhecido sem ser aplicado de novo, o que evita ativar duas
  // vezes a mesma assinatura. So o que ficou FAILED e reprocessado.
  const jaVisto = await prisma.webhookEvent.findUnique({
    where: {
      provider_externalId: {
        provider: ASAAS_PROVIDER,
        externalId: event.id,
      },
    },
    select: { id: true, status: true },
  });

  if (jaVisto && jaVisto.status !== "FAILED") {
    return NextResponse.json({ received: true, duplicate: true }, { headers: noStore });
  }

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      // Gravar e aplicar na mesma transacao: ou o evento fica registrado e
      // surtiu efeito, ou nada aconteceu e o Asaas reenvia.
      const outcome = isHandledEvent(event.event)
        ? await applyPaymentEvent(tx, event)
        : ({ handled: false, reason: "evento fora do escopo tratado" } as const);

      const status = outcome.handled ? "PROCESSED" : "IGNORED";
      const error = outcome.handled ? null : outcome.reason;

      if (jaVisto) {
        await tx.webhookEvent.update({
          where: { id: jaVisto.id },
          data: { status, error, processedAt: new Date(), attempts: { increment: 1 } },
        });
      } else {
        await tx.webhookEvent.create({
          data: {
            provider: ASAAS_PROVIDER,
            externalId: event.id,
            event: event.event,
            payload: rawBody,
            status,
            error,
            attempts: 1,
            processedAt: new Date(),
          },
        });
      }

      return outcome;
    });

    return NextResponse.json(
      { received: true, duplicate: false, handled: resultado.handled },
      { headers: noStore },
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      // Duas entregas do mesmo evento em paralelo: a que perdeu a corrida
      // apenas confirma, sem aplicar nada.
      return NextResponse.json({ received: true, duplicate: true }, { headers: noStore });
    }

    console.error("[asaas-webhook] falha ao processar evento:", error);

    // Registra a falha fora da transacao que foi revertida, para que a proxima
    // entrega saiba que este evento precisa ser reprocessado.
    await prisma.webhookEvent
      .upsert({
        where: { provider_externalId: { provider: ASAAS_PROVIDER, externalId: event.id } },
        create: {
          provider: ASAAS_PROVIDER,
          externalId: event.id,
          event: event.event,
          payload: rawBody,
          status: "FAILED",
          error: error instanceof Error ? error.message : "erro desconhecido",
          attempts: 1,
        },
        update: {
          status: "FAILED",
          error: error instanceof Error ? error.message : "erro desconhecido",
          attempts: { increment: 1 },
        },
      })
      .catch((registroFalhou) => {
        console.error("[asaas-webhook] falha ao registrar a falha:", registroFalhou);
      });

    // 5xx faz o Asaas reenviar depois.
    return NextResponse.json({ error: "Falha ao processar o evento." }, { status: 500, headers: noStore });
  }
}
