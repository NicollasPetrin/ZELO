import "server-only";
import type { CurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { brasiliaDay, dueDateAt } from "@/lib/due-date";

/** Inicio e fim (exclusivo) da semana corrente, de segunda a domingo, no calendario de Brasilia. */
function semanaAtual(now: Date) {
  const hoje = brasiliaDay(now);
  const dia = new Date(`${hoje}T00:00:00Z`);
  const desdeSegunda = (dia.getUTCDay() + 6) % 7;
  const segunda = new Date(dia.getTime() - desdeSegunda * 86_400_000).toISOString().slice(0, 10);
  const proximaSegunda = new Date(dia.getTime() + (7 - desdeSegunda) * 86_400_000).toISOString().slice(0, 10);

  return { inicio: dueDateAt(segunda, "00:00")!, fim: dueDateAt(proximaSegunda, "00:00")! };
}

/** O que o Inicio mostra para a pessoa: as tarefas dela em aberto, a semana e as ultimas notificacoes. */
export async function getHomeData(user: CurrentUser, now: Date = new Date()) {
  const { inicio, fim } = semanaAtual(now);
  const daSemana = { companyId: user.companyId, assigneeId: user.id, dueDate: { gte: inicio, lt: fim }, status: { not: "CANCELED" as const } };

  const [abertas, semanaTotal, semanaFeitas, notificacoes] = await prisma.$transaction([
    prisma.task.findMany({
      where: { companyId: user.companyId, assigneeId: user.id, status: { notIn: ["COMPLETED", "CANCELED"] } },
      select: {
        id: true,
        title: true,
        dueDate: true,
        priority: true,
        status: true,
        department: { select: { name: true } },
      },
      orderBy: [{ dueDate: "asc" }, { id: "asc" }],
      take: 200,
    }),
    prisma.task.count({ where: daSemana }),
    prisma.task.count({ where: { ...daSemana, status: "COMPLETED" } }),
    prisma.notification.findMany({
      where: { userId: user.id, companyId: user.companyId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { id: true, title: true, message: true, link: true, isRead: true, createdAt: true },
      take: 4,
    }),
  ]);

  return { abertas, semana: { total: semanaTotal, feitas: semanaFeitas }, notificacoes };
}
