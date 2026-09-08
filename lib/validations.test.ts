import { describe, expect, it } from "vitest";
import { signupSchema } from "./validations";

describe("signupSchema", () => {
  const validSignup = {
    companyName: "Zelo Cliente",
    document: "11222333000181",
    phone: "11987654321",
    postalCode: "01310100",
    address: "Avenida Paulista",
    addressNumber: "1000",
    province: "Bela Vista",
    segment: "Servicos",
    ownerName: "Nicollas Petrin",
    email: "cliente@zelo.com",
    password: "SenhaForte!",
    confirmPassword: "SenhaForte!",
  };

  function comSenha(password: string) {
    return signupSchema.safeParse({ ...validSignup, password, confirmPassword: password });
  }

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

  it("exige oito caracteres", () => {
    expect(comSenha("Senha!1").success).toBe(false);
    expect(comSenha("Senha!12").success).toBe(true);
  });

  it("exige uma letra maiuscula", () => {
    expect(comSenha("senhaforte!").success).toBe(false);
  });

  it("exige um caractere especial", () => {
    expect(comSenha("SenhaForte1").success).toBe(false);
  });

  it("exige o documento da empresa, que e a chave de um teste por empresa", () => {
    expect(signupSchema.safeParse({ ...validSignup, document: "" }).success).toBe(false);
    expect(signupSchema.safeParse({ ...validSignup, document: "12345678000100" }).success).toBe(false);
  });

  it("exige os dados que a cobranca vai precisar, para nao pedi-los de novo depois", () => {
    for (const campo of ["phone", "postalCode", "address", "addressNumber", "province"] as const) {
      expect(signupSchema.safeParse({ ...validSignup, [campo]: "" }).success).toBe(false);
    }
  });

  it("aceita cadastro sem plano: escolher plano acontece depois, ja dentro do produto", () => {
    expect(signupSchema.safeParse({ ...validSignup, plan: "" }).success).toBe(true);
  });

  it("nao exige complemento, o unico campo de endereco que a cobranca dispensa", () => {
    expect(signupSchema.safeParse({ ...validSignup, addressComplement: "" }).success).toBe(true);
  });

  // Nem numero nem minuscula entram na regra: quem quiser usar so maiusculas e
  // simbolos passa, desde que tenha os oito caracteres.
  it("nao exige numero nem minuscula", () => {
    expect(comSenha("SENHA@FORTE").success).toBe(true);
  });
});
