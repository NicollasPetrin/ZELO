import Link from "next/link";
import { AlertTriangle, BarChart3, Building2, CheckCircle2, Clock, Crown, ListChecks, Target, Users } from "lucide-react";
import { DataTable, Td, Th } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { LockedFeatureCard } from "@/components/locked-feature-card";
import { PageHeader } from "@/components/page-header";
import { PriorityBadge } from "@/components/priority-badge";
import { ProgressBar } from "@/components/progress-bar";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { getPremiumWorkspaceData } from "@/features/premium/data";
import { requireTeamArea } from "@/lib/auth/guards";
import { formatDate, formatGoalValue, getGoalProgress, isTaskLate } from "@/lib/format";
import { goalStatusLabels, priorityLabels, statusLabels } from "@/lib/labels";
import { canManageCompany } from "@/lib/permissions";
import { getPlanAccess } from "@/lib/plans";

const goalStatusClasses = {
  ON_TRACK: "bg-emerald-100 text-emerald-800",
  ATTENTION: "bg-amber-100 text-amber-800",
  LATE: "bg-rose-100 text-rose-800",
  COMPLETED: "bg-sky-100 text-sky-800",
};

export default async function ReportsPage() {
  const user = await requireTeamArea();
  const access = getPlanAccess(user.company.plan);

  if (!access.canUseBasicReports) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Relatorios"
          description="Relatorios de tarefas, setores e responsaveis entram a partir do Plano Gestao."
          actions={
            canManageCompany(user.role) ? (
              <Link href="/settings#gerenciamento-assinatura" className={buttonClassName("primary")}>
                <Crown className="h-4 w-4" aria-hidden="true" />
                Ver assinatura
              </Link>
            ) : (
              <Link href="/dashboard" className={buttonClassName("secondary")}>
                Voltar ao painel
              </Link>
            )
          }
        />
        <LockedFeatureCard
          title="Relatorios basicos"
          description="O Plano Basico acompanha tarefas e prazos. Relatorios por setor, responsavel e status ficam disponiveis no Plano Gestao."
          requiredPlan="Gestao"
        />
      </div>
    );
  }

  const report = await getPremiumWorkspaceData(user);

  if (!access.canUseAdvancedReports) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Relatorios basicos"
          description={`Visao operacional de ${report.companyName}: tarefas, atrasos, setores e responsaveis.`}
          actions={<Link href="/team-tasks" className={buttonClassName("primary")}>Ver tarefas</Link>}
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Tarefas abertas" value={report.totals.openTasks} hint={`${report.totals.totalTasks} tarefas cadastradas`} icon={<ListChecks className="h-5 w-5" />} />
          <StatCard label="Atrasadas" value={report.totals.overdueTasks} hint={`${report.totals.overdueRate}% das tarefas abertas`} icon={<AlertTriangle className="h-5 w-5" />} tone={report.totals.overdueTasks > 0 ? "danger" : "success"} />
          <StatCard label="Concluidas" value={report.totals.completedTasks} hint={`${report.totals.completionRate}% de conclusao`} icon={<CheckCircle2 className="h-5 w-5" />} tone="success" />
          <StatCard label="Proximos prazos" value={report.totals.dueSoonTasks} hint="Vencem nos proximos 14 dias" icon={<Clock className="h-5 w-5" />} />
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-950">Resumo por setor</h2>
            <DataTable>
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <Th>Setor</Th>
                    <Th>Abertas</Th>
                    <Th>Atrasadas</Th>
                    <Th>Conclusao</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {report.departmentMetrics.map((department) => (
                    <tr key={department.id}>
                      <Td>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-slate-400" aria-hidden="true" />
                          <span className="font-medium text-slate-950">{department.name}</span>
                        </div>
                      </Td>
                      <Td>{department.openTasks}</Td>
                      <Td>{department.overdueTasks}</Td>
                      <Td>{department.completionRate}%</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DataTable>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-950">Resumo por responsavel</h2>
            <DataTable>
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <Th>Responsavel</Th>
                    <Th>Setor</Th>
                    <Th>Abertas</Th>
                    <Th>Atrasadas</Th>
                    <Th>Conclusao</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {report.employeeMetrics.map((employee) => (
                    <tr key={employee.id}>
                      <Td><span className="font-medium text-slate-950">{employee.name}</span></Td>
                      <Td>{employee.department}</Td>
                      <Td>{employee.openTasks}</Td>
                      <Td>{employee.overdueTasks}</Td>
                      <Td>{employee.completionRate}%</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DataTable>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">Distribuicao por status</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {report.statusDistribution.map((item) => (
                <div key={item.status} className="rounded-md bg-slate-50 p-3">
                  <p className="text-xs font-medium uppercase tracking-normal text-slate-400">{statusLabels[item.status]}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{item.count}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.percent}% do total</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">Tarefas que pedem atencao</h2>
            <div className="mt-4 space-y-3">
              {report.criticalTasks.length ? (
                report.criticalTasks.map((task) => (
                  <Link key={task.id} href={`/tasks/${task.id}`} className="grid gap-3 rounded-md border border-slate-100 p-3 hover:bg-slate-50 md:grid-cols-[1fr_auto]">
                    <div>
                      <p className="font-medium text-slate-950">{task.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {task.assignee.name} - {task.department.name} - {formatDate(task.dueDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <PriorityBadge priority={task.priority} />
                      <StatusBadge status={task.status} late={isTaskLate(task.status, task.dueDate)} />
                    </div>
                  </Link>
                ))
              ) : (
                <EmptyState title="Sem tarefas criticas" description="Nao ha tarefas atrasadas ou urgentes abertas neste momento." />
              )}
            </div>
          </div>
        </section>

        <LockedFeatureCard
          title="Relatorios completos"
          description="O Plano Completo adiciona saude operacional, leitura executiva, metas em risco e recomendacoes automaticas."
          requiredPlan="Completo"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatorios completos"
        description={`Visao executiva de ${report.companyName}, atualizada com os dados atuais da operacao.`}
        actions={
          <>
            <Link href="/team-tasks" className={buttonClassName("secondary")}>
              Ver tarefas
            </Link>
            <Link href="/goals" className={buttonClassName("primary")}>
              Ver metas
            </Link>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Saude operacional" value={`${report.totals.healthScore}%`} hint="Score combinado de atrasos, urgencias e metas" icon={<BarChart3 className="h-5 w-5" />} tone={report.totals.healthScore < 70 ? "warning" : "success"} />
        <StatCard label="Conclusao" value={`${report.totals.completionRate}%`} hint={`${report.totals.completedTasks} de ${report.totals.totalTasks} tarefas`} icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard label="Atrasadas" value={report.totals.overdueTasks} hint={`${report.totals.overdueRate}% das tarefas abertas`} icon={<AlertTriangle className="h-5 w-5" />} tone={report.totals.overdueTasks > 0 ? "danger" : "success"} />
        <StatCard label="Metas em risco" value={report.totals.goalsAtRisk} hint={`${report.totals.averageGoalProgress}% de progresso medio`} icon={<Target className="h-5 w-5" />} tone={report.totals.goalsAtRisk > 0 ? "warning" : "success"} />
        <StatCard label="Equipe ativa" value={report.totals.activeUsers} hint={`${report.totals.activeDepartments} setores ativos`} icon={<Users className="h-5 w-5" />} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Leitura executiva</h2>
          <div className="mt-4 space-y-2">
            {report.recommendations.map((recommendation) => (
              <div key={recommendation} className="rounded-md bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700">
                {recommendation}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Distribuicao por prioridade</h2>
          <div className="mt-4 space-y-3">
            {report.priorityDistribution.map((item) => (
              <div key={item.priority} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{priorityLabels[item.priority]}</span>
                  <span className="text-slate-500">{item.count} tarefa{item.count === 1 ? "" : "s"}</span>
                </div>
                <ProgressBar value={item.percent} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-950">Gargalos por setor</h2>
          <DataTable>
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <Th>Setor</Th>
                  <Th>Abertas</Th>
                  <Th>Atrasadas</Th>
                  <Th>Metas em risco</Th>
                  <Th>Conclusao</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {report.departmentMetrics.map((department) => (
                  <tr key={department.id}>
                    <Td>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-slate-400" aria-hidden="true" />
                        <span className="font-medium text-slate-950">{department.name}</span>
                      </div>
                    </Td>
                    <Td>{department.openTasks}</Td>
                    <Td>{department.overdueTasks}</Td>
                    <Td>{department.goalsAtRisk}</Td>
                    <Td>{department.completionRate}%</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTable>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-950">Carga por responsavel</h2>
          <DataTable>
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <Th>Responsavel</Th>
                  <Th>Setor</Th>
                  <Th>Abertas</Th>
                  <Th>Atrasadas</Th>
                  <Th>Conclusao</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {report.employeeMetrics.map((employee) => (
                  <tr key={employee.id}>
                    <Td>
                      <span className="font-medium text-slate-950">{employee.name}</span>
                    </Td>
                    <Td>{employee.department}</Td>
                    <Td>{employee.openTasks}</Td>
                    <Td>{employee.overdueTasks}</Td>
                    <Td>{employee.completionRate}%</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTable>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Tarefas criticas</h2>
          <div className="mt-4 space-y-3">
            {report.criticalTasks.length ? (
              report.criticalTasks.map((task) => (
                <Link key={task.id} href={`/tasks/${task.id}`} className="grid gap-3 rounded-md border border-slate-100 p-3 hover:bg-slate-50 md:grid-cols-[1fr_auto]">
                  <div>
                    <p className="font-medium text-slate-950">{task.title}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {task.assignee.name} - {task.department.name} - {formatDate(task.dueDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <PriorityBadge priority={task.priority} />
                    <StatusBadge status={task.status} late={isTaskLate(task.status, task.dueDate)} />
                  </div>
                </Link>
              ))
            ) : (
              <EmptyState title="Sem tarefas criticas" description="Nao ha tarefas atrasadas ou urgentes abertas neste momento." />
            )}
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Metas que precisam de revisao</h2>
          <div className="mt-4 space-y-3">
            {report.goalsAtRisk.length ? (
              report.goalsAtRisk.map((goal) => {
                const progress = getGoalProgress(goal.currentValue, goal.targetValue);

                return (
                  <div key={goal.id} className="rounded-md border border-slate-100 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-950">{goal.title}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {goal.department?.name ?? "Empresa inteira"} - {goal.responsible?.name ?? "Sem responsavel"}
                        </p>
                      </div>
                      <Badge className={goalStatusClasses[goal.status]}>{goalStatusLabels[goal.status]}</Badge>
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">
                          {formatGoalValue(goal.currentValue, goal.unit)} de {formatGoalValue(goal.targetValue, goal.unit)}
                        </span>
                        <span className="text-slate-500">{progress}%</span>
                      </div>
                      <ProgressBar value={progress} />
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState title="Metas estaveis" description="Nenhuma meta esta em atencao ou atraso agora." />
            )}
          </div>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">Distribuicao por status</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {report.statusDistribution.map((item) => (
            <div key={item.status} className="rounded-md bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase tracking-normal text-slate-400">{statusLabels[item.status]}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{item.count}</p>
              <p className="mt-1 text-xs text-slate-500">{item.percent}% do total</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
