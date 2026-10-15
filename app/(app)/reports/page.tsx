import Link from "next/link";
import { AlertTriangle, BarChart3, CheckCircle2, Clock, Crown, ListChecks, Target, Users } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { LockedFeatureCard } from "@/components/locked-feature-card";
import { PageHeader } from "@/components/page-header";
import { ProgressBar } from "@/components/progress-bar";
import { CriticalTaskList } from "@/components/reports/critical-task-list";
import { DepartmentMetricsTable } from "@/components/reports/department-metrics-table";
import { EmployeeMetricsTable } from "@/components/reports/employee-metrics-table";
import { StatCard } from "@/components/stat-card";
import { StatusDistribution } from "@/components/status-distribution";
import { SubscriptionRequiredCard } from "@/components/subscription-required-card";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { getPremiumWorkspaceData } from "@/features/premium/data";
import { requireTeamArea } from "@/lib/auth/guards";
import { formatGoalValue, getGoalProgress } from "@/lib/format";
import { goalStatusLabels, priorityLabels } from "@/lib/labels";
import { canManageCompany } from "@/lib/permissions";
import { getPlanAccess } from "@/lib/plans";
import { getActivePlanCode } from "@/lib/subscription";

const goalStatusClasses = {
  ON_TRACK: "bg-emerald-100 text-emerald-800",
  ATTENTION: "bg-amber-100 text-amber-800",
  LATE: "bg-rose-100 text-rose-800",
  COMPLETED: "bg-sky-100 text-sky-800",
};

export default async function ReportsPage() {
  const user = await requireTeamArea();
  const activePlanCode = getActivePlanCode(user.company);

  if (!activePlanCode) {
    return <SubscriptionRequiredCard />;
  }

  const access = getPlanAccess(activePlanCode);

  if (!access.canUseBasicReports) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Relatórios"
          description="Relatórios de tarefas, setores e responsáveis entram a partir do Plano Gestão."
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
          title="Relatórios básicos"
          description="O Plano Básico acompanha tarefas e prazos. Relatórios por setor, responsável e status ficam disponíveis no Plano Gestão."
          requiredPlan="Gestão"
        />
      </div>
    );
  }

  const report = await getPremiumWorkspaceData(user);

  if (!access.canUseAdvancedReports) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Relatórios básicos"
          description={`Visão operacional de ${report.companyName}: tarefas, atrasos, setores e responsáveis.`}
          actions={<Link href="/team-tasks" className={buttonClassName("primary")}>Ver tarefas</Link>}
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Tarefas abertas" value={report.totals.openTasks} hint={`${report.totals.totalTasks} tarefas cadastradas`} icon={<ListChecks className="h-5 w-5" />} />
          <StatCard label="Atrasadas" value={report.totals.overdueTasks} hint={`${report.totals.overdueRate}% das tarefas abertas`} icon={<AlertTriangle className="h-5 w-5" />} tone={report.totals.overdueTasks > 0 ? "danger" : "success"} />
          <StatCard label="Concluídas" value={report.totals.completedTasks} hint={`${report.totals.completionRate}% de conclusão`} icon={<CheckCircle2 className="h-5 w-5" />} tone="success" />
          <StatCard label="Próximos prazos" value={report.totals.dueSoonTasks} hint="Vencem nos próximos 14 dias" icon={<Clock className="h-5 w-5" />} />
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-950">Resumo por setor</h2>
            <DepartmentMetricsTable departments={report.departmentMetrics} />
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-950">Resumo por responsável</h2>
            <EmployeeMetricsTable employees={report.employeeMetrics} />
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">Distribuição por status</h2>
            <StatusDistribution items={report.statusDistribution} />
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">Tarefas que pedem atenção</h2>
            <div className="mt-4">
              <CriticalTaskList tasks={report.criticalTasks} />
            </div>
          </div>
        </section>

        <LockedFeatureCard
          title="Relatórios completos"
          description="O Plano Completo adiciona saúde operacional, leitura executiva, metas em risco e recomendações automáticas."
          requiredPlan="Completo"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios completos"
        description={`Visão executiva de ${report.companyName}, atualizada com os dados atuais da operação.`}
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
        <StatCard label="Saúde operacional" value={`${report.totals.healthScore}%`} hint="Score combinado de atrasos, urgências e metas" icon={<BarChart3 className="h-5 w-5" />} tone={report.totals.healthScore < 70 ? "warning" : "success"} />
        <StatCard label="Conclusão" value={`${report.totals.completionRate}%`} hint={`${report.totals.completedTasks} de ${report.totals.totalTasks} tarefas`} icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard label="Atrasadas" value={report.totals.overdueTasks} hint={`${report.totals.overdueRate}% das tarefas abertas`} icon={<AlertTriangle className="h-5 w-5" />} tone={report.totals.overdueTasks > 0 ? "danger" : "success"} />
        <StatCard label="Metas em risco" value={report.totals.goalsAtRisk} hint={`${report.totals.averageGoalProgress}% de progresso médio`} icon={<Target className="h-5 w-5" />} tone={report.totals.goalsAtRisk > 0 ? "warning" : "success"} />
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
          <h2 className="text-base font-semibold text-slate-950">Distribuição por prioridade</h2>
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
          <DepartmentMetricsTable departments={report.departmentMetrics} showGoalsAtRisk />
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-950">Carga por responsável</h2>
          <EmployeeMetricsTable employees={report.employeeMetrics} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Tarefas críticas</h2>
          <div className="mt-4">
            <CriticalTaskList tasks={report.criticalTasks} />
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Metas que precisam de revisão</h2>
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
                          {goal.department?.name ?? "Empresa inteira"} - {goal.responsible?.name ?? "Sem responsável"}
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
              <EmptyState title="Metas estáveis" description="Nenhuma meta está em atenção ou atraso agora." />
            )}
          </div>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">Distribuição por status</h2>
        <StatusDistribution items={report.statusDistribution} />
      </section>
    </div>
  );
}
