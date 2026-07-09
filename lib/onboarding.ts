import { prisma } from "@/lib/db/client";

export async function isOnboardingCompleted(userId: string, key: string) {
  const step = await prisma.onboardingStep.findUnique({
    where: {
      userId_key: {
        userId,
        key,
      },
    },
  });

  return Boolean(step?.completed);
}
