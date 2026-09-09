"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { FormMessage } from "@/components/form-message";
import { buttonClassName } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/fields";
import { createConversationAction } from "@/features/chat/actions";

export type Colleague = {
  id: string;
  name: string;
  position: string | null;
  departmentName: string | null;
};

export function NewConversationForm({ colleagues }: { colleagues: Colleague[] }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [titulo, setTitulo] = useState("");
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function alternar(id: string) {
    setSelecionados((atual) => (atual.includes(id) ? atual.filter((i) => i !== id) : [...atual, id]));
  }

  function criar() {
    setError(undefined);
    startTransition(async () => {
      const result = await createConversationAction({ participantIds: selecionados, title: titulo });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setAberto(false);
      setSelecionados([]);
      setTitulo("");
      router.push(`/conversas/${result.data.conversationId}`);
    });
  }

  if (colleagues.length === 0) {
    return (
      <p className="text-sm leading-6 text-slate-600">
        Sua empresa ainda nao tem outros funcionarios cadastrados. Cadastre a equipe para comecar a conversar.
      </p>
    );
  }

  if (!aberto) {
    return (
      <button className={buttonClassName("primary", "sm")} type="button" onClick={() => setAberto(true)}>
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        Nova conversa
      </button>
    );
  }

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-950">Com quem voce quer falar?</h3>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {colleagues.map((colega) => (
          <li key={colega.id}>
            <label className="flex cursor-pointer items-start gap-2 rounded-md border border-slate-200 p-2 text-sm hover:bg-slate-50">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300"
                checked={selecionados.includes(colega.id)}
                onChange={() => alternar(colega.id)}
              />
              <span>
                <span className="font-medium text-slate-950">{colega.name}</span>
                <span className="block text-xs text-slate-500">
                  {[colega.position, colega.departmentName].filter(Boolean).join(" - ") || "Sem setor"}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>

      {selecionados.length > 1 ? (
        <div className="mt-3 space-y-1.5">
          <Label>Nome da conversa (opcional)</Label>
          <Input
            value={titulo}
            maxLength={80}
            placeholder="Ex.: Reposicao de estoque"
            onChange={(event) => setTitulo(event.target.value)}
          />
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className={buttonClassName("primary", "sm")}
          type="button"
          disabled={isPending || selecionados.length === 0}
          onClick={criar}
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
          {isPending ? "Criando..." : "Criar conversa"}
        </button>
        <button
          className={buttonClassName("secondary", "sm")}
          type="button"
          disabled={isPending}
          onClick={() => setAberto(false)}
        >
          Cancelar
        </button>
      </div>
      <div className="mt-2">
        <FormMessage error={error} />
      </div>
    </div>
  );
}
