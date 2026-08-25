import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/client";

export const RATE_LIMIT_MESSAGE = "Muitas tentativas. Aguarde alguns minutos e tente novamente.";

/**
 * Chance de aproveitar uma chamada para apagar contadores vencidos. Sem isso a
 * tabela so cresce, porque a chave inclui valor vindo do cliente (e-mail e IP)
 * e basta varia-lo para criar linhas novas. Fazer isso em uma chamada a cada
 * cem mantem a limpeza barata sem precisar de agendador.
 */
const CLEANUP_CHANCE = 0.01;

export async function getClientIp() {
  const headerStore = await headers();

  // A ultima entrada do X-Forwarded-For, nao a primeira. O cliente pode mandar
  // o proprio cabecalho, e o proxy da borda acrescenta o IP real ao final da
  // lista: confiar na primeira entrada deixaria qualquer um forjar um IP novo a
  // cada tentativa e passar por baixo do limite.
  const forwarded = headerStore.get("x-forwarded-for");
  const chain = forwarded?.split(",").map((part) => part.trim()).filter(Boolean) ?? [];
  const closestProxyValue = chain.at(-1);

  return closestProxyValue || headerStore.get("x-real-ip") || "unknown";
}

async function cleanupExpired() {
  if (Math.random() >= CLEANUP_CHANCE) {
    return;
  }

  try {
    await prisma.rateLimit.deleteMany({ where: { resetAt: { lte: new Date() } } });
  } catch (error) {
    // Limpeza e manutencao: falhar aqui nunca pode derrubar a requisicao.
    console.error("[rate-limit] falha ao limpar contadores vencidos:", error);
  }
}

/**
 * Incrementa o contador da chave e devolve quantas tentativas ja houve na
 * janela corrente.
 *
 * A conta inteira acontece em um unico comando SQL de proposito: ler, decidir e
 * gravar em passos separados permitiria que duas requisicoes simultaneas
 * lessem o mesmo valor e passassem juntas pelo limite.
 */
async function bump(key: string, windowMs: number) {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);

  // O "agora" vai como parametro em vez de NOW(). A coluna e TIMESTAMP sem
  // fuso e NOW() devolve TIMESTAMPTZ; comparar os dois faz o Postgres converter
  // usando o fuso da sessao, e a janela nunca vencia quando esse fuso nao era
  // UTC. Com parametro, os dois lados vem do mesmo relogio.
  const [row] = await prisma.$queryRaw<Array<{ count: number }>>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt")
    VALUES (${key}, 1, ${resetAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."resetAt" <= ${now} THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" <= ${now} THEN ${resetAt} ELSE "RateLimit"."resetAt" END
    RETURNING "count"
  `;

  return row?.count ?? 1;
}

export async function assertRateLimit({
  key,
  limit,
  windowMs,
  message = RATE_LIMIT_MESSAGE,
}: {
  key: string;
  limit: number;
  windowMs: number;
  message?: string;
}) {
  let count: number;

  try {
    count = await bump(key, windowMs);
  } catch (error) {
    // O banco caiu. Barrar todo mundo aqui nao protege nada: sem banco o login
    // nao conseguiria validar senha nem carregar sessao de qualquer forma. O
    // erro fica registrado alto para nao passar despercebido.
    console.error("[rate-limit] contador indisponivel, seguindo sem limitar:", error);
    return;
  }

  void cleanupExpired();

  if (count > limit) {
    throw new Error(message);
  }
}

export async function assertIpRateLimit(scope: string, limit: number, windowMs: number) {
  const ip = await getClientIp();

  await assertRateLimit({
    key: `${scope}:ip:${ip}`,
    limit,
    windowMs,
  });
}

export async function assertUserActionRateLimit(userId: string, action: string) {
  await assertRateLimit({
    key: `action:${action}:user:${userId}`,
    limit: 40,
    windowMs: 60_000,
  });
}
