"use server";

import { revalidatePath } from "next/cache";
import { actionError } from "@/lib/action-result";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { assertUserActionRateLimit } from "@/lib/rate-limit";
import { assertCompanyHasActivePlan } from "@/lib/subscription";
import { onboardingKeySchema } from "@/lib/validations";

export async function completeOnboardingStepAction(key: string) {
  try {
    const user = await requireUser();
    assertCompanyHasActivePlan(user.company);
    await assertUserActionRateLimit(user.id, "onboarding:complete");
    const parsedKey = onboardingKeySchema.parse(key);

    await prisma.onboardingStep.upsert({
      where: {
        userId_key: {
          userId: user.id,
          key: parsedKey,
        },
      },
      create: {
        companyId: user.companyId,
        userId: user.id,
        key: parsedKey,
        completed: true,
        completedAt: new Date(),
      },
      update: {
        completed: true,
        completedAt: new Date(),
      },
    });

    revalidatePath("/", "layout");
    return { ok: true, message: "Guia ocultado." } as const;
  } catch (error) {
    return actionError(error);
  }
}
