import Link from "next/link";
import { Trophy } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SubscriptionRequiredCard } from "@/components/subscription-required-card";
import { getPointsBoard, parsePointsPeriod, pointsPeriodLabels, pointsPeriods } from "@/features/points/data";
import { requireUser } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { priorityLabels } from "@/lib/labels";
import { POINTS_BY_PRIORITY, priorityOrder } from "@/lib/points";
import { getActivePlanCode } from "@/lib/subscription";

const priorityClasses: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-700",
  MEDIUM: "bg-sky-100 text-sky-800",
  HIGH: "bg-amber-100 text-amber-900",
  URGENT: "bg-rose-100 text-rose-800",
};

export default async function PontosPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const user = await requireUser();

  if (!getActivePlanCode(user.company)) {
    return <SubscriptionRequiredCard />;
  }

  const params = await searchParams;
  const period = parsePointsPeriod(params.periodo);
  const board = await getPointsBoard(user, period);
  const lider = board.members[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pontos"
        description="Cada tarefa concluida vale pontos conforme a prioridade. Quanto mais pesada a tarefa, mais ela conta."
      />

      <div className="flex flex-wrap items-center gap-2">
        {pointsPeriods.map((opcao) => (
          <Link
            key={opcao}
            href={`/pontos?periodo=${opcao}`}
            aria-current={opcao === period ? "page" : undefined}
            className={cn(
              "inline-flex h-9 items-center rounded-md px-3 text-sm font-medium transition-colors",
              opcao === period
                ? "bg-slate-950 text-white"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
            )}
          >
            {pointsPeriodLabels[opcao]}
          </Link>
        ))}
      </div>

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">Quanto vale cada prioridade</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {priorityOrder.map((prioridade) => (
            <span
              key={prioridade}
              className={cn("inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm", priorityClasses[prioridade])}
            >
              {priorityLabels[prioridade]}
              <strong className="tabular-nums">{POINTS_BY_PRIORITY[prioridade]} pts</strong>
            </span>
          ))}
        </div>
      </section>

      {board.companyTasks === 0 ? (
        <EmptyState
          title="Nenhuma tarefa concluida no periodo"
          description="Os pontos aparecem assim que a equipe concluir tarefas. Experimente um periodo maior."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Pontos da equipe</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-950">{board.companyPoints}</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-normal text-slate-500">Tarefas concluidas</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-950">{board.companyTasks}</p>
            </div>
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-normal text-emerald-700">Na frente</p>
              <p className="mt-1 flex items-center gap-2 text-lg font-semibold text-emerald-900">
                <Trophy className="h-4 w-4" aria-hidden="true" />
                {lider && lider.points > 0 ? `${lider.name} - ${lider.points} pts` : "Ninguem pontuou ainda"}
              </p>
            </div>
          </div>

          <section className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-normal text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">#</th>
                    <th className="px-4 py-3 font-medium">Funcionario</th>
                    {priorityOrder.map((prioridade) => (
                      <th key={prioridade} className="px-4 py-3 text-center font-medium">
                        {priorityLabels[prioridade]}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right font-medium">Tarefas</th>
                    <th className="px-4 py-3 text-right font-medium">Pontos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {board.members.map((membro) => (
                    <tr key={membro.id} className={cn(membro.isSelf && "bg-emerald-50/60")}>
                      <td className="px-4 py-3 tabular-nums text-slate-500">
                        {/* Quem nao pontuou no periodo nao recebe colocacao: um "1o lugar" com zero ponto engana. */}
                        {membro.points > 0 ? membro.position : <span className="text-slate-300">-</span>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-950">
                          {membro.name}
                          {membro.isSelf ? <span className="ml-2 text-xs text-emerald-700">voce</span> : null}
                        </p>
                        <p className="text-xs text-slate-500">
                          {[membro.position_role, membro.departmentName].filter(Boolean).join(" - ") || "Sem setor"}
                        </p>
                      </td>
                      {priorityOrder.map((prioridade) => (
                        <td key={prioridade} className="px-4 py-3 text-center tabular-nums text-slate-700">
                          {membro.counts[prioridade] || <span className="text-slate-300">0</span>}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700">{membro.tasks}</td>
                      <td className="px-4 py-3 text-right text-base font-semibold tabular-nums text-slate-950">
                        {membro.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
