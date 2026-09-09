import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, LifeBuoy, MessageSquare } from "lucide-react";
import { listSupportThreads } from "@/features/admin/support";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { messageDay, messageTime } from "@/lib/chat";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Suporte - Zelo",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminSuportePage() {
  await requirePlatformAdmin();
  const conversas = await listSupportThreads();
  const esperando = conversas.filter((c) => c.waiting);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-950">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Painel da plataforma
        </Link>

        <h1 className="mt-4 flex items-center gap-2 text-2xl font-semibold text-slate-950">
          <LifeBuoy className="h-6 w-6 text-emerald-700" aria-hidden="true" />
          Suporte
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {esperando.length === 0
            ? "Nenhuma empresa esperando resposta."
            : `${esperando.length} empresa(s) esperando resposta.`}
        </p>

        {conversas.length === 0 ? (
          <p className="mt-8 rounded-md border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Ninguem abriu conversa com o suporte ainda. O canal aparece para o cliente em Conversas, e fica disponivel
            mesmo para quem esta sem assinatura ativa.
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
            {conversas.map((conversa) => (
              <li key={conversa.id}>
                <Link href={`/admin/suporte/${conversa.id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50">
                  <MessageSquare
                    className={cn("mt-1 h-4 w-4 shrink-0", conversa.waiting ? "text-amber-600" : "text-slate-400")}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-950">{conversa.companyName}</span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        {conversa.companyPlan ?? "sem plano"}
                      </span>
                      {conversa.waiting ? (
                        <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                          esperando resposta
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block truncate text-sm text-slate-600">
                      {conversa.lastMessageBody ?? "sem mensagens"}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-xs text-slate-500">
                    {conversa.lastMessageAt ? (
                      <>
                        {messageDay(conversa.lastMessageAt)}
                        <span className="block">{messageTime(conversa.lastMessageAt)}</span>
                      </>
                    ) : (
                      "-"
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
