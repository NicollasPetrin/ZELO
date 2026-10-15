import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Hash, LifeBuoy, Users } from "lucide-react";
import { getConversation } from "@/features/chat/data";
import { MessageComposer } from "@/features/chat/message-composer";
import { requireUser } from "@/lib/auth/session";
import { messageDay, messageTime, sameBlock, SUPPORT_AUTHOR_LABEL } from "@/lib/chat";
import { cn } from "@/lib/cn";
import { getActivePlanCode } from "@/lib/subscription";

export default async function ConversaPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const conversa = await getConversation(user, id);

  // Quem nao participa recebe 404, e nao um aviso de acesso negado: a existencia
  // da conversa ja e informacao sobre a equipe.
  if (!conversa) {
    notFound();
  }

  const ehSuporte = conversa.kind === "SUPPORT";
  const pessoas = `${conversa.participants.length} pessoa${conversa.participants.length === 1 ? "" : "s"}`;
  // No geral a lista de nomes seria a empresa inteira; ali basta a contagem.
  const quemParticipa = ehSuporte
    ? "Resposta em horário comercial. O histórico fica guardado aqui."
    : conversa.kind === "GENERAL"
      ? `Todo mundo da empresa - ${pessoas}`
      : conversa.kind === "DEPARTMENT"
        ? `Todo mundo do setor - ${conversa.participants.map((p) => p.name).join(", ")}`
        : conversa.participants.map((p) => p.name).join(", ");
  const somenteLeitura = !ehSuporte && !getActivePlanCode(user.company);

  return (
    <div className="space-y-4">
      <Link href="/conversas" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-950">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Todas as conversas
      </Link>

      <section className="flex h-[70vh] min-h-[420px] flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 px-4 py-3">
          <h1 className="flex items-center gap-2 text-base font-semibold text-slate-950">
            {ehSuporte ? <LifeBuoy className="h-4 w-4 text-emerald-700" aria-hidden="true" /> : null}
            {conversa.kind === "GENERAL" ? <Hash className="h-4 w-4 text-slate-500" aria-hidden="true" /> : null}
            {conversa.kind === "DEPARTMENT" ? <Users className="h-4 w-4 text-slate-500" aria-hidden="true" /> : null}
            {conversa.label}
          </h1>
          <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{quemParticipa}</p>
        </header>

        <div className="flex-1 space-y-1 overflow-y-auto bg-slate-50 px-4 py-4">
          {conversa.messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              {ehSuporte
                ? "Escreva sua dúvida abaixo. Você recebe a resposta nesta mesma conversa."
                : conversa.kind === "GENERAL"
                  ? "Nenhuma mensagem ainda. O que for escrito aqui chega para todo mundo da empresa."
                  : conversa.kind === "DEPARTMENT"
                    ? "Nenhuma mensagem ainda. O que for escrito aqui chega para todo mundo do setor."
                    : "Nenhuma mensagem ainda. Comece a conversa abaixo."}
            </p>
          ) : null}

          {conversa.messages.map((mensagem, indice) => {
            const anterior = conversa.messages[indice - 1];
            const colado = sameBlock(anterior, mensagem);
            const meu = !mensagem.fromSupport && mensagem.authorId === user.id;
            const dia = messageDay(mensagem.createdAt);
            // A data so aparece quando vira o dia; comparar com a mensagem
            // anterior evita guardar estado que muda durante o render.
            const mudouDeDia = !anterior || messageDay(anterior.createdAt) !== dia;

            return (
              <div key={mensagem.id}>
                {mudouDeDia ? (
                  <p className="py-3 text-center text-xs font-medium text-slate-400">{dia}</p>
                ) : null}
                <div className={cn("flex", meu ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-md px-3 py-2 text-sm leading-6 sm:max-w-[70%]",
                      colado ? "mt-0.5" : "mt-3",
                      meu
                        ? "bg-slate-950 text-white"
                        : mensagem.fromSupport
                          ? "border border-emerald-200 bg-emerald-50 text-emerald-950"
                          : "border border-slate-200 bg-white text-slate-900",
                    )}
                  >
                    {colado ? null : (
                      <p
                        className={cn(
                          "text-xs font-semibold",
                          meu ? "text-slate-300" : mensagem.fromSupport ? "text-emerald-800" : "text-slate-500",
                        )}
                      >
                        {mensagem.fromSupport ? SUPPORT_AUTHOR_LABEL : meu ? "Você" : mensagem.authorName}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap break-words">{mensagem.body}</p>
                    <p className={cn("mt-1 text-right text-[11px]", meu ? "text-slate-400" : "text-slate-400")}>
                      {messageTime(mensagem.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <MessageComposer conversationId={conversa.id} disabled={somenteLeitura} />
      </section>

      {somenteLeitura ? (
        <p className="text-sm leading-6 text-slate-600">
          As conversas da equipe ficam somente leitura sem assinatura ativa. O canal com o suporte continua aberto.
        </p>
      ) : null}
    </div>
  );
}
