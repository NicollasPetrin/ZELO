import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEY_LENGTH = 64;
const PREFIX = "scrypt";

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");

  return `${PREFIX}$${salt}$${hash}`;
}

export function verifyPassword(password: string, passwordHash: string) {
  if (passwordHash.startsWith(`${PREFIX}$`)) {
    const [, salt, hash] = passwordHash.split("$");
    if (!salt || !hash) {
      return false;
    }

    const incoming = Buffer.from(scryptSync(password, salt, KEY_LENGTH).toString("hex"));
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
