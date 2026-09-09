import "server-only";
import { prisma } from "@/lib/db/client";

export type SupportThread = {
  id: string;
  companyId: string;
  companyName: string;
  companyPlan: string | null;
  lastMessageAt: Date | null;
  lastMessageBody: string | null;
  /// Ultima palavra e do cliente: alguem esta esperando resposta.
  waiting: boolean;
  messageCount: number;
};

/**
 * Caixa de entrada do suporte, cruzando todas as empresas.
 *
 * Como as demais consultas desta area, so pode ser chamada atras de
 * requirePlatformAdmin: e uma leitura sem filtro por empresa, que em qualquer
 * outro lugar do sistema seria vazamento.
 *
 * "Esperando" e derivado de quem escreveu por ultimo, e nao de um campo de
 * lido: um marcador de lido diria que alguem abriu a conversa, e o que importa
 * para o cliente e se a pergunta dele ja foi respondida.
 */
export async function listSupportThreads(): Promise<SupportThread[]> {
  const conversas = await prisma.conversation.findMany({
    where: { kind: "SUPPORT" },
    orderBy: { lastMessageAt: "desc" },
    select: {
      id: true,
      companyId: true,
      lastMessageAt: true,
      company: { select: { name: true, plan: true } },
      _count: { select: { messages: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, fromSupport: true },
      },
    },
  });

  return conversas.map((conversa) => {
    const ultima = conversa.messages[0] ?? null;

    return {
      id: conversa.id,
      companyId: conversa.companyId,
      companyName: conversa.company.name,
      companyPlan: conversa.company.plan,
      lastMessageAt: conversa.lastMessageAt,
      lastMessageBody: ultima?.body ?? null,
      waiting: Boolean(ultima && !ultima.fromSupport),
      messageCount: conversa._count.messages,
    };
  });
}

export async function getSupportThread(conversationId: string) {
  return prisma.conversation.findFirst({
    where: { id: conversationId, kind: "SUPPORT" },
    select: {
      id: true,
      company: { select: { id: true, name: true, document: true, email: true, phone: true, plan: true } },
      participants: { select: { user: { select: { name: true, email: true, role: true } } } },
      messages: {
        orderBy: { createdAt: "asc" },
        take: 300,
        select: {
          id: true,
          body: true,
          fromSupport: true,
          createdAt: true,
          author: { select: { name: true } },
        },
      },
    },
  });
}
