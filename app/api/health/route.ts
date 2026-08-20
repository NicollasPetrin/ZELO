import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

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

export async function GET() {
  const startedAt = performance.now();

  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: "ok",
        database: "reachable",
        commit: deployedCommit(),
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
