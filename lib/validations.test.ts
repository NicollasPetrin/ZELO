import { describe, expect, it } from "vitest";
import { signupSchema } from "./validations";

describe("signupSchema", () => {
  const validSignup = {
    companyName: "Zelo Cliente",
    segment: "Servicos",
    ownerName: "Nicollas Petrin",
    email: "cliente@zelo.com",
    password: "SenhaForte123",
    confirmPassword: "SenhaForte123",
  };

  it("rejects common weak passwords", () => {
    const result = signupSchema.safeParse({
      ...validSignup,
      password: "123456",
      confirmPassword: "123456",
    });

    expect(result.success).toBe(false);
  });

  it("accepts a strong password", () => {
    const result = signupSchema.safeParse(validSignup);

    expect(result.success).toBe(true);
  });
});
