"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, Loader2, TriangleAlert } from "lucide-react";

export type PaymentReturnStatus = "confirmado" | "cancelado" | "expirado" | "indisponivel";

/** Quantas vezes recarregar antes de desistir e pedir para a pessoa aguardar. */
const MAX_TENTATIVAS = 10;
const INTERVALO_MS = 3000;

/**
 * Mensagem para quem volta da pagina de pagamento.
 *
 * O ponto delicado e o intervalo entre pagar e o acesso liberar: quem paga
 * volta em poucos segundos, e a confirmacao chega por webhook, que pode
 * demorar mais que isso. Sem este aviso a pessoa cai numa tela que ainda diz
 * "sem plano ativo" e conclui que o pagamento falhou.
 */
export function PaymentReturnBanner({
  status,
  planActive,
}: {
  status: PaymentReturnStatus;
  planActive: boolean;
}) {
  const router = useRouter();
  const [tentativas, setTentativas] = useState(0);
  const aguardando = status === "confirmado" && !planActive && tentativas < MAX_TENTATIVAS;

  useEffect(() => {
    if (!aguardando) {
      return;
    }

    const id = setTimeout(() => {
      setTentativas((atual) => atual + 1);
      router.refresh();
    }, INTERVALO_MS);

    return () => clearTimeout(id);
  }, [aguardando, tentativas, router]);

  if (status === "indisponivel") {
    return (
      <div className="mb-5 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-950">
        <TriangleAlert className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          Sua conta foi criada, mas nao conseguimos abrir o pagamento agora. Nada foi cobrado. Escolha o plano
          abaixo para tentar de novo.
        </p>
      </div>
    );
  }

  if (status === "cancelado" || status === "expirado") {
    return (
      <div className="mb-5 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-950">
        <TriangleAlert className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          {status === "cancelado"
            ? "Pagamento cancelado. Nada foi cobrado e voce pode tentar de novo quando quiser."
            : "O tempo do pagamento expirou. Nada foi cobrado. Inicie a compra novamente."}
        </p>
      </div>
    );
  }

  if (planActive) {
    return (
      <div className="mb-5 flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm leading-6 text-emerald-900">
        <CircleCheck className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>Pagamento confirmado e plano liberado. Bom trabalho.</p>
      </div>
    );
  }

  return (
    <div
      className="mb-5 flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-800"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="mt-1 h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
      <p>
        {tentativas < MAX_TENTATIVAS
          ? "Pagamento recebido. Estamos liberando seu acesso, aguarde alguns segundos..."
          : "O pagamento foi recebido, mas a liberacao esta demorando mais que o normal. Atualize a pagina em alguns minutos; se continuar assim, fale com o suporte."}
      </p>
    </div>
  );
}
