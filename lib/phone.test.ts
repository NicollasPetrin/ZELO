import { describe, expect, it } from "vitest";
import { formatPhone, isValidPhone, parsePhone } from "./phone";

describe("parsePhone", () => {
  it("accepts a mobile number", () => {
    expect(parsePhone("11987654321")).toEqual({ digits: "11987654321", isMobile: true });
  });

  it("accepts a landline", () => {
    expect(parsePhone("1133334444")).toEqual({ digits: "1133334444", isMobile: false });
  });

  it("accepts the shapes people actually paste", () => {
    expect(parsePhone("(11) 98765-4321")?.digits).toBe("11987654321");
    expect(parsePhone("+55 11 98765-4321")?.digits).toBe("11987654321");
    expect(parsePhone("55 11 3333 4444")?.digits).toBe("1133334444");
    expect(parsePhone("  11 9 8765 4321 ")?.digits).toBe("11987654321");
  });

  it("rejects an area code that does not exist", () => {
    expect(parsePhone("10987654321")).toBeNull();
    expect(parsePhone("20987654321")).toBeNull();
    expect(parsePhone("00987654321")).toBeNull();
  });

  it("rejects an 11 digit number that does not start with 9 after the area code", () => {
    expect(parsePhone("11887654321")).toBeNull();
  });

  it("rejects a landline starting with 0 or 1 after the area code", () => {
    expect(parsePhone("1103334444")).toBeNull();
    expect(parsePhone("1113334444")).toBeNull();
  });

  it("rejects wrong lengths", () => {
    expect(parsePhone("119876543")).toBeNull();
    expect(parsePhone("119876543210")).toBeNull();
    expect(parsePhone("")).toBeNull();
    expect(parsePhone(null)).toBeNull();
    expect(parsePhone(undefined)).toBeNull();
  });
});

describe("isValidPhone", () => {
  it("mirrors parsePhone", () => {
    expect(isValidPhone("(11) 98765-4321")).toBe(true);
    expect(isValidPhone("119")).toBe(false);
  });
});

describe("formatPhone", () => {
  it("formats mobile and landline differently", () => {
    expect(formatPhone("11987654321")).toBe("(11) 98765-4321");
    expect(formatPhone("1133334444")).toBe("(11) 3333-4444");
  });

  it("returns the input untouched when it cannot be parsed", () => {
    expect(formatPhone("nao e telefone")).toBe("nao e telefone");
    expect(formatPhone(null)).toBe("");
  });
});
