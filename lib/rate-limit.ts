import "server-only";
import { headers } from "next/headers";

type Bucket = {
  count: number;
  resetAt: number;
};

const globalForRateLimit = globalThis as typeof globalThis & {
  zeloRateLimitStore?: Map<string, Bucket>;
};

const store = globalForRateLimit.zeloRateLimitStore ?? new Map<string, Bucket>();
globalForRateLimit.zeloRateLimitStore = store;

/** No maximo uma limpeza por minuto: varrer o mapa a cada requisicao seria O(n) no caminho quente. */
const SWEEP_INTERVAL_MS = 60_000;
let lastSweep = Date.now();

/**
 * Sem isto o mapa so cresce: uma chave expirada nunca e removida, apenas
 * sobrescrita se a mesma chave voltar. Como a chave inclui valor vindo do
 * cliente (e-mail e IP), basta variar o e-mail a cada tentativa para criar
 * entradas eternas e consumir a memoria do processo.
 */
function sweepExpired(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) {
    return;
  }

  lastSweep = now;

  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) {
      store.delete(key);
    }
  }
}

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

export async function assertRateLimit({
  key,
  limit,
  windowMs,
  message = "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
}: {
  key: string;
  limit: number;
  windowMs: number;
  message?: string;
}) {
  const now = Date.now();

  sweepExpired(now);

  const bucket = store.get(key);

  if (!bucket || bucket.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return;
  }

  if (bucket.count >= limit) {
    throw new Error(message);
  }

  bucket.count += 1;
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
