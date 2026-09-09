import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth/session";
import { getAppUrl, isGoogleCalendarConfigured } from "@/lib/env";
import { buildAuthUrl } from "@/lib/google/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OAUTH_STATE_COOKIE = "zelo_google_state";

/**
 * Comeca a ligacao com o Google.
 *
 * O "state" e sorteado aqui e guardado num cookie proprio da sessao. Na volta,
 * os dois precisam bater: sem isso, alguem poderia fazer um usuario logado
 * abrir um retorno forjado e ligar a agenda de outra conta a ele.
 */
export async function GET() {
  // Mesma razao do retorno: sem sessao, uma resposta explicita em vez do
  // redirect por excecao do requireUser, que aqui subiria como 500.
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(`${getAppUrl()}/login`);
  }

  if (!isGoogleCalendarConfigured()) {
    return NextResponse.redirect(`${getAppUrl()}/agenda?google=indisponivel`);
  }

  const state = randomBytes(24).toString("base64url");
  const cookieStore = await cookies();

  cookieStore.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });

  return NextResponse.redirect(buildAuthUrl(state));
}
