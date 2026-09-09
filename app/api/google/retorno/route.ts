import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { OAUTH_STATE_COOKIE } from "@/app/api/google/conectar/route";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { getAppUrl, getSessionSecret, isGoogleCalendarConfigured } from "@/lib/env";
import { exchangeCode, fetchGoogleEmail } from "@/lib/google/oauth";
import { encryptSecret } from "@/lib/secret-box";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function iguais(a: string, b: string) {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);

  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
}

/** Volta do consentimento do Google. */
export async function GET(request: NextRequest) {
  const destino = (estado: string) => NextResponse.redirect(`${getAppUrl()}/agenda?google=${estado}`);
  const cookieStore = await cookies();
  // getCurrentUser, e nao requireUser: o redirect do Next funciona lancando um
  // erro. Dentro do try ele viraria "falhou", escondendo que o caso era sessao
  // expirada; fora dele, num route handler, sobe como 500. Aqui a ausencia de
  // sessao vira uma resposta explicita, que e o que o navegador precisa.
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(`${getAppUrl()}/login`);
  }

  try {
    if (!isGoogleCalendarConfigured()) {
      return destino("indisponivel");
    }

    const params = request.nextUrl.searchParams;
    const guardado = cookieStore.get(OAUTH_STATE_COOKIE)?.value;
    const recebido = params.get("state");

    // O cookie so serve para esta ida e volta.
    cookieStore.delete(OAUTH_STATE_COOKIE);

    if (params.get("error")) {
      // Inclui o caso comum de a pessoa clicar em "cancelar" na tela do Google.
      return destino("recusado");
    }

    if (!guardado || !recebido || !iguais(guardado, recebido)) {
      return destino("estado-invalido");
    }

    const code = params.get("code");

    if (!code) {
      return destino("sem-codigo");
    }

    const token = await exchangeCode(code);

    if (!token.refresh_token) {
      // Sem refresh token a ligacao duraria uma hora. Acontece quando a conta ja
      // autorizou antes e o Google nao reemite; pedir de novo com consentimento
      // resolve, entao e melhor falhar aqui do que guardar uma ligacao que
      // morre sozinha amanha.
      return destino("sem-refresh");
    }

    const segredo = getSessionSecret();
    const email = await fetchGoogleEmail(token.access_token);
    const dados = {
      googleEmail: email,
      accessToken: encryptSecret(token.access_token, segredo),
      refreshToken: encryptSecret(token.refresh_token, segredo),
      expiresAt: new Date(Date.now() + token.expires_in * 1000),
    };

    await prisma.googleCalendarAccount.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...dados },
      update: dados,
    });

    return destino("conectado");
  } catch (error) {
    console.error("[google-agenda] falha no retorno do consentimento:", error);

    return destino("falhou");
  }
}
