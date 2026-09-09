import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSupportThread } from "@/features/admin/support";
import { SupportReply } from "@/features/admin/support-reply";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { messageDay, messageTime } from "@/lib/chat";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Suporte - Zelo",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminSuporteConversaPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePlatformAdmin();
  const { id } = await params;
  const conversa = await getSupportThread(id);

  if (!conversa) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/admin/suporte" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-950">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Caixa do suporte
        </Link>

        <header className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
          <h1 className="text-xl font-semibold text-slate-950">{conversa.company.name}</h1>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs uppercase tracking-normal text-slate-400">Plano</dt>
              <dd className="text-slate-800">{conversa.company.plan ?? "sem plano"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-normal text-slate-400">Documento</dt>
              <dd className="text-slate-800">{conversa.company.document ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-normal text-slate-400">E-mail</dt>
              <dd className="truncate text-slate-800">{conversa.company.email ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-normal text-slate-400">Telefone</dt>
              <dd className="text-slate-800">{conversa.company.phone ?? "-"}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-slate-500">
            Na conversa: {conversa.participants.map((p) => `${p.user.name} (${p.user.role})`).join(", ") || "ninguem"}
          </p>
        </header>

        <section className="mt-4 flex h-[60vh] min-h-[380px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="flex-1 space-y-1 overflow-y-auto bg-slate-50 px-4 py-4">
            {conversa.messages.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">Conversa aberta, ainda sem mensagens.</p>
            ) : null}

            {conversa.messages.map((mensagem, indice) => {
              const anterior = conversa.messages[indice - 1];
              const dia = messageDay(mensagem.createdAt);
              const mudouDeDia = !anterior || messageDay(anterior.createdAt) !== dia;

              return (
                <div key={mensagem.id}>
                  {mudouDeDia ? (
                    <p className="py-3 text-center text-xs font-medium text-slate-400">{dia}</p>
                  ) : null}
                  <div className={cn("mt-2 flex", mensagem.fromSupport ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[80%] rounded-md px-3 py-2 text-sm leading-6",
                        mensagem.fromSupport
                          ? "bg-emerald-600 text-white"
                          : "border border-slate-200 bg-white text-slate-900",
                      )}
                    >
                      <p className={cn("text-xs font-semibold", mensagem.fromSupport ? "text-emerald-100" : "text-slate-500")}>
                        {mensagem.fromSupport ? "Voce (Suporte)" : (mensagem.author?.name ?? "Usuario removido")}
                      </p>
                      <p className="whitespace-pre-wrap break-words">{mensagem.body}</p>
                      <p className={cn("mt-1 text-right text-[11px]", mensagem.fromSupport ? "text-emerald-100" : "text-slate-400")}>
                        {messageTime(mensagem.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <SupportReply conversationId={conversa.id} />
        </section>
      </div>
    </main>
  );
}
