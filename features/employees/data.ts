import "server-only";
import { prisma } from "@/lib/db/client";

export function listEmployees(companyId: string) {
  return prisma.user.findMany({
    where: {
      companyId,
    },
    include: {
      department: true,
      _count: {
        select: {
          assignedTasks: true,
        },
      },
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
}

export function listActiveEmployees(companyId: string) {
  return prisma.user.findMany({
    where: {
      companyId,
      isActive: true,
    },
    orderBy: { name: "asc" },
  });
}
