import type { ConversationKind } from "@prisma/client";

export const SUPPORT_LABEL = "Suporte Zelo";

/** Quem responde pelo suporte aparece sempre com o mesmo nome para o cliente. */
export const SUPPORT_AUTHOR_LABEL = "Suporte Zelo";

export type ParticipantSummary = {
  userId: string;
  name: string;
};

/**
 * Nome que a conversa recebe na tela de quem esta olhando.
 *
 * Uma conversa entre duas pessoas nao tem titulo escrito por ninguem: o nome
 * dela e a outra pessoa. Por isso o rotulo depende de quem pergunta, e nao e um
 * campo guardado — guardar daria um titulo errado para um dos dois lados.
 */
export function conversationLabel(
  conversation: { kind: ConversationKind; title: string | null; participants: ParticipantSummary[] },
  currentUserId: string,
): string {
  if (conversation.kind === "SUPPORT") {
    return SUPPORT_LABEL;
  }

  if (conversation.title?.trim()) {
    return conversation.title.trim();
  }

  const outros = conversation.participants.filter((p) => p.userId !== currentUserId).map((p) => p.name);

  if (outros.length === 0) {
    return "So voce";
  }

  if (outros.length <= 2) {
    return outros.join(" e ");
  }

  return `${outros.slice(0, 2).join(", ")} e mais ${outros.length - 2}`;
}

/**
 * Se ha mensagem que a pessoa ainda nao viu.
 *
 * Comparar as duas datas evita contar mensagem por mensagem para cada conversa
 * da lista. Quem nunca abriu a conversa tem tudo por ler, desde que exista
 * alguma mensagem.
 */
export function hasUnread(lastMessageAt: Date | null, lastReadAt: Date | null): boolean {
  if (!lastMessageAt) {
    return false;
  }

  if (!lastReadAt) {
    return true;
  }

  return lastMessageAt.getTime() > lastReadAt.getTime();
}

/**
 * Se a mensagem deve aparecer colada na anterior, sem repetir autor e horario.
 *
 * Repetir o cabecalho a cada linha de uma sequencia da mesma pessoa polui a
 * leitura; o corte por tempo existe para que uma resposta horas depois volte a
 * se apresentar.
 */
const AGRUPAMENTO_MS = 5 * 60 * 1000;

export function sameBlock(
  anterior: { authorId: string | null; fromSupport: boolean; createdAt: Date } | undefined,
  atual: { authorId: string | null; fromSupport: boolean; createdAt: Date },
): boolean {
  if (!anterior) {
    return false;
  }

  if (anterior.fromSupport !== atual.fromSupport || anterior.authorId !== atual.authorId) {
    return false;
  }

  return atual.createdAt.getTime() - anterior.createdAt.getTime() <= AGRUPAMENTO_MS;
}

/**
 * Fuso fixo para as datas da conversa.
 *
 * Sem fixar, o mesmo instante vira dois textos diferentes: o servidor formata
 * no fuso dele (UTC, na hospedagem) e o navegador formata no fuso de quem
 * olha. Isso mostra a hora errada e ainda quebra a hidratacao, porque o React
 * encontra no HTML um texto diferente do que acabou de calcular. Como o produto
 * atende empresa brasileira, o horario de Brasilia e o horario certo para todo
 * mundo que le.
 */
const FUSO = "America/Sao_Paulo";

/** Rotulo curto de horario, no formato que a lista de mensagens usa. */
export function messageTime(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: FUSO }).format(date);
}

export function messageDay(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: FUSO,
  }).format(date);
}
