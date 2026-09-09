"use server";

import { revalidatePath } from "next/cache";
import { actionError } from "@/lib/action-result";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { prisma } from "@/lib/db/client";
import { assertUserActionRateLimit } from "@/lib/rate-limit";
import { messageSchema } from "@/lib/validations";

/**
 * Resposta do suporte numa conversa de qualquer empresa.
 *
 * A mensagem nasce marcada como fromSupport, e nao apenas assinada por quem
 * escreveu: e assim que o cliente ve "Suporte Zelo" hoje e continua vendo
 * amanha, mesmo que outra pessoa passe a atender.
 */
export async function replyAsSupportAction(values: unknown) {
  try {
    const admin = await requirePlatformAdmin();
    await assertUserActionRateLimit(admin.id, "support:reply");
    const parsed = messageSchema.parse(values);

    const conversa = await prisma.conversation.findFirst({
      where: { id: parsed.conversationId, kind: "SUPPORT" },
      select: { id: true },
    });

    if (!conversa) {
      throw new Error("Conversa de suporte nao encontrada.");
    }

    const agora = new Date();

    await prisma.$transaction([
      prisma.message.create({
        data: { conversationId: conversa.id, authorId: admin.id, fromSupport: true, body: parsed.body },
      }),
      prisma.conversation.update({ where: { id: conversa.id }, data: { lastMessageAt: agora } }),
    ]);

    revalidatePath(`/admin/suporte/${conversa.id}`);
    revalidatePath("/admin/suporte");

    return { ok: true, message: "Resposta enviada." } as const;
  } catch (error) {
    return actionError(error, "Nao foi possivel responder.");
  }
}
