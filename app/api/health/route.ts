import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { getAsaasConfig, isAsaasConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 5;

const noStore = { "Cache-Control": "no-store, max-age=0" } as const;

/**
 * Commit que originou o build. Sem isso nao ha como saber, de fora, qual versao
 * esta no ar — e "ja subi mas nao aparece" vira adivinhacao.
 *
 * Somente o hash curto e a mensagem: nada disso e sensivel, e ja e publico no
 * repositorio.
 */
function deployedCommit() {
  const sha =
    process.env.RAILWAY_GIT_COMMIT_SHA ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.GIT_COMMIT_SHA ??
    null;

  return sha ? sha.slice(0, 7) : "desconhecido";
}

/**
 * Estado da configuracao de cobranca, sem expor segredo nenhum: apenas se ha
 * chave, para qual ambiente ela aponta e se as variaveis concordam entre si.
 *
 * Sem isto, descobrir que a chave e o ambiente estao desalinhados exigia clicar
 * em comprar um plano e ler o erro — dentro da area logada, onde nao da para
 * verificar de fora.
 */
function billingStatus() {
  if (!isAsaasConfigured()) {
    return { configured: false as const };
  }

  try {
    const config = getAsaasConfig();

    return { configured: true as const, environment: config.environment, consistent: true as const };
  } catch (error) {
    return {
      configured: true as const,
      consistent: false as const,
      problem: error instanceof Error ? error.message : "configuracao invalida",
    };
  }
}

export async function GET() {
  const startedAt = performance.now();

  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: "ok",
        database: "reachable",
        commit: deployedCommit(),
        billing: billingStatus(),
        responseTimeMs: Math.round(performance.now() - startedAt),
      },
      { headers: noStore },
    );
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        database: "unreachable",
        commit: deployedCommit(),
      },
      { status: 503, headers: noStore },
    );
  }
}
