"use client";

import Link from "next/link";
import { useState, useTransition, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import type { TaskPriority, TaskStatus } from "@prisma/client";
import { PriorityBadge } from "@/components/priority-badge";
import { updateTaskStatusAction } from "@/features/tasks/actions";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { statusLabels } from "@/lib/labels";

export type BoardTask = {
  id: string;
  title: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  late: boolean;
  requiresProof: boolean;
  hasProof: boolean;
  assigneeName: string | null;
  departmentName: string | null;
};

const COLUNAS = ["PENDING", "IN_PROGRESS", "IN_REVIEW", "COMPLETED"] as const;
type Coluna = (typeof COLUNAS)[number];

const corDaColuna: Record<Coluna, string> = {
  PENDING: "bg-slate-400",
  IN_PROGRESS: "bg-sky-500",
  IN_REVIEW: "bg-violet-500",
  COMPLETED: "bg-emerald-500",
};

/** "Atrasada" nao e coluna: e prazo vencido. A tarefa fica em Pendente, com o aviso. */
function colunaDe(status: TaskStatus): Coluna {
  return status === "OVERDUE" ? "PENDING" : (status as Coluna);
}

function ordem(a: BoardTask, b: BoardTask) {
  const pesos: Record<TaskPriority, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  return Number(b.late) - Number(a.late) || a.dueDate.localeCompare(b.dueDate) || pesos[a.priority] - pesos[b.priority];
}

/**
 * Quadro de tarefas por status.
 *
 * Mover o card chama a mesma acao da lista, entao valem as mesmas regras: quem
 * pode mexer, a exigencia de foto para concluir, o aviso para quem cobrou e a
 * agenda. O card anda na hora e volta se o servidor recusar, com o motivo.
 */
export function TaskBoard({
  tasks,
  showAssignee,
  completedDays,
}: {
  tasks: BoardTask[];
  showAssignee: boolean;
  completedDays: number;
}) {
  const router = useRouter();
  const [itens, setItens] = useState(tasks);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [sobre, setSobre] = useState<Coluna | null>(null);
  const [erro, setErro] = useState<string>();
  const [, startTransition] = useTransition();

  // Quando o servidor manda uma lista nova (filtro, atualizacao), ela vale.
  const [origem, setOrigem] = useState(tasks);
  if (origem !== tasks) {
    setOrigem(tasks);
    setItens(tasks);
  }

  function mover(taskId: string, destino: Coluna) {
    const tarefa = itens.find((t) => t.id === taskId);
    if (!tarefa || colunaDe(tarefa.status) === destino) {
      return;
    }

    const antes = itens;
    setErro(undefined);
    setItens((atual) => atual.map((t) => (t.id === taskId ? { ...t, status: destino, late: destino === "COMPLETED" ? false : t.late } : t)));

    startTransition(async () => {
      const result = await updateTaskStatusAction({ taskId, status: destino });
      if (result.ok) {
        router.refresh();
      } else {
        setItens(antes);
        setErro(`"${tarefa.title}": ${result.error}`);
      }
    });
  }

  function soltar(event: DragEvent, coluna: Coluna) {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/plain") || arrastando;
    setSobre(null);
    setArrastando(null);
    if (id) {
      mover(id, coluna);
    }
  }

  return (
    <div className="space-y-3">
      {erro ? (
        <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {erro}
        </p>
      ) : null}

      {/* No celular e no tablet as colunas deslizam de lado, uma quase da largura da tela; so cabem as quatro juntas em tela larga. */}
      <div className="-mx-4 snap-x snap-mandatory overflow-x-auto px-4 pb-2 lg:mx-0 lg:px-0 xl:snap-none">
        <div className="grid auto-cols-[minmax(260px,85%)] grid-flow-col gap-3 sm:auto-cols-[300px] xl:auto-cols-auto xl:grid-flow-row xl:grid-cols-4">
          {COLUNAS.map((coluna) => {
            const daColuna = itens.filter((t) => colunaDe(t.status) === coluna).sort(ordem);

            return (
              <section
                key={coluna}
                aria-label={statusLabels[coluna]}
                onDragOver={(event) => {
                  event.preventDefault();
                  setSobre(coluna);
                }}
                onDragLeave={() => setSobre((atual) => (atual === coluna ? null : atual))}
                onDrop={(event) => soltar(event, coluna)}
                className={cn(
                  "flex min-h-80 min-w-0 snap-start flex-col gap-2 rounded-md border-2 border-dashed p-2 transition-colors",
                  sobre === coluna ? "border-emerald-400 bg-emerald-50" : "border-transparent bg-slate-100",
                )}
              >
                <h2 className="flex items-center gap-2 px-1 py-1 text-xs font-semibold uppercase text-slate-600">
                  <span className={cn("h-2 w-2 rounded-full", corDaColuna[coluna])} aria-hidden="true" />
                  {statusLabels[coluna]}
                  <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-500">{daColuna.length}</span>
                </h2>

                {daColuna.map((tarefa) => (
                  <article
                    key={tarefa.id}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", tarefa.id);
                      event.dataTransfer.effectAllowed = "move";
                      setArrastando(tarefa.id);
                    }}
                    onDragEnd={() => {
                      setArrastando(null);
                      setSobre(null);
                    }}
                    className={cn(
                      "min-w-0 cursor-grab rounded-md border bg-white p-3 shadow-sm active:cursor-grabbing",
                      tarefa.late ? "border-rose-200" : "border-slate-200",
                      arrastando === tarefa.id && "opacity-50",
                    )}
                  >
                    <Link href={`/tasks/${tarefa.id}`} className="block break-words text-sm font-medium text-slate-950 hover:underline">
                      {tarefa.title}
                    </Link>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                      <PriorityBadge priority={tarefa.priority} />
                      <span className={cn(tarefa.late ? "font-semibold text-rose-700" : "text-slate-500")}>
                        {tarefa.late ? "Atrasada · " : ""}
                        {formatDate(tarefa.dueDate)}
                      </span>
                    </div>
                    {showAssignee || tarefa.departmentName ? (
                      <p className="mt-1.5 truncate text-xs text-slate-500">
                        {[showAssignee ? tarefa.assigneeName : null, tarefa.departmentName].filter(Boolean).join(" · ")}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      {tarefa.requiresProof ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium",
                            tarefa.hasProof ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800",
                          )}
                        >
                          <Camera className="h-3 w-3" aria-hidden="true" />
                          {tarefa.hasProof ? "Foto enviada" : "Exige foto"}
                        </span>
                      ) : (
                        <span />
                      )}
                      <select
                        value=""
                        onChange={(event) => mover(tarefa.id, event.target.value as Coluna)}
                        aria-label={`Mover "${tarefa.title}" para`}
                        className="h-7 max-w-full rounded border border-slate-200 bg-white px-1.5 text-xs text-slate-700"
                      >
                        <option value="">Mover para…</option>
                        {COLUNAS.filter((c) => c !== coluna).map((c) => (
                          <option key={c} value={c}>
                            {statusLabels[c]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </article>
                ))}

                {daColuna.length === 0 ? (
                  <p className="px-1 py-6 text-center text-xs text-slate-400">Arraste um card para cá.</p>
                ) : null}
              </section>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Concluídas dos últimos {completedDays} dias. Canceladas ficam fora do quadro e aparecem na lista.
      </p>
    </div>
  );
}
