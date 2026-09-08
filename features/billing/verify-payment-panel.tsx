"use client";

import { useState, useTransition } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { FormMessage } from "@/components/form-message";
import { buttonClassName } from "@/components/ui/button";
import { syncSubscriptionAction } from "@/features/billing/actions";

/**
 * Caminho de saida para quem pagou e nao viu o plano liberar.
 *
 * Fica em destaque quando nao ha plano ativo, que e exatamente a tela onde a
 * duvida aparece; com o plano em dia continua disponivel, mas discreto.
 */
export function VerifyPaymentPanel({ planActive }: { planActive: boolean }) {
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function verify() {
    setMessage(undefined);
    setError(undefined);
    startTransition(async () => {
      const result = await syncSubscriptionAction();

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setMessage(result.message);
    });
  }

  const botao = (
    <button
      className={buttonClassName(planActive ? "secondary" : "primary", "sm")}
      type="button"
      disabled={isPending}
      onClick={verify}
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      ) : (
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {isPending ? "Conferindo..." : "Ja paguei, conferir agora"}
    </button>
  );

  if (planActive) {
    return (
      <div className="mt-6 border-t border-slate-100 pt-5">
        <h3 className="text-sm font-semibold text-slate-950">Conferir pagamento</h3>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
          Consulta a processadora e atualiza a assinatura com o que estiver pago por la.
        </p>
        <div className="mt-3">{botao}</div>
        <div className="mt-2 max-w-2xl">
          <FormMessage message={message} error={error} />
        </div>
      </div>
    );
  }

  return (
    <div className="mb-5 rounded-md border border-sky-200 bg-sky-50 p-4">
      <h3 className="text-sm font-semibold text-sky-950">Pagou e o plano nao liberou?</h3>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-sky-900">
        A confirmacao costuma chegar sozinha em ate um minuto. Se demorar mais que isso, consulte a processadora
        agora: se o pagamento estiver aprovado, o plano e liberado na hora.
      </p>
      <div className="mt-3">{botao}</div>
      <div className="mt-2 max-w-2xl">
        <FormMessage message={message} error={error} />
      </div>
    </div>
  );
}
