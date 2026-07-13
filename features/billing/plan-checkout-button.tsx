"use client";

import type { SubscriptionPlan } from "@prisma/client";
import { useState, useTransition } from "react";
import { ArrowUpRight, CreditCard } from "lucide-react";
import { FormMessage } from "@/components/form-message";
import { buttonClassName } from "@/components/ui/button";
import { startPlanCheckoutAction } from "@/features/billing/actions";

export function PlanCheckoutButton({
  planCode,
  label,
  disabled,
  disabledReason,
}: {
  planCode: SubscriptionPlan;
  label: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function startCheckout() {
    setMessage(undefined);
    setError(undefined);
    startTransition(async () => {
      const result = await startPlanCheckoutAction(planCode);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setMessage(result.message);

      if (result.data.checkoutUrl) {
        window.location.href = result.data.checkoutUrl;
      }
    });
  }

  return (
    <div className="mt-3 space-y-2">
      <button
        className={buttonClassName(disabled ? "secondary" : "primary", "sm")}
        type="button"
        disabled={disabled || isPending}
        onClick={startCheckout}
      >
        {isPending ? (
          <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {isPending ? "Preparando..." : label}
      </button>
      {disabled && disabledReason ? <p className="text-xs leading-5 text-rose-700">{disabledReason}</p> : null}
      <FormMessage message={message} error={error} />
    </div>
  );
}
