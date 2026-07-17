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

export async function getClientIp() {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim();

  return forwardedFor || headerStore.get("x-real-ip") || "unknown";
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
