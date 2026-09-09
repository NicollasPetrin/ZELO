"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, CalendarPlus, Loader2, RefreshCw, Unplug } from "lucide-react";
import { FormMessage } from "@/components/form-message";
import { buttonClassName } from "@/components/ui/button";
import { disconnectGoogleCalendarAction, resyncMyTasksAction } from "@/features/calendar/actions";

export function CalendarConnection({
  connected,
  googleEmail,
  disponivel,
}: {
  connected: boolean;
  googleEmail: string | null;
  disponivel: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function executar(acao: () => Promise<{ ok: true; message?: string } | { ok: false; error: string }>) {
    setMessage(undefined);
    setError(undefined);
    startTransition(async () => {
      const result = await acao();

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setMessage(result.message);
      router.refresh();
    });
  }

  if (!disponivel) {
    return (
      <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-950">
        A integracao com o Google Agenda ainda nao foi configurada nesta instalacao.
      </p>
    );
  }

  if (!connected) {
    return (
      <div className="space-y-3">
        <a className={buttonClassName("primary", "md")} href="/api/google/conectar">
          <CalendarPlus className="h-4 w-4" aria-hidden="true" />
          Conectar minha agenda do Google
        </a>
        <p className="max-w-2xl text-xs leading-5 text-slate-500">
          A Zelo pede permissao apenas para criar e apagar compromissos. Ela nao le os seus outros compromissos.
        </p>
        <FormMessage message={message} error={error} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 text-sm font-medium text-emerald-800">
        <CalendarCheck className="h-4 w-4" aria-hidden="true" />
        Agenda conectada{googleEmail ? ` (${googleEmail})` : ""}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          className={buttonClassName("secondary", "sm")}
          type="button"
          disabled={isPending}
          onClick={() => executar(resyncMyTasksAction)}
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          Enviar minhas tarefas em aberto
        </button>
        <button
          className={buttonClassName("secondary", "sm")}
          type="button"
          disabled={isPending}
          onClick={() => executar(disconnectGoogleCalendarAction)}
        >
          <Unplug className="h-3.5 w-3.5" aria-hidden="true" />
          Desconectar
        </button>
      </div>
      <FormMessage message={message} error={error} />
    </div>
  );
}
