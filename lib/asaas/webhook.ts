import { createHash, timingSafeEqual } from "node:crypto";
import {
  asaasWebhookEventSchema,
  handledInvoiceEvents,
  handledPaymentEvents,
  type AsaasWebhookEvent,
  type HandledInvoiceEvent,
  type HandledPaymentEvent,
} from "@/lib/asaas/types";

export const ASAAS_WEBHOOK_TOKEN_HEADER = "asaas-access-token";

/**
 * Compara o token em tempo constante para nao vazar informacao por tempo de
 * resposta. Os valores sao reduzidos a um hash de tamanho fixo antes da
 * comparacao porque timingSafeEqual exige buffers do mesmo tamanho, e o proprio
 * tamanho do token nao deve ser observavel.
 */
export function isValidWebhookToken(received: string | null | undefined, expected: string) {
  if (!received) {
    return false;
  }

  const receivedDigest = createHash("sha256").update(received).digest();
  const expectedDigest = createHash("sha256").update(expected).digest();

  return timingSafeEqual(receivedDigest, expectedDigest);
}

export function isHandledPaymentEvent(event: string): event is HandledPaymentEvent {
  return (handledPaymentEvents as readonly string[]).includes(event);
}

export function isHandledInvoiceEvent(event: string): event is HandledInvoiceEvent {
  return (handledInvoiceEvents as readonly string[]).includes(event);
}

/** Se a aplicacao sabe o que fazer com o evento, seja de cobranca ou de nota. */
export function isHandledEvent(event: string) {
  return isHandledPaymentEvent(event) || isHandledInvoiceEvent(event);
}

export type ParsedWebhook =
  | { ok: true; data: AsaasWebhookEvent }
  | { ok: false; error: string };

export function parseWebhookPayload(rawBody: string): ParsedWebhook {
  let json: unknown;

  try {
    json = JSON.parse(rawBody);
  } catch {
    return { ok: false, error: "Corpo do webhook nao e JSON valido." };
  }

  const parsed = asaasWebhookEventSchema.safeParse(json);

  if (!parsed.success) {
    return { ok: false, error: "Payload do webhook fora do formato esperado." };
  }

  return { ok: true, data: parsed.data };
}
