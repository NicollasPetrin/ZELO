import { describe, expect, it } from "vitest";
import { calculateMonthlyPrice, canActivateAdditionalUser, formatPriceCents } from "./plans";

describe("calculateMonthlyPrice", () => {
  it("keeps the base price below the included user limit", () => {
    const price = calculateMonthlyPrice("BASIC", 3);

    expect(price.requiresUpgrade).toBe(false);
    expect(price.extraUsers).toBe(0);
    expect(price.totalPriceCents).toBe(5990);
  });

  it("keeps the base price exactly at the included user limit", () => {
    const price = calculateMonthlyPrice("MANAGEMENT", 20);

    expect(price.requiresUpgrade).toBe(false);
    expect(price.extraUsers).toBe(0);
    expect(price.totalPriceCents).toBe(24990);
  });

  it("adds the extra user price above the included user limit", () => {
    const price = calculateMonthlyPrice("COMPLETE", 63);

    expect(price.requiresUpgrade).toBe(false);
    expect(price.extraUsers).toBe(3);
    expect(price.extraUsersPriceCents).toBe(2970);
    expect(price.totalPriceCents).toBe(62960);
  });

  it("allows pricing exactly at the hard user cap", () => {
    const price = calculateMonthlyPrice("BASIC", 15);

    expect(price.requiresUpgrade).toBe(false);
    expect(price.extraUsers).toBe(10);
    expect(price.totalPriceCents).toBe(20890);
  });

  it("signals upgrade requirement above the hard user cap", () => {
    const price = calculateMonthlyPrice("MANAGEMENT", 46);

    expect(price.requiresUpgrade).toBe(true);
    expect(price.extraUsers).toBe(26);
    expect(price.totalPriceCents).toBeNull();
  });

  it("does not require upgrade for unlimited plans", () => {
    const price = calculateMonthlyPrice("COMPLETE", 140);

    expect(price.maxUsers).toBeNull();
    expect(price.requiresUpgrade).toBe(false);
    expect(price.extraUsers).toBe(80);
    expect(price.totalPriceCents).toBe(139190);
  });

  it("rejects invalid active user counts", () => {
    expect(() => calculateMonthlyPrice("BASIC", -1)).toThrow(RangeError);
    expect(() => calculateMonthlyPrice("BASIC", 1.5)).toThrow(RangeError);
  });
});

describe("canActivateAdditionalUser", () => {
  it("allows activation below the hard user cap", () => {
    expect(canActivateAdditionalUser("BASIC", 14)).toBe(true);
  });

  it("blocks activation at the hard user cap", () => {
    expect(canActivateAdditionalUser("BASIC", 15)).toBe(false);
  });

  it("allows activation for unlimited plans", () => {
    expect(canActivateAdditionalUser("COMPLETE", 140)).toBe(true);
  });

  it("rejects invalid current active user counts", () => {
    expect(() => canActivateAdditionalUser("MANAGEMENT", -1)).toThrow(RangeError);
    expect(() => canActivateAdditionalUser("MANAGEMENT", 1.5)).toThrow(RangeError);
  });
});

describe("formatPriceCents", () => {
  it("formats cents as Brazilian reais", () => {
    expect(formatPriceCents(26480)).toMatch(/^R\$\s?264,80$/);
  });
});
