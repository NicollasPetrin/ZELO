import "server-only";
import type { CurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { planDetails } from "@/lib/plans";
import { buildReminderContent, getSubscriptionWindow } from "@/lib/subscription";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Cria, no maximo uma vez a cada 24h, a notificacao que lembra o responsavel de
 * pagar a assinatura.
 *
 * A janela de 24h e usada no lugar de "dia do calendario" de proposito: evita
 * depender do fuso do servidor, que faria o lembrete disparar duas vezes perto
 * da virada do dia.
 *
 * So o dono e o gerente sao lembrados, porque sao os unicos que podem tratar
 * pagamento; encher a caixa do funcionario com cobranca nao ajuda ninguem.
 */
export async function ensureSubscriptionReminder(user: CurrentUser, now: Date = new Date()) {
  if (user.role !== "OWNER" && user.role !== "MANAGER") {
    return;
  }

  if (user.company.isDemo) {
    return;
  }

  const window = getSubscriptionWindow(user.company, now);
  const subscription = user.company.subscriptions?.[0];

  if (!window.shouldRemind || !subscription) {
    return;
  }

  const content = buildReminderContent(window, planDetails[subscription.plan.code].name);

  if (!content) {
    return;
  }

  const jaLembradoHoje = await prisma.notification.findFirst({
    where: {
      userId: user.id,
      type: "SUBSCRIPTION_PAYMENT_DUE",
      createdAt: {
        gte: new Date(now.getTime() - DAY_MS),
      },
    },
    select: {
      id: true,
    },
  });

  if (jaLembradoHoje) {
    return;
  }

  await prisma.notification.create({
    data: {
      companyId: user.companyId,
      userId: user.id,
      type: "SUBSCRIPTION_PAYMENT_DUE",
      title: content.title,
      message: content.message,
      link: "/settings#gerenciamento-assinatura",
    },
  });
}
