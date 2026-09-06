import { describe, expect, it } from "vitest";
import { attachmentSchema, isSafeAttachmentUrl, signupSchema } from "./validations";

describe("signupSchema", () => {
  const validSignup = {
    companyName: "Zelo Cliente",
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

  // Nem numero nem minuscula entram na regra: quem quiser usar so maiusculas e
  // simbolos passa, desde que tenha os oito caracteres.
  it("nao exige numero nem minuscula", () => {
    expect(comSenha("SENHA@FORTE").success).toBe(true);
  });
});

describe("attachmentSchema", () => {
  const anexoValido = {
    taskId: "tarefa-1",
    fileName: "contrato.pdf",
    fileUrl: "https://arquivos.zelo.com/contrato.pdf",
  };

  function comEndereco(fileUrl: string) {
    return attachmentSchema.safeParse({ ...anexoValido, fileUrl });
  }

  it("aceita http, https e caminho do proprio site", () => {
    expect(comEndereco("https://arquivos.zelo.com/contrato.pdf").success).toBe(true);
    expect(comEndereco("http://arquivos.zelo.com/contrato.pdf").success).toBe(true);
    expect(comEndereco("/uploads/contrato.pdf").success).toBe(true);
  });

  it("recusa endereco que executa codigo ao ser clicado", () => {
    expect(comEndereco("javascript:alert(1)").success).toBe(false);
    expect(comEndereco("JavaScript:alert(1)").success).toBe(false);
    expect(comEndereco("data:text/html,<script>alert(1)</script>").success).toBe(false);
  });

  it("recusa o caminho que na verdade leva para outro dominio", () => {
    expect(isSafeAttachmentUrl("//outro.site/arquivo.pdf")).toBe(false);
    expect(isSafeAttachmentUrl("/\\outro.site/arquivo.pdf")).toBe(false);
    expect(isSafeAttachmentUrl("/uploads/contrato.pdf")).toBe(true);
  });
});
