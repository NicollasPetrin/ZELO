"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, SendHorizontal } from "lucide-react";
import { FormMessage } from "@/components/form-message";
import { buttonClassName } from "@/components/ui/button";
import { Textarea } from "@/components/ui/fields";
import { replyAsSupportAction } from "@/features/admin/support-actions";
import { MESSAGE_MAX } from "@/lib/validations";

const INTERVALO_MS = 15_000;

export function SupportReply({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }, INTERVALO_MS);

    return () => clearInterval(id);
  }, [router]);

  function responder() {
    const area = areaRef.current;
    const body = area?.value.trim();

    if (!body) {
      return;
    }

    setError(undefined);
    startTransition(async () => {
      const result = await replyAsSupportAction({ conversationId, body });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      if (area) {
        area.value = "";
      }

      router.refresh();
    });
  }

  return (
    <div className="border-t border-slate-200 bg-white p-3">
      <div className="flex items-end gap-2">
        <Textarea
          ref={areaRef}
          rows={3}
          maxLength={MESSAGE_MAX}
          disabled={isPending}
          placeholder="Responder como Suporte Zelo"
          aria-label="Resposta do suporte"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              responder();
            }
          }}
        />
        <button className={buttonClassName("primary")} type="button" disabled={isPending} onClick={responder}>
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <SendHorizontal className="h-4 w-4" aria-hidden="true" />
          )}
          Responder
        </button>
      </div>
      <div className="mt-2">
        <FormMessage error={error} />
      </div>
    </div>
  );
}
