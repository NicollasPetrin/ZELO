import { describe, expect, it } from "vitest";
import { buildLogoKey, companyInitials, LOGO_MAX_BYTES, sniffImageType, validateLogoFile } from "./company-logo";

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50]);
const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

describe("sniffImageType", () => {
  it("recognises PNG, JPG and WEBP by their bytes", () => {
    expect(sniffImageType(png)).toBe("image/png");
    expect(sniffImageType(jpg)).toBe("image/jpeg");
    expect(sniffImageType(webp)).toBe("image/webp");
  });

  it("does not recognise SVG or anything else", () => {
    expect(sniffImageType(svg)).toBeNull();
    expect(sniffImageType(new Uint8Array([1, 2, 3]))).toBeNull();
  });
});

describe("validateLogoFile", () => {
  it("accepts a real image and returns the type read from the bytes", () => {
    expect(validateLogoFile({ size: 1000, bytes: webp })).toEqual({ ok: true, extension: "webp", contentType: "image/webp" });
  });

  it("refuses SVG even if it claims to be an image", () => {
    expect(validateLogoFile({ size: svg.length, bytes: svg }).ok).toBe(false);
  });

  it("refuses files over 2 MB and empty files", () => {
    expect(validateLogoFile({ size: LOGO_MAX_BYTES + 1, bytes: png }).ok).toBe(false);
    expect(validateLogoFile({ size: 0, bytes: new Uint8Array() }).ok).toBe(false);
  });
});

describe("buildLogoKey", () => {
  it("keeps the logo under the company folder", () => {
    expect(buildLogoKey("c-1", "l-1", "png")).toBe("empresas/c-1/logo/l-1.png");
  });
});

describe("companyInitials", () => {
  it("takes the first letters of the first two meaningful words", () => {
    expect(companyInitials("Mercado Bom Preço")).toBe("MB");
    expect(companyInitials("Padaria do Zé")).toBe("PZ");
    expect(companyInitials("Zelo")).toBe("Z");
    expect(companyInitials("açougue central ltda")).toBe("AC");
  });
});
