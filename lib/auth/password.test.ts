import { createHash } from "crypto";
import { describe, expect, it } from "vitest";
import { hashPassword, needsRehash, verifyPassword } from "./password";

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

describe("needsRehash", () => {
  it("leaves a current scrypt hash alone", () => {
    expect(needsRehash(hashPassword("SenhaForte123"))).toBe(false);
  });

  it("flags an unsalted sha256 hash, which a database leak would give away", () => {
    const legacyHash = createHash("sha256").update("SenhaForte123").digest("hex");

    expect(needsRehash(legacyHash)).toBe(true);
  });

  it("flags a legacy scrypt hash that carries no parameters", () => {
    const [, , , , salt, storedHash] = hashPassword("SenhaForte123").split("$");

    expect(needsRehash(`scrypt$${salt}$${storedHash}`)).toBe(true);
  });

  it("flags a scrypt hash derived with a weaker cost", () => {
    const [, , r, p, salt, storedHash] = hashPassword("SenhaForte123").split("$");

    expect(needsRehash(`scrypt$1024$${r}$${p}$${salt}$${storedHash}`)).toBe(true);
  });
});
