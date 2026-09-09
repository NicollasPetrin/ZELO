import "server-only";
import type { ConversationKind } from "@prisma/client";
import type { CurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { conversationLabel, hasUnread, type ParticipantSummary } from "@/lib/chat";

export type ConversationListItem = {
  id: string;
  kind: ConversationKind;
  label: string;
  participants: ParticipantSummary[];
  lastMessageAt: Date | null;
  unread: boolean;
};

/**
 * Conversas que a pessoa participa.
 *
 * A regra de leitura e uma so em todo o chat: voce enxerga aquilo de que
 * participa. Nao existe consulta por empresa nem por papel — assim nao ha como
 * um caminho novo esquecer o filtro e mostrar conversa dos outros.
 */
export async function listConversations(user: CurrentUser): Promise<ConversationListItem[]> {
  const participacoes = await prisma.conversationParticipant.findMany({
    where: { userId: user.id, conversation: { companyId: user.companyId } },
    select: {
      lastReadAt: true,
      conversation: {
        select: {
          id: true,
          kind: true,
          title: true,
          lastMessageAt: true,
          participants: { select: { userId: true, user: { select: { name: true } } } },
        },
      },
    },
  });

  return participacoes
    .map(({ lastReadAt, conversation }) => {
      const participants = conversation.participants.map((p) => ({ userId: p.userId, name: p.user.name }));

      return {
        id: conversation.id,
        kind: conversation.kind,
        label: conversationLabel({ ...conversation, participants }, user.id),
        participants,
        lastMessageAt: conversation.lastMessageAt,
        unread: hasUnread(conversation.lastMessageAt, lastReadAt),
      };
    })
    .sort((a, b) => {
      // Suporte primeiro quando tem novidade; depois, conversa mais recente.
      if (a.unread !== b.unread) {
        return a.unread ? -1 : 1;
      }

      return (b.lastMessageAt?.getTime() ?? 0) - (a.lastMessageAt?.getTime() ?? 0);
    });
}

/** Quantas conversas tem mensagem nao lida. Alimenta o aviso no menu. */
export async function countUnreadConversations(user: CurrentUser) {
  const participacoes = await prisma.conversationParticipant.findMany({
    where: { userId: user.id, conversation: { companyId: user.companyId } },
    select: { lastReadAt: true, conversation: { select: { lastMessageAt: true } } },
  });

  return participacoes.filter((p) => hasUnread(p.conversation.lastMessageAt, p.lastReadAt)).length;
}

export type ConversationMessage = {
  id: string;
  authorId: string | null;
  authorName: string;
  fromSupport: boolean;
  body: string;
  createdAt: Date;
};

export type ConversationDetail = {
  id: string;
  kind: ConversationKind;
  label: string;
  participants: ParticipantSummary[];
  messages: ConversationMessage[];
};

/** Quantas mensagens uma conversa carrega de uma vez. */
const PAGINA = 200;

/**
 * Conversa aberta, com as mensagens. Devolve null quando a pessoa nao participa
 * — do lado de fora isso vira 404, e nao 403: quem nao participa nao precisa
 * descobrir que a conversa existe.
 */
export async function getConversation(user: CurrentUser, conversationId: string): Promise<ConversationDetail | null> {
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      companyId: user.companyId,
      participants: { some: { userId: user.id } },
    },
    select: {
      id: true,
      kind: true,
      title: true,
      participants: { select: { userId: true, user: { select: { name: true } } } },
      messages: {
        orderBy: { createdAt: "asc" },
        take: PAGINA,
        select: {
          id: true,
          authorId: true,
          fromSupport: true,
          body: true,
          createdAt: true,
          author: { select: { name: true } },
        },
      },
    },
  });

  if (!conversation) {
    return null;
  }

  const participants = conversation.participants.map((p) => ({ userId: p.userId, name: p.user.name }));

  return {
    id: conversation.id,
    kind: conversation.kind,
    label: conversationLabel({ ...conversation, participants }, user.id),
    participants,
    messages: conversation.messages.map((m) => ({
      id: m.id,
      authorId: m.authorId,
      // Conta apagada nao apaga a conversa: a mensagem continua, sem dono.
      authorName: m.author?.name ?? "Usuario removido",
      fromSupport: m.fromSupport,
      body: m.body,
      createdAt: m.createdAt,
    })),
  };
}

/** Colegas com quem da para comecar uma conversa. */
export async function listColleagues(user: CurrentUser) {
  return prisma.user.findMany({
    where: { companyId: user.companyId, isActive: true, id: { not: user.id } },
    select: { id: true, name: true, position: true, department: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
}
