import Link from "next/link";
import { CreditCard, LockKeyhole } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";

export function SubscriptionRequiredCard() {
  return (
    <div className="mx-auto max-w-3xl rounded-md border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-slate-950 text-white">
          <LockKeyhole className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-950">Assinatura necessaria</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Sua conta foi criada, mas as funcionalidades operacionais ficam bloqueadas ate que exista uma assinatura ativa.
          </p>
          <Link href="/settings#gerenciamento-assinatura" className={buttonClassName("primary") + " mt-5"}>
            <CreditCard className="h-4 w-4" aria-hidden="true" />
            Ver planos
          </Link>
        </div>
      </div>
    </div>
  );
}
