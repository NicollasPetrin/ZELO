import { describe, expect, it } from "vitest";
import { formatDocument, isValidDocument, maskDocument, onlyDigits, parseDocument } from "./document";

// Documentos com digitos verificadores corretos, usados so em teste.
const CNPJ_VALIDO = "11222333000181";
const CPF_VALIDO = "52998224725";

describe("parseDocument", () => {
  it("accepts a valid CNPJ and reports its kind", () => {
    expect(parseDocument(CNPJ_VALIDO)).toEqual({ digits: CNPJ_VALIDO, kind: "CNPJ" });
  });

  it("accepts a valid CPF, since a sole trader bills under one", () => {
    expect(parseDocument(CPF_VALIDO)).toEqual({ digits: CPF_VALIDO, kind: "CPF" });
  });

  it("accepts punctuation and normalises to digits", () => {
    expect(parseDocument("11.222.333/0001-81")?.digits).toBe(CNPJ_VALIDO);
    expect(parseDocument("529.982.247-25")?.digits).toBe(CPF_VALIDO);
    expect(parseDocument("  11222333000181  ")?.digits).toBe(CNPJ_VALIDO);
  });

  it("rejects a wrong check digit, which is the whole point of validating", () => {
    expect(parseDocument("11222333000182")).toBeNull();
    expect(parseDocument("52998224726")).toBeNull();
  });

  it("rejects repeated digits that pass the arithmetic but do not exist", () => {
    expect(parseDocument("00000000000000")).toBeNull();
    expect(parseDocument("11111111111")).toBeNull();
    expect(parseDocument("99999999999999")).toBeNull();
  });

  it("rejects wrong lengths", () => {
    expect(parseDocument("112223330001")).toBeNull();
    expect(parseDocument("529982247")).toBeNull();
    expect(parseDocument("112223330001812")).toBeNull();
  });

  it("rejects empty and missing values", () => {
    expect(parseDocument("")).toBeNull();
    expect(parseDocument(null)).toBeNull();
    expect(parseDocument(undefined)).toBeNull();
    expect(parseDocument("abcdefghijk")).toBeNull();
  });
});

describe("isValidDocument", () => {
  it("mirrors parseDocument", () => {
    expect(isValidDocument(CNPJ_VALIDO)).toBe(true);
    expect(isValidDocument("11222333000182")).toBe(false);
  });
});

describe("formatDocument", () => {
  it("formats each kind in its usual shape", () => {
    expect(formatDocument(CNPJ_VALIDO)).toBe("11.222.333/0001-81");
    expect(formatDocument(CPF_VALIDO)).toBe("529.982.247-25");
  });

  it("returns the input untouched when it cannot be parsed", () => {
    expect(formatDocument("nao e documento")).toBe("nao e documento");
    expect(formatDocument(null)).toBe("");
  });
});

describe("maskDocument", () => {
  it("hides the middle so a full document is not reproduced needlessly", () => {
    const masked = maskDocument(CNPJ_VALIDO);

    expect(masked.startsWith("112")).toBe(true);
    expect(masked.endsWith("81")).toBe(true);
    expect(masked).not.toContain("222333");
    expect(masked).toHaveLength(CNPJ_VALIDO.length);
  });

  it("masks a CPF the same way", () => {
    const masked = maskDocument(CPF_VALIDO);

    expect(masked.startsWith("529")).toBe(true);
    expect(masked.endsWith("25")).toBe(true);
    expect(masked).not.toContain("982247");
  });

  it("returns empty for an invalid document rather than leaking it", () => {
    expect(maskDocument("11222333000182")).toBe("");
    expect(maskDocument(null)).toBe("");
  });
});

describe("onlyDigits", () => {
  it("strips everything that is not a digit", () => {
    expect(onlyDigits("11.222.333/0001-81")).toBe(CNPJ_VALIDO);
  });
});
