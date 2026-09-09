import "server-only";
import { z } from "zod";
import { getGoogleConfig } from "@/lib/env";

/**
 * Permissao pedida ao Google.
 *
 * Apenas eventos, e nao a agenda inteira: a Zelo cria e apaga compromissos de
 * tarefa, e nao tem por que enxergar a vida particular de quem conecta. Pedir o
 * minimo tambem encurta a tela de consentimento, que e onde muita gente
 * desiste.
 */
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
const TIMEOUT_MS = 15_000;

export class GoogleError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "GoogleError";
    this.status = status;
  }
}

export function buildAuthUrl(state: string) {
  const config = getGoogleConfig();
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES,
    // offline + consent para receber o refresh token. Sem ele a ligacao morre
    // em uma hora e a pessoa teria que reconectar toda vez.
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });

  return `${AUTH_URL}?${params.toString()}`;
}

const tokenSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number(),
  refresh_token: z.string().min(1).optional(),
  scope: z.string().optional(),
  token_type: z.string().optional(),
});

async function pedirToken(body: URLSearchParams) {
  let resposta: Response;

  try {
    resposta = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    throw new GoogleError("Nao foi possivel falar com o Google.", 503);
  }

  const texto = await resposta.text();

  if (!resposta.ok) {
    throw new GoogleError(`Google respondeu ${resposta.status}: ${texto.slice(0, 300)}`, resposta.status);
  }

  return tokenSchema.parse(JSON.parse(texto));
}

export async function exchangeCode(code: string) {
  const config = getGoogleConfig();

  return pedirToken(
    new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
  );
}

export async function refreshAccessToken(refreshToken: string) {
  const config = getGoogleConfig();

  return pedirToken(
    new URLSearchParams({
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
    }),
  );
}

/** E-mail da conta conectada, so para a pessoa saber qual agenda foi ligada. */
export async function fetchGoogleEmail(accessToken: string) {
  try {
    const resposta = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });

    if (!resposta.ok) {
      return null;
    }

    const dados = (await resposta.json()) as { email?: string };

    return dados.email ?? null;
  } catch {
    return null;
  }
}
