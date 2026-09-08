"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Tela de falha de uma pagina interna.
 *
 * Duas coisas aqui vieram de um caso real. A primeira: o erro precisa deixar
 * rastro. Esta tela ja existia sem registrar nada, e uma falha de producao ficou
 * sem nenhuma pista — nem no navegador, nem no servidor — o que transformou o
 * diagnostico em adivinhacao.
 *
 * A segunda: `reset()` sozinho nao resolve o caso mais comum. Depois de um
 * deploy, a pagina aberta no navegador aponta para uma versao que nao existe
 * mais no servidor, e tentar de novo com o mesmo codigo antigo falha de novo.
 * So recarregar busca a versao nova.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[zelo] falha ao carregar a pagina:", error);
  }, [error]);

  return (
    <div className="rounded-md border border-rose-200 bg-white p-6">
      <h1 className="text-lg font-semibold text-slate-950">Algo saiu do caminho</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        A pagina nao conseguiu carregar os dados agora. Se o problema comecou logo depois de uma atualizacao do
        sistema, recarregar resolve.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" onClick={() => reset()}>
          Tentar novamente
        </Button>
        <Button variant="secondary" type="button" onClick={() => window.location.reload()}>
          Recarregar a pagina
        </Button>
      </div>
      {error.digest ? (
        <p className="mt-3 text-xs text-slate-500">
          Codigo do erro: <span className="font-mono">{error.digest}</span> — informe este codigo ao suporte.
        </p>
      ) : null}
    </div>
  );
}
