import "server-only";
import type { ActivityType } from "@prisma/client";
import { prisma } from "@/lib/db/client";

type ActivityInput = {
  companyId: string;
  actorId?: string | null;
  type: ActivityType;
  entityType: string;
  entityId?: string | null;
  title: string;
  description?: string | null;
  metadata?: Record<string, unknown>;
};

export async function recordActivity({
  companyId,
  actorId,
  type,
  entityType,
  entityId,
  title,
  description,
  metadata,
}: ActivityInput) {
  try {
    await prisma.activityLog.create({
      data: {
        companyId,
        actorId,
        type,
        entityType,
        entityId,
        title,
        description,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  } catch (error) {
    console.error("Nao foi possivel registrar ActivityLog.", error);
  }
}
