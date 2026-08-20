import { describe, expect, it } from "vitest";
import { decodeCheckoutReference, encodeCheckoutReference } from "./reference";

describe("checkout reference", () => {
  it("round-trips company and plan", () => {
    const encoded = encodeCheckoutReference({ companyId: "cmp_123", planCode: "MANAGEMENT" });

    expect(decodeCheckoutReference(encoded)).toEqual({ companyId: "cmp_123", planCode: "MANAGEMENT" });
  });

  it("round-trips every plan in the catalogue", () => {
    for (const planCode of ["BASIC", "MANAGEMENT", "COMPLETE"] as const) {
      const encoded = encodeCheckoutReference({ companyId: "cmp_1", planCode });

      expect(decodeCheckoutReference(encoded)?.planCode).toBe(planCode);
    }
  });

  it("refuses a reference that is not ours, so an unrelated charge grants nothing", () => {
    expect(decodeCheckoutReference("outro-sistema:cmp_1:BASIC")).toBeNull();
    expect(decodeCheckoutReference("cmp_1")).toBeNull();
    expect(decodeCheckoutReference("")).toBeNull();
    expect(decodeCheckoutReference(null)).toBeNull();
    expect(decodeCheckoutReference(undefined)).toBeNull();
  });

  it("refuses an unknown plan instead of granting something arbitrary", () => {
    expect(decodeCheckoutReference("zelo:cmp_1:ENTERPRISE")).toBeNull();
    expect(decodeCheckoutReference("zelo:cmp_1:")).toBeNull();
  });

  it("refuses a reference without a company", () => {
    expect(decodeCheckoutReference("zelo::BASIC")).toBeNull();
  });

  it("refuses extra segments rather than guessing", () => {
    expect(decodeCheckoutReference("zelo:cmp_1:BASIC:extra")).toBeNull();
  });
});
