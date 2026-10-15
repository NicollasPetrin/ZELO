"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { CompanyAvatar } from "@/components/company-avatar";
import { buttonClassName } from "@/components/ui/button";
import { LOGO_ACCEPT, LOGO_MAX_BYTES } from "@/lib/company-logo";

/** Envio e remocao da logo. A imagem sobe por rota, e nao por Server Action, pelo mesmo motivo da foto de prova: tamanho. */
export function CompanyLogoCard({
  companyName,
  logoUrl,
  storageReady,
}: {
  companyName: string;
  logoUrl: string | null;
  storageReady: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [erro, setErro] = useState<string>();
  const [aviso, setAviso] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function enviar(arquivo: File) {
    setErro(undefined);
    setAviso(undefined);

    // Conferido aqui so para poupar o envio; o servidor confere de novo, pelos bytes.
    if (arquivo.size > LOGO_MAX_BYTES) {
      setErro("A logo passa de 2 MB. Use uma imagem menor.");
      return;
    }

    startTransition(async () => {
      const corpo = new FormData();
      corpo.append("logo", arquivo);
      const resposta = await fetch("/api/empresa/logo", { method: "POST", body: corpo });
      const dados = (await resposta.json().catch(() => ({}))) as { error?: string };

      if (!resposta.ok) {
        setErro(dados.error ?? "Não foi possível enviar a logo.");
        return;
      }

      setAviso("Logo atualizada. Ela já aparece na barra lateral para toda a equipe.");
      router.refresh();
    });
  }

  function remover() {
    setErro(undefined);
    setAviso(undefined);
    startTransition(async () => {
      const resposta = await fetch("/api/empresa/logo", { method: "DELETE" });
      if (!resposta.ok) {
        setErro("Não foi possível remover a logo.");
        return;
      }
      setAviso("Logo removida. A barra volta a mostrar as iniciais.");
      router.refresh();
    });
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm" aria-labelledby="logo-titulo">
      <h2 id="logo-titulo" className="text-base font-semibold text-slate-950">Logo da empresa</h2>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
        A logo aparece no topo da barra lateral para todo mundo da empresa. Sem logo, aparecem as iniciais.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <CompanyAvatar name={companyName} logoUrl={logoUrl} className="h-16 w-16 text-xl" />
        <div className="space-y-2">
          {storageReady ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={buttonClassName("primary", "sm")}
                disabled={isPending}
                onClick={() => inputRef.current?.click()}
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Upload className="h-3.5 w-3.5" aria-hidden="true" />}
                {logoUrl ? "Trocar logo" : "Enviar logo"}
              </button>
              {logoUrl ? (
                <button type="button" className={buttonClassName("secondary", "sm")} disabled={isPending} onClick={remover}>
                  Remover
                </button>
              ) : null}
              <input
                ref={inputRef}
                type="file"
                accept={LOGO_ACCEPT}
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(event) => {
                  const arquivo = event.target.files?.[0];
                  event.target.value = "";
                  if (arquivo) {
                    enviar(arquivo);
                  }
                }}
              />
            </div>
          ) : (
            <p className="text-sm text-amber-800">O armazenamento de arquivos ainda não está configurado, então a logo não pode ser enviada.</p>
          )}
          <p className="text-xs text-slate-500">PNG, JPG ou WEBP, até 2 MB. Quadrada fica melhor; retangular é centralizada.</p>
        </div>
      </div>

      {erro ? <p role="alert" className="mt-3 text-sm font-medium text-rose-700">{erro}</p> : null}
      {aviso ? <p role="status" className="mt-3 text-sm font-medium text-emerald-700">{aviso}</p> : null}
    </section>
  );
}
