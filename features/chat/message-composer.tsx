"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, SendHorizontal } from "lucide-react";
import { FormMessage } from "@/components/form-message";
import { buttonClassName } from "@/components/ui/button";
import { Textarea } from "@/components/ui/fields";
import { markConversationReadAction, sendMessageAction } from "@/features/chat/actions";
import { MESSAGE_MAX } from "@/lib/validations";

/** De quanto em quanto tempo a conversa aberta procura mensagem nova. */
const INTERVALO_MS = 10_000;

/**
 * Caixa de escrita da conversa, que tambem mantem a tela viva.
 *
 * A atualizacao e por consulta periodica, e nao por conexao permanente: o
 * volume aqui e de uma equipe pequena conversando, e uma conexao aberta por
 * usuario custaria bem mais do que resolve. A busca so acontece com a aba
 * visivel — atualizar uma conversa que ninguem esta olhando e gasto puro.
 */
export function MessageComposer({ conversationId, disabled }: { conversationId: string; disabled?: boolean }) {
  const router = useRouter();
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // Abrir a conversa ja e ter lido: o aviso de nao lida some assim que a
    // pessoa chega, e nao depois que ela responde.
    void markConversationReadAction(conversationId);
  }, [conversationId]);

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }, INTERVALO_MS);

    return () => clearInterval(id);
  }, [router]);

  function enviar() {
    const area = areaRef.current;
    const body = area?.value.trim();

    if (!body) {
      return;
    }

    setError(undefined);
    startTransition(async () => {
      const result = await sendMessageAction({ conversationId, body });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      if (area) {
        area.value = "";
      }

      router.refresh();
    });
  }

  return (
    <div className="border-t border-slate-200 bg-white p-3">
      <div className="flex items-end gap-2">
        <Textarea
          ref={areaRef}
          rows={2}
          maxLength={MESSAGE_MAX}
          disabled={disabled || isPending}
          placeholder={disabled ? "Conversa somente leitura" : "Escreva uma mensagem"}
          aria-label="Mensagem"
          onKeyDown={(event) => {
            // Enter envia, Shift+Enter quebra linha: e o que a mao ja espera de
            // uma caixa de conversa.
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              enviar();
            }
          }}
        />
        <button
          className={buttonClassName("primary")}
          type="button"
          disabled={disabled || isPending}
          onClick={enviar}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <SendHorizontal className="h-4 w-4" aria-hidden="true" />
          )}
          <span className="sr-only sm:not-sr-only">Enviar</span>
        </button>
      </div>
      <div className="mt-2">
        <FormMessage error={error} />
      </div>
    </div>
  );
}
