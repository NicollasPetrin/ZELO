import "server-only";
import type { CurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { DEFAULT_PAGE_SIZE, pageOffset, paginatedResult } from "@/lib/pagination";

export async function listNotifications(user: CurrentUser, page = 1) {
  const where = {
    userId: user.id,
    companyId: user.companyId,
  };
  const [totalItems, unreadCount, items] = await prisma.$transaction([
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { ...where, isRead: false } }),
    prisma.notification.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: pageOffset(page),
      take: DEFAULT_PAGE_SIZE,
    }),
  ]);

  return {
    ...paginatedResult(items, totalItems, page),
    unreadCount,
  };
}

export function countUnreadNotifications(user: CurrentUser) {
  return prisma.notification.count({
    where: {
      userId: user.id,
      companyId: user.companyId,
      isRead: false,
    },
  });
}
