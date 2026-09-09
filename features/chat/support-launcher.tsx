"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LifeBuoy, Loader2 } from "lucide-react";
import { FormMessage } from "@/components/form-message";
import { buttonClassName } from "@/components/ui/button";
import { openSupportConversationAction } from "@/features/chat/actions";

export function SupportLauncher({ label = "Falar com o suporte" }: { label?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  return (
    <span className="inline-flex flex-col gap-2">
      <button
        className={buttonClassName("secondary", "sm")}
        type="button"
        disabled={isPending}
        onClick={() => {
          setError(undefined);
          startTransition(async () => {
            const result = await openSupportConversationAction();

            if (!result.ok) {
              setError(result.error);
              return;
            }

            router.push(`/conversas/${result.data.conversationId}`);
          });
        }}
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <LifeBuoy className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {isPending ? "Abrindo..." : label}
      </button>
      <FormMessage error={error} />
    </span>
  );
}
