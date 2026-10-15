import Link from "next/link";
import { KanbanSquare, List } from "lucide-react";
import { cn } from "@/lib/cn";
import type { SearchParams } from "@/lib/search";

export type TaskView = "lista" | "quadro";

export function parseTaskView(value: string | undefined): TaskView {
  return value === "quadro" ? "quadro" : "lista";
}

/** Troca entre lista e quadro mantendo os filtros. A pagina volta para a primeira, que e o que faz sentido ao mudar de visao. */
export function TaskViewSwitch({ basePath, params, view }: { basePath: string; params: SearchParams; view: TaskView }) {
  function link(destino: TaskView) {
    const query = new URLSearchParams();
    for (const [chave, valor] of Object.entries(params)) {
      if (chave === "view" || chave === "page" || valor === undefined) {
        continue;
      }
      for (const v of Array.isArray(valor) ? valor : [valor]) {
        query.append(chave, v);
      }
    }
    if (destino === "quadro") {
      query.set("view", "quadro");
    }
    const texto = query.toString();
    return texto ? `${basePath}?${texto}` : basePath;
  }

  const opcoes = [
    { valor: "lista" as const, rotulo: "Lista", Icon: List },
    { valor: "quadro" as const, rotulo: "Quadro", Icon: KanbanSquare },
  ];

  return (
    <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5 shadow-sm" role="group" aria-label="Visão das tarefas">
      {opcoes.map(({ valor, rotulo, Icon }) => (
        <Link
          key={valor}
          href={link(valor)}
          aria-current={view === valor ? "page" : undefined}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded px-3 text-xs font-medium",
            view === valor ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
          )}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {rotulo}
        </Link>
      ))}
    </div>
  );
}
