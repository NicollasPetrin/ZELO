"use server";

import { revalidatePath } from "next/cache";
import type { ConversationKind } from "@prisma/client";
import { actionError } from "@/lib/action-result";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { visibleConversationsWhere } from "@/lib/chat";
import { assertUserActionRateLimit } from "@/lib/rate-limit";
import { assertCompanyHasActivePlan } from "@/lib/subscription";
import { idSchema, messageSchema, newConversationSchema } from "@/lib/validations";

/**
 * Conversa com o suporte fica de fora da trava de assinatura.
 *
 * Boa parte do que alguem precisa perguntar ao suporte e justamente por que nao
 * consegue pagar ou por que o plano nao liberou. Bloquear esse canal por falta
 * de assinatura fecharia a porta exatamente para quem mais precisa dela.
 */
async function assertPodeConversar(user: Awaited<ReturnType<typeof requireUser>>, kind: ConversationKind) {
  if (kind === "SUPPORT") {
    return;
  }

  assertCompanyHasActivePlan(user.company);
}

export async function sendMessageAction(values: unknown) {
  try {
    const user = await requireUser();
    await assertUserActionRateLimit(user.id, "chat:send-message");
    const parsed = messageSchema.parse(values);

    // Enxergar a conversa e a unica credencial que vale aqui; sem isso,
    // conhecer o id bastaria para escrever em qualquer conversa da empresa.
    const conversation = await prisma.conversation.findFirst({
      where: { AND: [visibleConversationsWhere(user), { id: parsed.conversationId }] },
      select: { id: true, kind: true },
    });

    if (!conversation) {
      throw new Error("Conversa não encontrada.");
    }

    await assertPodeConversar(user, conversation.kind);

    const agora = new Date();

    await prisma.$transaction([
      prisma.message.create({
        data: { conversationId: conversation.id, authorId: user.id, body: parsed.body },
      }),
      prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: agora },
      }),
      // Quem escreveu ja leu o que escreveu. Upsert porque no chat geral e no
      // da equipe a pessoa pode estar escrevendo pela primeira vez.
      prisma.conversationParticipant.upsert({
        where: { conversationId_userId: { conversationId: conversation.id, userId: user.id } },
        create: { conversationId: conversation.id, userId: user.id, lastReadAt: agora },
        update: { lastReadAt: agora },
      }),
    ]);

    revalidatePath(`/conversas/${conversation.id}`);
    revalidatePath("/conversas");

    return { ok: true, message: "Mensagem enviada." } as const;
  } catch (error) {
    return actionError(error, "Não foi possível enviar a mensagem.");
  }
}

export async function markConversationReadAction(conversationId: unknown) {
  try {
    const user = await requireUser();
    const id = idSchema.parse(conversationId);

    const conversation = await prisma.conversation.findFirst({
      where: { AND: [visibleConversationsWhere(user), { id }] },
      select: { id: true },
    });

    if (conversation) {
      // A marca de lida so e gravada depois de conferir o acesso. Nos canais a
      // linha nasce aqui, na primeira leitura; nas privadas e no suporte ela ja
      // existia, porque e ela que da o acesso.
      const agora = new Date();
      await prisma.conversationParticipant.upsert({
        where: { conversationId_userId: { conversationId: id, userId: user.id } },
        create: { conversationId: id, userId: user.id, lastReadAt: agora },
        update: { lastReadAt: agora },
      });

      revalidatePath("/conversas");
      revalidatePath("/", "layout");
    }

    return { ok: true } as const;
  } catch (error) {
    return actionError(error, "Não foi possível marcar a conversa como lida.");
  }
}

export async function createConversationAction(values: unknown) {
  try {
    const user = await requireUser();
    assertCompanyHasActivePlan(user.company);
    await assertUserActionRateLimit(user.id, "chat:create-conversation");
    const parsed = newConversationSchema.parse(values);

    // So entra quem e da empresa e esta ativo. Sem esta conferencia, um id
    // enviado a mao colocaria alguem de outra empresa dentro da conversa.
    const convidados = await prisma.user.findMany({
      where: { id: { in: parsed.participantIds }, companyId: user.companyId, isActive: true },
      select: { id: true },
    });

    if (convidados.length === 0) {
      throw new Error("Escolha pelo menos uma pessoa da sua empresa.");
    }

    const participantes = [...new Set([user.id, ...convidados.map((c) => c.id)])];
    const titulo = parsed.title?.trim() || null;

    // Conversa privada entre duas pessoas e uma so: chamar de novo a mesma
    // pessoa reabre a conversa que ja existe, em vez de espalhar o historico
    // em varias.
    if (participantes.length === 2 && !titulo) {
      const existente = await prisma.conversation.findFirst({
        where: {
          companyId: user.companyId,
          kind: "COMPANY",
          title: null,
          participants: { every: { userId: { in: participantes } } },
          AND: participantes.map((userId) => ({ participants: { some: { userId } } })),
        },
        select: { id: true },
      });

      if (existente) {
        return { ok: true, data: { conversationId: existente.id }, message: "Conversa aberta." } as const;
      }
    }

    const conversation = await prisma.conversation.create({
      data: {
        companyId: user.companyId,
        kind: "COMPANY",
        title: titulo,
        createdById: user.id,
        participants: { create: participantes.map((userId) => ({ userId })) },
      },
      select: { id: true },
    });

    revalidatePath("/conversas");

    return { ok: true, data: { conversationId: conversation.id }, message: "Conversa criada." } as const;
  } catch (error) {
    return actionError(error, "Não foi possível criar a conversa.");
  }
}

/**
 * Abre — ou reabre — o canal da empresa com o suporte.
 *
 * E uma conversa por empresa, e nao uma por duvida: o historico junto e o que
 * permite ao suporte entender o caso sem pedir tudo de novo a cada pergunta.
 */
export async function openSupportConversationAction() {
  try {
    const user = await requireUser();
    await assertUserActionRateLimit(user.id, "chat:open-support");

    const existente = await prisma.conversation.findFirst({
      where: { companyId: user.companyId, kind: "SUPPORT" },
      select: { id: true },
    });

    const conversationId =
      existente?.id ??
      (
        await prisma.conversation.create({
          data: {
            companyId: user.companyId,
            kind: "SUPPORT",
            title: "Suporte",
            createdById: user.id,
          },
          select: { id: true },
        })
      ).id;

    // Quem abriu passa a participar. O dono tambem entra: e dele a conta, e uma
    // conversa de suporte que ele nao enxerga vira problema que ele descobre
    // tarde demais.
    const dono = await prisma.user.findFirst({
      where: { companyId: user.companyId, role: "OWNER", isActive: true },
      select: { id: true },
    });

    for (const userId of new Set([user.id, ...(dono ? [dono.id] : [])])) {
      await prisma.conversationParticipant.upsert({
        where: { conversationId_userId: { conversationId, userId } },
        create: { conversationId, userId },
        update: {},
      });
    }

    revalidatePath("/conversas");

    return { ok: true, data: { conversationId } } as const;
  } catch (error) {
    return actionError(error, "Não foi possível abrir a conversa com o suporte.");
  }
}
