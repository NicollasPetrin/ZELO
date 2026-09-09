import Link from "next/link";
import { LifeBuoy, MessageSquare } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { listColleagues, listConversations } from "@/features/chat/data";
import { NewConversationForm } from "@/features/chat/new-conversation-form";
import { SupportLauncher } from "@/features/chat/support-launcher";
import { requireUser } from "@/lib/auth/session";
import { messageDay, messageTime } from "@/lib/chat";
import { cn } from "@/lib/cn";
import { getActivePlanCode } from "@/lib/subscription";

function quando(data: Date) {
  const hoje = new Date();
  const mesmoDia =
    data.getDate() === hoje.getDate() && data.getMonth() === hoje.getMonth() && data.getFullYear() === hoje.getFullYear();

  return mesmoDia ? messageTime(data) : messageDay(data);
}

export default async function ConversasPage() {
  const user = await requireUser();
  const planoAtivo = Boolean(getActivePlanCode(user.company));

  const [conversas, colegas] = await Promise.all([
    listConversations(user),
    planoAtivo ? listColleagues(user) : Promise.resolve([]),
  ]);

  const suporte = conversas.find((c) => c.kind === "SUPPORT") ?? null;
  const daEmpresa = conversas.filter((c) => c.kind === "COMPANY");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conversas"
        description="Fale com a sua equipe e com o suporte da Zelo sem sair do sistema."
      />

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-950">
              <LifeBuoy className="h-4 w-4 text-emerald-700" aria-hidden="true" />
              Suporte da Zelo
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              Duvida sobre o sistema, cobranca ou plano. Este canal continua aberto mesmo sem assinatura ativa.
            </p>
          </div>
          {suporte ? (
            <Link
              href={`/conversas/${suporte.id}`}
              className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 hover:bg-slate-50"
            >
              Abrir conversa
              {suporte.unread ? (
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-semibold text-white">
                  novo
                </span>
              ) : null}
            </Link>
          ) : (
            <SupportLauncher />
          )}
        </div>
      </section>

      {planoAtivo ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-950">Conversas da equipe</h2>
            <NewConversationForm colleagues={colegas.map((c) => ({
              id: c.id,
              name: c.name,
              position: c.position,
              departmentName: c.department?.name ?? null,
            }))} />
          </div>

          {daEmpresa.length === 0 ? (
            <EmptyState
              title="Nenhuma conversa ainda"
              description="Comece uma conversa com alguem da equipe para alinhar uma tarefa sem depender de aplicativo de fora."
            />
          ) : (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
              {daEmpresa.map((conversa) => (
                <li key={conversa.id}>
                  <Link href={`/conversas/${conversa.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                    <MessageSquare
                      className={cn("h-4 w-4 shrink-0", conversa.unread ? "text-emerald-700" : "text-slate-400")}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate text-sm", conversa.unread ? "font-semibold text-slate-950" : "text-slate-800")}>
                        {conversa.label}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {conversa.participants.length} participante{conversa.participants.length === 1 ? "" : "s"}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-slate-500">
                      {conversa.lastMessageAt ? quando(conversa.lastMessageAt) : "sem mensagens"}
                    </span>
                    {conversa.unread ? (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-600" aria-label="nao lida" />
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <section className="rounded-md border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-base font-semibold text-slate-950">Conversas da equipe</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            Disponivel com uma assinatura ativa. O canal com o suporte acima continua funcionando.
          </p>
        </section>
      )}
    </div>
  );
}
