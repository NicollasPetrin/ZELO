import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEY_LENGTH = 64;
const PREFIX = "scrypt";
const SCRYPT_PARAMS = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
};

function derivePasswordHash(password: string, salt: string) {
  return scryptSync(password, salt, KEY_LENGTH, SCRYPT_PARAMS).toString("hex");
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = derivePasswordHash(password, salt);

  return `${PREFIX}$${SCRYPT_PARAMS.N}$${SCRYPT_PARAMS.r}$${SCRYPT_PARAMS.p}$${salt}$${hash}`;
}

export function verifyPassword(password: string, passwordHash: string) {
  if (passwordHash.startsWith(`${PREFIX}$`)) {
    const parts = passwordHash.split("$");
    const [, maybeN, maybeR, maybeP, maybeSalt, maybeHash] = parts;
    const legacySalt = parts[1];
    const legacyHash = parts[2];
    const salt = parts.length >= 6 ? maybeSalt : legacySalt;
    const hash = parts.length >= 6 ? maybeHash : legacyHash;

    if (!salt || !hash) {
      return false;
    }

    if (parts.length >= 6) {
      const n = Number(maybeN);
      const r = Number(maybeR);
      const p = Number(maybeP);

      if (n !== SCRYPT_PARAMS.N || r !== SCRYPT_PARAMS.r || p !== SCRYPT_PARAMS.p) {
        return false;
      }
    }

    const incoming = Buffer.from(derivePasswordHash(password, salt));
    const stored = Buffer.from(hash);

    if (incoming.length !== stored.length) {
      return false;
    }

    return timingSafeEqual(incoming, stored);
  }

  const incoming = Buffer.from(createHash("sha256").update(password).digest("hex"));
  const stored = Buffer.from(passwordHash);

  return incoming.length === stored.length && timingSafeEqual(incoming, stored);
}
