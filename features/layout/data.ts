import "server-only";
import type { CurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

export type SidebarSpace = { id: string; name: string; late: number };

/**
 * Setores ativos como espacos da barra lateral, com quantas tarefas estao
 * atrasadas em cada um. A conta segue a regra de atraso do resto do sistema:
 * aberta e com o prazo vencido (ou marcada como atrasada).
 */
export async function getSidebarSpaces(user: CurrentUser, now: Date = new Date()): Promise<SidebarSpace[]> {
  const [setores, atrasos] = await Promise.all([
    prisma.department.findMany({
      where: { companyId: user.companyId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.task.groupBy({
      by: ["departmentId"],
      where: {
        companyId: user.companyId,
        status: { notIn: ["COMPLETED", "CANCELED"] },
        OR: [{ status: "OVERDUE" }, { dueDate: { lt: now } }],
      },
      _count: { _all: true },
    }),
  ]);
  const porSetor = new Map(atrasos.map((a) => [a.departmentId, a._count._all]));

  return setores.map((setor) => ({ ...setor, late: porSetor.get(setor.id) ?? 0 }));
}
