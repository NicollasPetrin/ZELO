import { describe, expect, it } from "vitest";
import { readText } from "./form-data";
import { signupSchema } from "./validations";

describe("readText", () => {
  it("devolve o texto quando o campo existe", () => {
    const form = new FormData();
    form.set("nome", "Zelo");

    expect(readText(form, "nome")).toBe("Zelo");
  });

  it("devolve o texto vazio quando o campo existe e esta em branco", () => {
    const form = new FormData();
    form.set("nome", "");

    expect(readText(form, "nome")).toBe("");
  });

  // O caso que quebrava o cadastro: formData.get devolve null para campo que o
  // formulario nao renderizou, e null derruba um `.optional()` do Zod.
  it("devolve undefined, e nao null, quando o campo nao existe", () => {
    expect(readText(new FormData(), "ausente")).toBeUndefined();
  });
});

describe("cadastro sem os campos de cobranca", () => {
  // Reproduz o formulario curto de /signup, que so renderiza empresa, documento,
  // segmento, nome, e-mail e senha. Antes disso, todo campo ausente virava null
  // e a validacao inteira falhava com "revise os dados" — culpando a senha, que
  // estava correta.
  it("aceita o envio do formulario curto", () => {
    const form = new FormData();
    form.set("companyName", "Zelo Teste");
    form.set("document", "");
    form.set("segment", "");
    form.set("ownerName", "Nicollas Petrin");
    form.set("email", "teste@zelo.com");
    form.set("password", "Toninhas1@");
    form.set("confirmPassword", "Toninhas1@");

    const parsed = signupSchema.safeParse({
      companyName: readText(form, "companyName"),
      document: readText(form, "document"),
      phone: readText(form, "phone"),
      postalCode: readText(form, "postalCode"),
      address: readText(form, "address"),
      addressNumber: readText(form, "addressNumber"),
      addressComplement: readText(form, "addressComplement"),
      province: readText(form, "province"),
      segment: readText(form, "segment"),
      ownerName: readText(form, "ownerName"),
      email: readText(form, "email"),
      password: readText(form, "password"),
      confirmPassword: readText(form, "confirmPassword"),
      plan: readText(form, "plan"),
      trial: readText(form, "trial"),
    });

    expect(parsed.success).toBe(true);
  });
});
