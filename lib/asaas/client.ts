import "server-only";
import { getAsaasConfig } from "@/lib/env";
import { asaasCustomerSchema, asaasPaymentSchema, type AsaasCustomer, type AsaasPayment } from "@/lib/asaas/types";

const DEFAULT_TIMEOUT_MS = 15_000;

export class AsaasError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "AsaasError";
    this.status = status;
    this.code = code;
  }
}

type AsaasErrorBody = {
  errors?: Array<{ code?: string; description?: string }>;
};

function extractError(body: unknown, status: number) {
  const first = (body as AsaasErrorBody)?.errors?.[0];

  if (first?.description) {
    return new AsaasError(first.description, status, first.code);
  }

  return new AsaasError(`Asaas respondeu ${status}.`, status);
}

export async function asaasRequest<T>(
  path: string,
  schema: { parse: (value: unknown) => T },
  init: { method?: string; body?: unknown; timeoutMs?: number } = {},
): Promise<T> {
  const config = getAsaasConfig();
  const { method = "GET", body, timeoutMs = DEFAULT_TIMEOUT_MS } = init;

  let response: Response;

  try {
    response = await fetch(`${config.baseUrl}${path}`, {
      method,
      headers: {
        // O Asaas usa o header access_token, nao Authorization: Bearer.
        access_token: config.apiKey,
        "Content-Type": "application/json",
        // Obrigatorio para contas raiz criadas apos 13/06/2024.
        "User-Agent": config.userAgent,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new AsaasError(`Asaas nao respondeu em ${timeoutMs}ms.`, 504);
    }

    throw new AsaasError("Nao foi possivel contatar o Asaas.", 503);
  }

  const text = await response.text();
  let parsedBody: unknown = null;

  if (text) {
    try {
      parsedBody = JSON.parse(text);
    } catch {
      throw new AsaasError("Asaas retornou uma resposta que nao e JSON.", response.status);
    }
  }

  if (!response.ok) {
    throw extractError(parsedBody, response.status);
  }

  return schema.parse(parsedBody);
}

export function createCustomer(input: {
  name: string;
  cpfCnpj: string;
  email?: string;
  phone?: string;
  externalReference?: string;
}): Promise<AsaasCustomer> {
  return asaasRequest("/customers", asaasCustomerSchema, { method: "POST", body: input });
}

export function getPayment(paymentId: string): Promise<AsaasPayment> {
  return asaasRequest(`/payments/${encodeURIComponent(paymentId)}`, asaasPaymentSchema);
}
