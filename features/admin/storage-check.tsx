"use client";

import { useState, useTransition } from "react";
import { HardDrive, Loader2 } from "lucide-react";
import { FormMessage } from "@/components/form-message";
import { buttonClassName } from "@/components/ui/button";
import { testStorageAction } from "@/features/admin/storage-actions";

export function StorageCheck({ configured }: { configured: boolean }) {
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          className={buttonClassName("secondary", "sm")}
          type="button"
          disabled={isPending}
          onClick={() => {
            setMessage(undefined);
            setError(undefined);
            startTransition(async () => {
              const result = await testStorageAction();

              if (!result.ok) {
                setError(result.error);
                return;
              }

              setMessage(result.message);
            });
          }}
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <HardDrive className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {isPending ? "Testando..." : "Testar armazenamento de fotos"}
        </button>
        <span className={`text-sm ${configured ? "text-slate-600" : "text-amber-700"}`}>
          {configured ? "Credenciais presentes" : "Credenciais ausentes: a prova por foto esta desligada"}
        </span>
      </div>
      <div className="mt-2 max-w-2xl">
        <FormMessage message={message} error={error} />
      </div>
    </div>
  );
}
