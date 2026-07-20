import "server-only";
import type { CurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { canManageGoals } from "@/lib/permissions";
import { DEFAULT_PAGE_SIZE, pageOffset, paginatedResult } from "@/lib/pagination";

export async function listGoalsForUser(user: CurrentUser, page = 1) {
  const canManage = canManageGoals(user.role);
  const where = {
    companyId: user.companyId,
    ...(canManage
      ? {}
      : {
          OR: [
            { departmentId: null },
            { departmentId: user.departmentId },
            { responsibleId: user.id },
          ],
        }),
  };

  const [totalItems, items] = await prisma.$transaction([
    prisma.goal.count({ where }),
    prisma.goal.findMany({
      where,
      include: {
        department: true,
        responsible: true,
      },
      orderBy: [{ status: "asc" }, { endDate: "asc" }, { id: "asc" }],
      skip: pageOffset(page),
      take: DEFAULT_PAGE_SIZE,
    }),
  ]);

  return paginatedResult(items, totalItems, page);
}
