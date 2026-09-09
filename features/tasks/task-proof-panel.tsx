"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, Loader2, ShieldCheck, X } from "lucide-react";
import { FormMessage } from "@/components/form-message";
import { buttonClassName } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/fields";
import { approveTaskProofAction, rejectTaskProofAction } from "@/features/tasks/actions";
import { PROOF_ACCEPT, PROOF_MAX_BYTES, validateProofFile } from "@/lib/task-proof";

export type ProofItem = {
  id: string;
  note: string | null;
  authorName: string;
  createdAt: string;
};

export function TaskProofPanel({
  taskId,
  requiresProof,
  proofs,
  canReview,
  canSend,
  status,
}: {
  taskId: string;
  requiresProof: boolean;
  proofs: ProofItem[];
  canReview: boolean;
  canSend: boolean;
  status: string;
}) {
  const router = useRouter();
  const arquivoRef = useRef<HTMLInputElement>(null);
  const notaRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [enviando, setEnviando] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function enviar() {
    const arquivo = arquivoRef.current?.files?.[0];

    if (!arquivo) {
      setError("Escolha a foto que comprova a conclusao.");
      return;
    }

    // A mesma regra do servidor roda aqui antes do envio: nao para segurar
    // ninguem — o servidor confere de novo — mas para nao fazer a pessoa subir
    // oito megabytes pelo 4G so para receber a recusa no fim.
    const validacao = validateProofFile({ type: arquivo.type, size: arquivo.size });

    if (!validacao.ok) {
      setError(validacao.reason);
      return;
    }

    setError(undefined);
    setMessage(undefined);
    setEnviando(true);

    try {
      const form = new FormData();
      form.set("foto", arquivo);
      form.set("nota", notaRef.current?.value ?? "");

      const resposta = await fetch(`/api/tarefas/${taskId}/prova`, { method: "POST", body: form });
      const corpo = await resposta.json().catch(() => ({}));

      if (!resposta.ok) {
        setError(corpo.error ?? "Nao foi possivel enviar a foto.");
        return;
      }

      if (arquivoRef.current) {
        arquivoRef.current.value = "";
      }

      if (notaRef.current) {
        notaRef.current.value = "";
      }

      setMessage("Foto enviada. A tarefa foi para revisao.");
      router.refresh();
    } catch {
      setError("Falha de conexao ao enviar a foto.");
    } finally {
      setEnviando(false);
    }
  }

  function revisar(aprovar: boolean) {
    setError(undefined);
    setMessage(undefined);
    startTransition(async () => {
      const motivo = aprovar ? "" : (notaRef.current?.value ?? "");
      const result = aprovar
        ? await approveTaskProofAction({ taskId, reason: "" })
        : await rejectTaskProofAction({ taskId, reason: motivo });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setMessage(result.message);
      router.refresh();
    });
  }

  const emRevisao = status === "IN_REVIEW";
  const limiteMb = Math.round(PROOF_MAX_BYTES / (1024 * 1024));

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="flex items-center gap-2 text-base font-semibold text-slate-950">
        <ShieldCheck className="h-4 w-4 text-emerald-700" aria-hidden="true" />
        Prova de conclusao
      </h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">
        {requiresProof
          ? "Esta tarefa so pode ser concluida com foto. Quem cobrou a tarefa aprova a prova enviada."
          : "Esta tarefa nao exige foto, mas voce pode anexar uma para registrar o servico feito."}
      </p>

      {proofs.length > 0 ? (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {proofs.map((prova) => (
            <li key={prova.id} className="overflow-hidden rounded-md border border-slate-200">
              <a href={`/api/provas/${prova.id}`} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/provas/${prova.id}`}
                  alt={`Prova enviada por ${prova.authorName}`}
                  className="h-40 w-full bg-slate-100 object-cover"
                  loading="lazy"
                />
              </a>
              <div className="px-3 py-2">
                <p className="text-xs text-slate-500">
                  {prova.authorName} - {prova.createdAt}
                </p>
                {prova.note ? <p className="mt-1 text-sm leading-6 text-slate-800">{prova.note}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">Nenhuma foto enviada ainda.</p>
      )}

      {canSend ? (
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          <div className="space-y-1.5">
            <Label>Foto do servico concluido</Label>
            <Input
              ref={arquivoRef}
              type="file"
              accept={PROOF_ACCEPT}
              // Abre a camera direto no celular, que e onde a foto e tirada.
              capture="environment"
              disabled={enviando}
            />
            <p className="text-xs leading-5 text-slate-500">JPG, PNG, WEBP ou HEIC, ate {limiteMb} MB.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Observacao (opcional)</Label>
            <Input ref={notaRef} maxLength={500} placeholder="Ex.: prateleira reposta e etiquetada" disabled={enviando} />
          </div>
          <button className={buttonClassName("primary", "sm")} type="button" disabled={enviando} onClick={enviar}>
            {enviando ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Camera className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {enviando ? "Enviando..." : "Enviar prova"}
          </button>
        </div>
      ) : null}

      {canReview && proofs.length > 0 ? (
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          <p className="text-sm font-semibold text-slate-950">
            {emRevisao ? "Esta tarefa esta esperando sua revisao." : "Revisao da prova"}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              className={buttonClassName("primary", "sm")}
              type="button"
              disabled={isPending}
              onClick={() => revisar(true)}
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              Aprovar e concluir
            </button>
            <button
              className={buttonClassName("danger", "sm")}
              type="button"
              disabled={isPending}
              onClick={() => revisar(false)}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Recusar
            </button>
          </div>
          <p className="text-xs leading-5 text-slate-500">
            Ao recusar, o texto do campo de observacao acima vira o motivo e fica registrado na tarefa.
          </p>
        </div>
      ) : null}

      <div className="mt-3">
        <FormMessage message={message} error={error} />
      </div>
    </div>
  );
}
