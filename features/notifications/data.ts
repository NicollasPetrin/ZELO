import "server-only";
import { prisma } from "@/lib/db/client";

export function listNotifications(userId: string) {
  return prisma.notification.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 80,
  });
}

export function countUnreadNotifications(userId: string) {
  return prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });
}
