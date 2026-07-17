import "server-only";
import type { CurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

export function listNotifications(user: CurrentUser) {
  return prisma.notification.findMany({
    where: {
      userId: user.id,
      companyId: user.companyId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 80,
  });
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
