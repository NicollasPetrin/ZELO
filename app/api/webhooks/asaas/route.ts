import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
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

  try {
    await prisma.webhookEvent.create({
      data: {
        provider: ASAAS_PROVIDER,
        externalId: event.id,
        event: event.event,
        payload: rawBody,
        // O processamento de fato acontece em etapa separada; aqui apenas
        // registramos de forma duravel para nao perder nem repetir evento.
        status: isHandledEvent(event.event) ? "RECEIVED" : "IGNORED",
      },
    });
  } catch (error) {
    // O Asaas entrega "at least once", entao reentrega e esperada e nao e erro.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ received: true, duplicate: true }, { headers: noStore });
    }

    // Falha nossa: devolvemos 5xx para o Asaas reenviar o evento depois.
    console.error("[asaas-webhook] falha ao gravar evento:", error);

    return NextResponse.json({ error: "Falha ao registrar o evento." }, { status: 500, headers: noStore });
  }

  return NextResponse.json({ received: true, duplicate: false }, { headers: noStore });
}
