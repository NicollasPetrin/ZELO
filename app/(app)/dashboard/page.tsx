import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Flame,
  ListChecks,
  Target,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { LockedFeatureCard } from "@/components/locked-feature-card";
import { OnboardingCard } from "@/components/onboarding-card";
import { PageHeader } from "@/components/page-header";
import { PriorityBadge } from "@/components/priority-badge";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { buttonClassName } from "@/components/ui/button";
import { getDashboardData } from "@/features/dashboard/data";
import { requireUser } from "@/lib/auth/session";
import { formatDate, isTaskLate } from "@/lib/format";
import { roleLabels } from "@/lib/labels";
import { isOnboardingCompleted } from "@/lib/onboarding";
import { getPlanAccess } from "@/lib/plans";

const premiumCards = [
  {
    href: "/reports",
    title: "Relatorios completos",
    description: "Leitura executiva com saude operacional, gargalos, prioridades e metas em risco.",
    icon: BarChart3,
  },
  {
    href: "/reports",
    title: "Score operacional",
    description: "Indicador automatico de saude da operacao com base em atrasos, urgencias e metas.",
    icon: CheckCircle2,
  },
  {
    href: "/reports",
    title: "Alertas de risco",
    description: "Visao dos setores, responsaveis e metas que precisam de acao dentro da plataforma.",
    icon: AlertTriangle,
  },
];

const basicReportsCard = {
  href: "/reports",
  title: "Relatorios basicos",
  description: "Resumo de tarefas, atrasos, desempenho por setor e carga por responsavel.",
  icon: BarChart3,
};

export default async function DashboardPage() {
  const user = await requireUser();
  const [dashboard, onboardingCompleted] = await Promise.all([
    getDashboardData(user),
    isOnboardingCompleted(user.id, "dashboard"),
  ]);
  const { teamScope, stats, upcomingTasks, employeeHotspots, departmentHotspots, attentionItems } = dashboard;
  const access = getPlanAccess(user.company.plan);
  const BasicReportsIcon = basicReportsCard.icon;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel"
        description={`Resumo de ${user.company.name}. Voce esta acessando como ${roleLabels[user.role]}.`}
        actions={<Link href={teamScope ? "/team-tasks" : "/my-tasks"} className={buttonClassName("primary")}>Ver tarefas</Link>}
      />

      <OnboardingCard
        stepKey="dashboard"
        title="Acompanhe onde a equipe precisa de atencao"
        description="Acompanhe tarefas atrasadas, pendentes, concluidas e veja onde sua equipe precisa de atencao."
        completed={onboardingCompleted}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Pendentes" value={stats.pending} icon={<Clock className="h-5 w-5" />} />
        <StatCard label="Atrasadas" value={stats.overdue} tone={stats.overdue > 0 ? "danger" : "neutral"} icon={<AlertTriangle className="h-5 w-5" />} />
        <StatCard label="Concluidas" value={stats.completed} tone="success" icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard label="Em andamento" value={stats.inProgress} icon={<ListChecks className="h-5 w-5" />} />
        <StatCard label="Urgentes" value={stats.urgent} tone={stats.urgent > 0 ? "warning" : "neutral"} icon={<Flame className="h-5 w-5" />} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-semibold text-slate-950">Proximos prazos</h2>
            <span className="text-xs text-slate-500">7 dias</span>
          </div>
          <div className="mt-4 space-y-3">
            {upcomingTasks.length ? (
              upcomingTasks.map((task) => (
                <Link key={task.id} href={`/tasks/${task.id}`} className="grid gap-3 rounded-md border border-slate-100 p-3 hover:bg-slate-50 md:grid-cols-[1fr_auto]">
                  <div>
                    <p className="font-medium text-slate-950">{task.title}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {task.assignee.name} - {task.department.name} - vence {formatDate(task.dueDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <PriorityBadge priority={task.priority} />
                    <StatusBadge status={task.status} late={isTaskLate(task.status, task.dueDate)} />
                  </div>
                </Link>
              ))
            ) : (
              <EmptyState
                title="Sem prazos urgentes"
                description="Nao ha tarefas com vencimento nos proximos sete dias dentro do seu escopo."
              />
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">O que precisa de atencao</h2>
            <div className="mt-4 space-y-2">
              {attentionItems.length ? (
                attentionItems.map((item) => (
                  <div key={item} className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    {item}
                  </div>
                ))
              ) : (
                <p className="text-sm leading-6 text-slate-600">Nenhum alerta importante neste momento.</p>
              )}
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-950">
              <Target className="h-4 w-4" aria-hidden="true" />
              Metas
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <StatCard label="No caminho" value={stats.goalsOnTrack} tone="success" />
              <StatCard label="Atencao" value={stats.goalsAttention} tone={stats.goalsAttention > 0 ? "warning" : "neutral"} />
            </div>
          </div>
        </div>
      </section>

      {teamScope ? (
        access.canViewPerformance ? (
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-base font-semibold text-slate-950">Funcionarios com mais tarefas atrasadas</h2>
              <div className="mt-4 space-y-2">
                {employeeHotspots.length ? (
                  employeeHotspots.map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                      <span className="font-medium text-slate-700">{name}</span>
                      <span className="text-slate-500">{count} atraso{count === 1 ? "" : "s"}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-600">Nenhum funcionario com tarefas atrasadas.</p>
                )}
              </div>
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-base font-semibold text-slate-950">Setores com mais tarefas atrasadas</h2>
              <div className="mt-4 space-y-2">
                {departmentHotspots.length ? (
                  departmentHotspots.map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                      <span className="font-medium text-slate-700">{name}</span>
                      <span className="text-slate-500">{count} atraso{count === 1 ? "" : "s"}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-600">Nenhum setor com tarefas atrasadas.</p>
                )}
              </div>
            </div>
          </section>
        ) : (
          <section className="grid gap-4 lg:grid-cols-2">
            <LockedFeatureCard
              title="Desempenho por funcionario"
              description="O Plano Basico mostra tarefas e prazos. Ranking por funcionario entra a partir do Plano Gestao."
              requiredPlan="Gestao"
            />
            <LockedFeatureCard
              title="Desempenho por setor"
              description="A leitura de gargalos por setor faz parte do painel completo do gestor."
              requiredPlan="Gestao"
            />
          </section>
        )
      ) : null}

      <section className="grid gap-4 lg:grid-cols-3">
        {access.canUseAdvancedReports ? (
          premiumCards.map((card) => {
            const Icon = card.icon;

            return (
              <Link key={card.title} href={card.href} className="group rounded-md border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-700" aria-hidden="true" />
                </div>
                <h2 className="mt-4 text-base font-semibold text-slate-950">{card.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{card.description}</p>
                <p className="mt-4 text-sm font-semibold text-emerald-700">Abrir funcionalidade</p>
              </Link>
            );
          })
        ) : access.canUseBasicReports ? (
          <>
            <Link href={basicReportsCard.href} className="group rounded-md border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md">
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                  <BasicReportsIcon className="h-5 w-5" aria-hidden="true" />
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-700" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-slate-950">{basicReportsCard.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{basicReportsCard.description}</p>
              <p className="mt-4 text-sm font-semibold text-emerald-700">Abrir relatorios</p>
            </Link>
            <LockedFeatureCard
              title="Score operacional"
              description="O Plano Completo calcula saude operacional com base em atrasos, urgencias e metas."
              requiredPlan="Completo"
            />
            <LockedFeatureCard
              title="Alertas de risco"
              description="O Plano Completo destaca setores, responsaveis e metas que pedem acao."
              requiredPlan="Completo"
            />
          </>
        ) : (
          <>
            <LockedFeatureCard
              title="Relatorios basicos"
              description="Relatorios de tarefas, atrasos, setores e responsaveis entram a partir do Plano Gestao."
              requiredPlan="Gestao"
            />
            <LockedFeatureCard
              title="Score operacional"
              description="O Plano Completo calcula saude operacional com base em atrasos, urgencias e metas."
              requiredPlan="Completo"
            />
            <LockedFeatureCard
              title="Alertas de risco"
              description="O Plano Completo destaca setores, responsaveis e metas que pedem acao."
              requiredPlan="Completo"
            />
          </>
        )}
      </section>
    </div>
  );
}
