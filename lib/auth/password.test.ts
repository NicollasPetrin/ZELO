import { createHash } from "crypto";
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("hashes with scrypt and verifies valid passwords", () => {
    const hash = hashPassword("SenhaForte123");

    expect(hash).toMatch(/^scrypt\$16384\$8\$1\$/);
    expect(verifyPassword("SenhaForte123", hash)).toBe(true);
    expect(verifyPassword("wrong", hash)).toBe(false);
  });

  it("keeps compatibility with legacy scrypt hashes", () => {
    const hash = hashPassword("SenhaForte123");
    const [, , , , salt, storedHash] = hash.split("$");
    const legacyScryptHash = `scrypt$${salt}$${storedHash}`;

    expect(verifyPassword("SenhaForte123", legacyScryptHash)).toBe(true);
    expect(verifyPassword("wrong", legacyScryptHash)).toBe(false);
  });

  it("keeps compatibility with legacy sha256 hashes", () => {
    const legacyHash = createHash("sha256").update("SenhaForte123").digest("hex");

    expect(verifyPassword("SenhaForte123", legacyHash)).toBe(true);
    expect(verifyPassword("wrong", legacyHash)).toBe(false);
  });
});
