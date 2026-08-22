import type { TaskStatus } from "@prisma/client";
import { statusLabels } from "@/lib/labels";

/**
 * Mesmas familias de cor dos crachas de status (components/status-badge.tsx),
 * so que em peso solido: o mesmo status precisa ter a mesma cor na barra e no
 * cracha, senao a leitura da barra exige traducao mental.
 */
const statusColors: Record<TaskStatus, string> = {
  PENDING: "bg-slate-400",
  IN_PROGRESS: "bg-sky-500",
  IN_REVIEW: "bg-violet-500",
  COMPLETED: "bg-emerald-600",
  OVERDUE: "bg-rose-500",
  CANCELED: "bg-zinc-300",
};

/** Abaixo disso o rotulo nao cabe sobre o segmento sem colidir com o vizinho. */
const minPercentForLabel = 8;

export type StatusDistributionItem = {
  status: TaskStatus;
  count: number;
  percent: number;
};

export function StatusDistribution({ items }: { items: StatusDistributionItem[] }) {
  const present = items.filter((item) => item.count > 0);
  const total = items.reduce((sum, item) => sum + item.count, 0);

  if (!total) {
    return (
      <p className="mt-4 text-sm leading-6 text-slate-500">
        Nenhuma tarefa cadastrada ainda. A distribuicao aparece assim que a equipe comecar a registrar tarefas.
      </p>
    );
  }

  return (
    <div className="mt-4">
      {/*
        As duas linhas usam o mesmo flexGrow por segmento, entao o rotulo fica
        sempre sobre a fatia que descreve. Usar flexGrow em vez de width com
        percentual arredondado tambem evita a sobra no fim da barra quando os
        percentuais nao somam exatamente 100.
      */}
      <div className="flex" aria-hidden="true">
        {present.map((item) => (
          <div key={item.status} className="min-w-0 px-1 text-center" style={{ flexGrow: item.count }}>
            {item.percent >= minPercentForLabel ? (
              <span className="block truncate text-sm font-semibold text-slate-950">{item.percent}%</span>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-1 flex h-3 overflow-hidden rounded-md bg-slate-100" aria-hidden="true">
        {present.map((item) => (
          <div key={item.status} className={statusColors[item.status]} style={{ flexGrow: item.count }} />
        ))}
      </div>

      {/* A barra e decorativa: os numeros acessiveis vivem aqui. */}
      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
        {present.map((item) => (
          <li key={item.status} className="flex items-center gap-2 text-sm text-slate-600">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${statusColors[item.status]}`} aria-hidden="true" />
            <span>
              {statusLabels[item.status]}
              <span className="ml-1 text-slate-400">
                {item.count} ({item.percent}%)
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
