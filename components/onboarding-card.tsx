"use client";

import { useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { completeOnboardingStepAction } from "@/features/onboarding/actions";

export function OnboardingCard({
  stepKey,
  title,
  description,
  completed,
}: {
  stepKey: string;
  title: string;
  description: string;
  completed: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  if (completed) {
    return null;
  }

  return (
    <div className="rounded-md border border-sky-200 bg-sky-50 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={isPending}
          onClick={() => startTransition(() => void completeOnboardingStepAction(stepKey))}
        >
          Marcar como concluido
        </Button>
      </div>
    </div>
  );
}
