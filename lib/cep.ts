export type CepResultado =
  | { ok: true; address: string; province: string; city: string; state: string }
  | { ok: false; motivo: "invalido" | "naoEncontrado" | "indisponivel" };

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

/**
 * Consulta um CEP pela rota da propria aplicacao.
 *
 * Nunca lanca: preencher endereco sozinho e conveniencia, e uma falha aqui so
 * significa que a pessoa digita na mao. Quem chama decide o que dizer a partir
 * do motivo.
 */
export async function lookupCep(cep: string): Promise<CepResultado> {
  const digitos = onlyDigits(cep);

  if (digitos.length !== 8) {
    return { ok: false, motivo: "invalido" };
  }

  try {
    const resposta = await fetch(`/api/cep?cep=${digitos}`);

    if (!resposta.ok) {
      return { ok: false, motivo: resposta.status === 404 ? "naoEncontrado" : "indisponivel" };
    }

    const dados = await resposta.json();

    return {
      ok: true,
      address: dados.address ?? "",
      province: dados.province ?? "",
      city: dados.city ?? "",
      state: dados.state ?? "",
    };
  } catch {
    return { ok: false, motivo: "indisponivel" };
  }
}

export const CEP_MENSAGENS: Record<"buscando" | "preenchido" | "naoEncontrado" | "indisponivel", string> = {
  buscando: "Buscando endereco...",
  preenchido: "Endereco preenchido pelo CEP. Confira o numero.",
  naoEncontrado: "CEP nao encontrado. Preencha o endereco manualmente.",
  indisponivel: "Nao foi possivel consultar o CEP. Preencha o endereco manualmente.",
};
