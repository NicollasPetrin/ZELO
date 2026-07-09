import "server-only";
import { prisma } from "@/lib/db/client";

export function listDepartments(companyId: string) {
  return prisma.department.findMany({
    where: {
      companyId,
    },
    include: {
      _count: {
        select: {
          users: true,
          tasks: true,
          goals: true,
        },
      },
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
}

export function listActiveDepartments(companyId: string) {
  return prisma.department.findMany({
    where: {
      companyId,
      isActive: true,
    },
    orderBy: { name: "asc" },
  });
}
