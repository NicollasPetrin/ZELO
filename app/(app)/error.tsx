"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="rounded-md border border-rose-200 bg-white p-6">
      <h1 className="text-lg font-semibold text-slate-950">Algo saiu do caminho</h1>
      <p className="mt-2 text-sm text-slate-600">A pagina nao conseguiu carregar os dados agora.</p>
      <Button className="mt-4" type="button" onClick={() => reset()}>
        Tentar novamente
      </Button>
    </div>
  );
}
