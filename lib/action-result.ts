import { ZodError } from "zod";

export type ActionResult<T = undefined> = T extends undefined
  ? { ok: true; message?: string } | { ok: false; error: string }
  : { ok: true; data: T; message?: string } | { ok: false; error: string };

/**
 * Erro vindo do banco.
 *
 * Reconhecido pelo nome, e nao por `instanceof`, para que este modulo — que
 * todas as acoes importam — nao precise carregar o runtime do Prisma junto, e
 * para continuar funcionando quando o erro atravessa outra instancia do
 * cliente.
 */
function isDatabaseError(error: Error) {
  return error.name.startsWith("PrismaClient");
}

/**
 * Mensagem que pode ser entregue ao usuario, ou null quando o erro so serve
 * para o log.
 *
 * As acoes usam `throw new Error("texto para a tela")` para recusar uma
 * operacao, e esse texto e escrito para ser lido. Ja o erro do banco carrega a
 * consulta que falhou, o nome das colunas e as vezes o caminho do arquivo:
 * repassar isso ao navegador entrega o desenho interno da aplicacao a quem
 * apenas tentou salvar um formulario. O erro do Zod tambem nao serve: a
 * mensagem dele e o JSON inteiro das validacoes que falharam.
 */
function readableMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? null;
  }

  if (error instanceof Error) {
    return isDatabaseError(error) ? null : error.message;
  }

  return null;
}

export function actionError(error: unknown, fallback = "Nao foi possivel concluir a acao.") {
  const message = readableMessage(error);

  if (!message) {
    // Sem isto o problema desapareceria: a tela mostra a mensagem generica, e
    // nada sobraria para descobrir o que de fato quebrou.
    console.error("[action] falha nao tratada:", error);

    return { ok: false, error: fallback } as const;
  }

  return { ok: false, error: message } as const;
}
