"use client";

import { useState, useTransition } from "react";
import { CalendarX2, Loader2 } from "lucide-react";
import { FormMessage } from "@/components/form-message";
import { buttonClassName } from "@/components/ui/button";
import { cancelSubscriptionAction } from "@/features/billing/actions";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

export function CancelSubscriptionPanel({
  planName,
  endsAt,
  isTrial,
}: {
  planName: string;
  endsAt: Date | null;
  isTrial: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function cancel() {
    setMessage(undefined);
    setError(undefined);
    startTransition(async () => {
      const result = await cancelSubscriptionAction();

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setConfirming(false);
      setMessage(result.message);
    });
  }

  const ate = endsAt ? formatDate(endsAt) : "o fim do periodo contratado";

  return (
    <div className="mt-6 border-t border-slate-100 pt-5">
      <h3 className="text-sm font-semibold text-slate-950">Cancelar assinatura</h3>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
        {isTrial
          ? `O teste segue liberado ate ${ate} e nenhuma cobranca sera feita. Depois dessa data as funcionalidades sao bloqueadas.`
          : `O acesso continua ate ${ate}, que ja esta pago. A partir dai nao ha nova cobranca e as funcionalidades sao bloqueadas.`}
      </p>

      {confirming ? (
        <div className="mt-3 max-w-2xl rounded-md border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm font-semibold text-rose-900">Confirmar o cancelamento do Plano {planName}?</p>
          <ul className="mt-2 space-y-1 text-sm leading-6 text-rose-900">
            <li>Nenhuma cobranca sera feita a partir de {ate}.</li>
            <li>Ate essa data nada muda: a equipe continua usando normalmente.</li>
            <li>Depois dela, tarefas, metas e relatorios ficam bloqueados ate a contratacao de um novo plano.</li>
            <li>Seus dados continuam guardados.</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className={buttonClassName("danger", "sm")} type="button" disabled={isPending} onClick={cancel}>
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <CalendarX2 className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {isPending ? "Cancelando..." : "Confirmar cancelamento"}
            </button>
            <button
              className={buttonClassName("secondary", "sm")}
              type="button"
              disabled={isPending}
              onClick={() => setConfirming(false)}
            >
              Manter assinatura
            </button>
          </div>
        </div>
      ) : (
        <button className={buttonClassName("secondary", "sm")} type="button" onClick={() => setConfirming(true)}>
          <CalendarX2 className="h-3.5 w-3.5" aria-hidden="true" />
          Cancelar assinatura
        </button>
      )}

      <div className="mt-2 max-w-2xl">
        <FormMessage message={message} error={error} />
      </div>
    </div>
  );
}
