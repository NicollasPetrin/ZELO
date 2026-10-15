import type { ConversationKind, Prisma } from "@prisma/client";

export const SUPPORT_LABEL = "Suporte Zelo";

export const GENERAL_LABEL = "Geral";

/** Quem responde pelo suporte aparece sempre com o mesmo nome para o cliente. */
export const SUPPORT_AUTHOR_LABEL = "Suporte Zelo";

export type ParticipantSummary = {
  userId: string;
  name: string;
};

/** Chat geral e chat da equipe: canais em que ninguem e convidado, quem participa vem do cadastro. */
export function isChannel(kind: ConversationKind) {
  return kind === "GENERAL" || kind === "DEPARTMENT";
}

export function generalChannelKey(companyId: string) {
  return `general:${companyId}`;
}

export function departmentChannelKey(departmentId: string) {
  return `department:${departmentId}`;
}

/**
 * Quais conversas a pessoa enxerga. E a unica regra de acesso do chat: lista,
 * conversa aberta, envio e marcacao de lida passam todos por aqui, para que um
 * caminho novo nao tenha como esquecer um filtro.
 *
 * - Privada e suporte: so quem esta na lista de participantes.
 * - Geral: todo mundo da empresa.
 * - Equipe: quem esta no setor hoje, e o setor precisa estar ativo. Mudar a
 *   pessoa de setor ja a coloca no chat novo e tira do antigo.
 *
 * Nos canais a linha de participante nao conta como acesso. Ela fica para tras
 * quando a pessoa muda de setor (guardava ate onde ela leu), e contar com ela
 * deixaria quem saiu da equipe lendo a conversa da equipe antiga.
 */
export function visibleConversationsWhere(user: {
  id: string;
  companyId: string;
  departmentId: string | null;
}): Prisma.ConversationWhereInput {
  const acessos: Prisma.ConversationWhereInput[] = [
    { kind: { in: ["COMPANY", "SUPPORT"] }, participants: { some: { userId: user.id } } },
    { kind: "GENERAL" },
  ];

  if (user.departmentId) {
    acessos.push({ kind: "DEPARTMENT", departmentId: user.departmentId, department: { isActive: true } });
  }

  return { companyId: user.companyId, OR: acessos };
}

/**
 * Nome que a conversa recebe na tela de quem esta olhando.
 *
 * Uma conversa entre duas pessoas nao tem titulo escrito por ninguem: o nome
 * dela e a outra pessoa. Por isso o rotulo depende de quem pergunta, e nao e um
 * campo guardado — guardar daria um titulo errado para um dos dois lados.
 */
export function conversationLabel(
  conversation: {
    kind: ConversationKind;
    title: string | null;
    participants: ParticipantSummary[];
    department?: { name: string } | null;
  },
  currentUserId: string,
): string {
  if (conversation.kind === "SUPPORT") {
    return SUPPORT_LABEL;
  }

  if (conversation.kind === "GENERAL") {
    return GENERAL_LABEL;
  }

  // O nome vem do setor, e nao de um titulo guardado: renomear o setor ja
  // renomeia o chat.
  if (conversation.kind === "DEPARTMENT") {
    return `Equipe ${conversation.department?.name ?? ""}`.trim();
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
