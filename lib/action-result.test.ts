import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { actionError } from "./action-result";

/** Reproduz um erro do Prisma sem precisar de banco: o que importa e o nome. */
function erroDoBanco(message: string) {
  const error = new Error(message);
  error.name = "PrismaClientKnownRequestError";

  return error;
}

describe("actionError", () => {
  it("mantem a mensagem escrita para o usuario", () => {
    const result = actionError(new Error("Apenas o dono pode gerenciar funcionarios."));

    expect(result).toEqual({ ok: false, error: "Apenas o dono pode gerenciar funcionarios." });
  });

  it("nao devolve o erro do banco para a tela", () => {
    const registrado = vi.spyOn(console, "error").mockImplementation(() => {});
    const erro = erroDoBanco(
      'Invalid `prisma.user.create()` invocation:\nUnique constraint failed on the fields: (`email`)',
    );

    const result = actionError(erro, "Nao foi possivel salvar o funcionario.");

    expect(result).toEqual({ ok: false, error: "Nao foi possivel salvar o funcionario." });
    // O detalhe nao some: sai no log do servidor, onde nao vira informacao para
    // quem esta do outro lado.
    expect(registrado).toHaveBeenCalled();
    registrado.mockRestore();
  });

  it("traduz erro de validacao na primeira mensagem, nao no JSON inteiro", () => {
    const registrado = vi.spyOn(console, "error").mockImplementation(() => {});
    const schema = z.object({ title: z.string().min(3, "Informe um titulo claro.") });

    let result;
    try {
      schema.parse({ title: "" });
    } catch (error) {
      result = actionError(error);
    }

    expect(result).toEqual({ ok: false, error: "Informe um titulo claro." });
    expect(registrado).not.toHaveBeenCalled();
    registrado.mockRestore();
  });

  it("usa a mensagem generica quando o valor lancado nao e um erro", () => {
    const registrado = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(actionError("qualquer coisa", "Nao deu.")).toEqual({ ok: false, error: "Nao deu." });
    expect(registrado).toHaveBeenCalled();
    registrado.mockRestore();
  });
});
