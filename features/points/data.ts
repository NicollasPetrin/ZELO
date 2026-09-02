import "server-only";
import type { Prisma } from "@prisma/client";
import type { CurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { emptyPriorityCount, rankMembers, type PriorityCount, type ScoredMember } from "@/lib/points";

export const pointsPeriods = ["mes", "trimestre", "total"] as const;
export type PointsPeriod = (typeof pointsPeriods)[number];

export const pointsPeriodLabels: Record<PointsPeriod, string> = {
  mes: "Este mes",
  trimestre: "Ultimos 90 dias",
  total: "Desde o inicio",
};

export function parsePointsPeriod(value: string | undefined): PointsPeriod {
  return pointsPeriods.find((periodo) => periodo === value) ?? "mes";
}

/**
 * Inicio da janela de contagem.
 *
 * A pontuacao e sempre por periodo, nunca acumulada para sempre: num placar
 * eterno quem entrou primeiro fica na frente indefinidamente e quem chegou
 * depois nao tem como alcancar, o que esvazia o sentido de acompanhar.
 */
function periodStart(period: PointsPeriod, now: Date): Date | null {
  if (period === "total") {
    return null;
  }

  if (period === "mes") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const inicio = new Date(now);
  inicio.setDate(inicio.getDate() - 90);

  return inicio;
}

export type MemberPoints = ScoredMember<{
  id: string;
  name: string;
  position_role: string | null;
  departmentName: string | null;
  isSelf: boolean;
}>;

export type PointsBoard = {
  period: PointsPeriod;
  since: Date | null;
  members: MemberPoints[];
  companyPoints: number;
  companyTasks: number;
};

export async function getPointsBoard(user: CurrentUser, period: PointsPeriod): Promise<PointsBoard> {
  const now = new Date();
  const since = periodStart(period, now);

  // A tarefa entra pela data em que foi concluida, e nao pelo prazo: o que se
  // mede aqui e entrega, nao pontualidade.
  const where: Prisma.TaskWhereInput = {
    companyId: user.companyId,
    status: "COMPLETED",
    ...(since ? { completedAt: { gte: since } } : {}),
  };

  const [members, grupos] = await Promise.all([
    prisma.user.findMany({
      where: { companyId: user.companyId, isActive: true },
      select: { id: true, name: true, position: true, department: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.task.groupBy({
      by: ["assigneeId", "priority"],
      where,
      _count: { _all: true },
    }),
  ]);

  const porPessoa = new Map<string, PriorityCount>();

  for (const grupo of grupos) {
    const atual = porPessoa.get(grupo.assigneeId) ?? emptyPriorityCount();
    atual[grupo.priority] += grupo._count._all;
    porPessoa.set(grupo.assigneeId, atual);
  }

  const ranking = rankMembers(
    members.map((membro) => ({
      id: membro.id,
      name: membro.name,
      position_role: membro.position,
      departmentName: membro.department?.name ?? null,
      isSelf: membro.id === user.id,
      counts: porPessoa.get(membro.id) ?? emptyPriorityCount(),
    })),
  );

  return {
    period,
    since,
    members: ranking,
    companyPoints: ranking.reduce((soma, membro) => soma + membro.points, 0),
    companyTasks: ranking.reduce((soma, membro) => soma + membro.tasks, 0),
  };
}
