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

/**
 * Ultimo resultado da checagem do banco, reaproveitado por alguns segundos.
 *
 * Este endereco e publico, nao exige autenticacao e consulta o banco. Sem
 * nenhuma contencao, quem quisesse bastava repeti-lo para transformar a
 * aplicacao em um gerador de consultas — e, num banco que cobra por tempo de
 * computo e dorme quando ocioso, isso queima cota e mantem o compute acordado.
 *
 * Limitar por IP seria a resposta reflexa e aqui e a errada: o limitador grava
 * no proprio Postgres, entao cada requisicao barrada custaria uma escrita no
 * lugar de uma leitura. Guardar o resultado resolve pelo outro lado: uma
 * enxurrada passa a custar memoria, e o monitor de uptime, que chama a cada
 * minuto, continua recebendo um resultado recente.
 */
const PROBE_TTL_MS = 10_000;
let probe: { at: number; reachable: boolean } | null = null;

async function databaseReachable() {
  const agora = Date.now();

  if (probe && agora - probe.at < PROBE_TTL_MS) {
    return probe.reachable;
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    probe = { at: agora, reachable: true };
  } catch {
    probe = { at: agora, reachable: false };
  }

  return probe.reachable;
}

export async function GET() {
  const startedAt = performance.now();

  try {
    if (!(await databaseReachable())) {
      throw new Error("banco inacessivel");
    }

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
