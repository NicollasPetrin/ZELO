import "server-only";
import { prisma } from "@/lib/db/client";
import { DEFAULT_PAGE_SIZE, pageOffset, paginatedResult } from "@/lib/pagination";

export async function listEmployees(companyId: string, page = 1) {
  const [totalItems, activeUserCount, items] = await prisma.$transaction([
    prisma.user.count({ where: { companyId } }),
    prisma.user.count({ where: { companyId, isActive: true } }),
    prisma.user.findMany({
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
      orderBy: [{ isActive: "desc" }, { name: "asc" }, { id: "asc" }],
      skip: pageOffset(page),
      take: DEFAULT_PAGE_SIZE,
    }),
  ]);

  return {
    ...paginatedResult(items, totalItems, page),
    activeUserCount,
  };
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
