import "server-only";
import type { CurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { canManageGoals } from "@/lib/permissions";

export function listGoalsForUser(user: CurrentUser) {
  const canManage = canManageGoals(user.role);

  return prisma.goal.findMany({
    where: {
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
    },
    include: {
      department: true,
      responsible: true,
    },
    orderBy: [{ status: "asc" }, { endDate: "asc" }],
  });
}
