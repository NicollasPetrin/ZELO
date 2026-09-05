import { describe, expect, it } from "vitest";
import { emailIsAllowed, parseAdminEmails } from "./admin-allowlist";

describe("parseAdminEmails", () => {
  it("aceita a lista separada por virgula, ignorando espaco e caixa", () => {
    expect(parseAdminEmails(" Dono@Zelo.com , outro@zelo.com ")).toEqual(["dono@zelo.com", "outro@zelo.com"]);
  });

  it("descarta entradas vazias de virgula sobrando", () => {
    expect(parseAdminEmails("dono@zelo.com,,")).toEqual(["dono@zelo.com"]);
  });

  it("trata variavel ausente como lista vazia", () => {
    expect(parseAdminEmails(undefined)).toEqual([]);
    expect(parseAdminEmails("")).toEqual([]);
  });
});

describe("emailIsAllowed", () => {
  const lista = parseAdminEmails("dono@zelo.com");

  it("libera quem esta na lista, em qualquer caixa", () => {
    expect(emailIsAllowed(lista, "dono@zelo.com")).toBe(true);
    expect(emailIsAllowed(lista, "DONO@ZELO.COM")).toBe(true);
    expect(emailIsAllowed(lista, "  dono@zelo.com  ")).toBe(true);
  });

  it("barra quem nao esta", () => {
    expect(emailIsAllowed(lista, "outro@zelo.com")).toBe(false);
  });

  // O caso que importa: variavel esquecida no deploy tem de fechar a porta para
  // todo mundo, e nao abri-la porque "nao ha restricao configurada".
  it("nao libera ninguem quando a lista esta vazia", () => {
    expect(emailIsAllowed([], "dono@zelo.com")).toBe(false);
    expect(emailIsAllowed([], "")).toBe(false);
  });

  it("nao libera e-mail ausente nem vazio", () => {
    expect(emailIsAllowed(lista, undefined)).toBe(false);
    expect(emailIsAllowed(lista, "   ")).toBe(false);
  });
});
