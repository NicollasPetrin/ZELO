import type { CurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

export async function isOnboardingCompleted(user: CurrentUser, key: string) {
  const step = await prisma.onboardingStep.findFirst({
    where: {
      companyId: user.companyId,
      userId: user.id,
      key,
    },
  });

  return Boolean(step?.completed);
}
