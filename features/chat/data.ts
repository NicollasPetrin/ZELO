import "server-only";
import { Prisma, type ConversationKind } from "@prisma/client";
import type { CurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import {
  conversationLabel,
  departmentChannelKey,
  generalChannelKey,
  hasUnread,
  isChannel,
  visibleConversationsWhere,
  type ParticipantSummary,
} from "@/lib/chat";

/**
 * Garante que o chat geral da empresa e o chat da equipe da pessoa existem.
 *
 * Os canais nascem na primeira vez que alguem abre as Conversas, e nao no
 * cadastro da empresa ou do setor: assim empresas e setores que ja existiam
 * ganham os canais sem migracao de dados, e nenhum fluxo de cadastro precisa
 * lembrar de cria-los.
 */
export async function ensureChannels(user: CurrentUser) {
  const canais: Prisma.ConversationCreateInput[] = [
    {
      company: { connect: { id: user.companyId } },
      kind: "GENERAL",
      channelKey: generalChannelKey(user.companyId),
    },
  ];

  if (user.departmentId && user.department?.isActive) {
    canais.push({
      company: { connect: { id: user.companyId } },
      department: { connect: { id: user.departmentId } },
      kind: "DEPARTMENT",
      channelKey: departmentChannelKey(user.departmentId),
    });
  }

  for (const canal of canais) {
    try {
      await prisma.conversation.upsert({
        where: { channelKey: canal.channelKey! },
        create: canal,
        update: {},
        select: { id: true },
      });
    } catch (error) {
      // Duas pessoas abrindo ao mesmo tempo: a outra criou primeiro, e o canal
      // ja existe. E o resultado que se queria.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
        throw error;
      }
    }
  }
}

export type ConversationListItem = {
  id: string;
  kind: ConversationKind;
  label: string;
  /** Nas privadas, quem esta na conversa. Nos canais fica vazio: quem participa vem do cadastro. */
  participants: ParticipantSummary[];
  lastMessageAt: Date | null;
  unread: boolean;
};

/**
 * Conversas que a pessoa enxerga: as privadas e o suporte de que participa,
 * o chat geral e o chat da equipe dela. A regra de acesso e uma so
 * (visibleConversationsWhere) e vale aqui, na conversa aberta e no envio.
 */
export async function listConversations(user: CurrentUser): Promise<ConversationListItem[]> {
  const conversas = await prisma.conversation.findMany({
    where: visibleConversationsWhere(user),
    select: {
      id: true,
      kind: true,
      title: true,
      lastMessageAt: true,
      department: { select: { name: true } },
      participants: { select: { userId: true, lastReadAt: true, user: { select: { name: true } } } },
    },
  });

  return conversas
    .map((conversation) => {
      const canal = isChannel(conversation.kind);
      const participants = canal
        ? []
        : conversation.participants.map((p) => ({ userId: p.userId, name: p.user.name }));
      const lastReadAt = conversation.participants.find((p) => p.userId === user.id)?.lastReadAt ?? null;

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
  const conversas = await prisma.conversation.findMany({
    where: visibleConversationsWhere(user),
    select: {
      lastMessageAt: true,
      participants: { where: { userId: user.id }, select: { lastReadAt: true } },
    },
  });

  return conversas.filter((c) => hasUnread(c.lastMessageAt, c.participants[0]?.lastReadAt ?? null)).length;
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
 * Conversa aberta, com as mensagens. Devolve null quando a pessoa nao enxerga
 * a conversa — do lado de fora isso vira 404, e nao 403: quem nao participa
 * nao precisa descobrir que a conversa existe.
 */
export async function getConversation(user: CurrentUser, conversationId: string): Promise<ConversationDetail | null> {
  const conversation = await prisma.conversation.findFirst({
    where: { AND: [visibleConversationsWhere(user), { id: conversationId }] },
    select: {
      id: true,
      kind: true,
      title: true,
      departmentId: true,
      department: { select: { name: true } },
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

  // Nos canais, quem participa e quem esta na empresa (geral) ou no setor
  // (equipe) agora, e nao quem ja abriu a conversa alguma vez.
  const participants = isChannel(conversation.kind)
    ? await prisma.user.findMany({
        where: {
          companyId: user.companyId,
          isActive: true,
          ...(conversation.kind === "DEPARTMENT" ? { departmentId: conversation.departmentId } : {}),
        },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }).then((membros) => membros.map((m) => ({ userId: m.id, name: m.name })))
    : conversation.participants.map((p) => ({ userId: p.userId, name: p.user.name }));

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
