import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "./secret-box";

const segredo = "segredo-da-aplicacao-com-tamanho-suficiente";
const token = "1//0aRefreshTokenDoGoogle-abcdef";

describe("secret-box", () => {
  it("gives back exactly what was stored", () => {
    expect(decryptSecret(encryptSecret(token, segredo), segredo)).toBe(token);
  });

  it("does not leave the secret readable in what goes to the database", () => {
    const guardado = encryptSecret(token, segredo);

    expect(guardado).not.toContain(token);
    expect(guardado).not.toContain("RefreshToken");
  });

  it("produces a different ciphertext every time, so equal tokens do not look equal", () => {
    expect(encryptSecret(token, segredo)).not.toBe(encryptSecret(token, segredo));
  });

  it("refuses to open with the wrong key instead of returning garbage", () => {
    const guardado = encryptSecret(token, segredo);

    expect(() => decryptSecret(guardado, "outro-segredo-completamente-diferente")).toThrow();
  });

  it("refuses content that was tampered with", () => {
    const guardado = encryptSecret(token, segredo);
    const partes = guardado.split(".");
    // Troca um caractere do texto cifrado.
    partes[3] = partes[3].slice(0, -1) + (partes[3].endsWith("A") ? "B" : "A");

    expect(() => decryptSecret(partes.join("."), segredo)).toThrow();
  });

  it("refuses a format it does not recognise", () => {
    expect(() => decryptSecret("texto-puro", segredo)).toThrow(/formato desconhecido/i);
    expect(() => decryptSecret("v2.a.b.c", segredo)).toThrow(/formato desconhecido/i);
  });

  it("handles accents and long text, which appear in names and notes", () => {
    const texto = "Reposição de estoque — açaí, pão e água. ".repeat(50);

    expect(decryptSecret(encryptSecret(texto, segredo), segredo)).toBe(texto);
  });
});
