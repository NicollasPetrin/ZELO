/**
 * Comparacao da lista de administradores da plataforma.
 *
 * Fica separado do modulo de ambiente para poder ser testado: e a regra que
 * decide quem enxerga os dados de todas as empresas, e uma regra dessas nao
 * deveria depender de leitura atenta para se ter certeza de que esta certa.
 */
export function parseAdminEmails(raw: string | undefined | null) {
  return (raw ?? "")
    .split(",")
    // As aspas caem porque num arquivo .env elas delimitam o valor, e no painel
    // do Railway o valor vai cru. Quem copia a linha do .env.example para o
    // painel leva as aspas junto, e sem isto entraria com a conta certa e
    // levaria 404, sem nada indicando o motivo.
    .map((email) => email.trim().replace(/^["']|["']$/g, "").trim().toLowerCase())
    .filter(Boolean);
}

export function emailIsAllowed(allowlist: string[], email: string | undefined | null) {
  const alvo = (email ?? "").trim().toLowerCase();

  // Lista vazia nunca libera: uma variavel esquecida no deploy tem de fechar a
  // porta, e nao abri-la para todo mundo.
  if (allowlist.length === 0 || !alvo) {
    return false;
  }

  return allowlist.includes(alvo);
}
