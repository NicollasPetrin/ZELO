import { redirect } from "next/navigation";
import { Target, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { LockedFeatureCard } from "@/components/locked-feature-card";
import { OnboardingCard } from "@/components/onboarding-card";
import { PageHeader } from "@/components/page-header";
import { ProgressBar } from "@/components/progress-bar";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { deleteGoalAction } from "@/features/goals/actions";
import { listGoalsForUser } from "@/features/goals/data";
import { GoalForm } from "@/features/goals/goal-form";
import { listActiveDepartments } from "@/features/departments/data";
import { listActiveEmployees } from "@/features/employees/data";
import { requireUser } from "@/lib/auth/session";
import { formatDate, formatGoalValue, getGoalProgress, toDateInputValue } from "@/lib/format";
import { goalPeriodLabels, goalStatusLabels } from "@/lib/labels";
import { isOnboardingCompleted } from "@/lib/onboarding";
import { canManageGoals } from "@/lib/permissions";
import { getPlanAccess } from "@/lib/plans";

const goalStatusClasses = {
  ON_TRACK: "bg-emerald-100 text-emerald-800",
  ATTENTION: "bg-amber-100 text-amber-800",
  LATE: "bg-rose-100 text-rose-800",
  COMPLETED: "bg-sky-100 text-sky-800",
};

export default async function GoalsPage() {
  const user = await requireUser();
  const canManage = canManageGoals(user.role);
  const access = getPlanAccess(user.company.plan);

  const [departments, users, goals, onboardingCompleted] = await Promise.all([
    listActiveDepartments(user.companyId),
    listActiveEmployees(user.companyId),
    listGoalsForUser(user),
    isOnboardingCompleted(user.id, "goals"),
  ]);

  if (!canManage && !user.departmentId) {
    redirect("/my-tasks");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Metas"
        description="Acompanhe metas simples por empresa, setor ou responsavel, sempre com progresso claro."
      />

      <OnboardingCard
        stepKey="goals"
        title="Cadastre metas simples para acompanhar progresso"
        description="Use metas de vendas, tarefas no prazo, atendimentos ou qualquer indicador que ajude a equipe a saber se esta no caminho certo."
        completed={onboardingCompleted}
      />

      {canManage ? (
        <div className="space-y-3">
          {!access.canUseGoalAssignments ? (
            <LockedFeatureCard
              title="Metas por setor ou responsavel"
              description="No Plano Basico a meta e simples e vale para a empresa inteira. Setor e responsavel entram a partir do Plano Gestao."
              requiredPlan="Gestao"
            />
          ) : null}
          <GoalForm departments={departments} users={users} allowAssignments={access.canUseGoalAssignments} />
        </div>
      ) : null}

      {goals.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {goals.map((goal) => {
            const progress = getGoalProgress(goal.currentValue, goal.targetValue);

            return (
              <article key={goal.id} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-3">
                    <Target className="mt-1 h-5 w-5 text-slate-400" aria-hidden="true" />
                    <div>
                      <h2 className="font-semibold text-slate-950">{goal.title}</h2>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{goal.description ?? "Sem descricao cadastrada."}</p>
                    </div>
                  </div>
                  <Badge className={goalStatusClasses[goal.status]}>{goalStatusLabels[goal.status]}</Badge>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">
                      {formatGoalValue(goal.currentValue, goal.unit)} de {formatGoalValue(goal.targetValue, goal.unit)}
                    </span>
                    <span className="text-slate-500">{progress}%</span>
                  </div>
                  <ProgressBar value={progress} />
                </div>

                <dl className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-normal text-slate-400">Periodo</dt>
                    <dd>{goalPeriodLabels[goal.period]}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-normal text-slate-400">Prazo</dt>
                    <dd>{formatDate(goal.startDate)} ate {formatDate(goal.endDate)}</dd>
                  </div>
                  {access.canUseGoalAssignments ? (
                    <>
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-normal text-slate-400">Setor</dt>
                        <dd>{goal.department?.name ?? "Empresa inteira"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-normal text-slate-400">Responsavel</dt>
                        <dd>{goal.responsible?.name ?? "Sem responsavel direto"}</dd>
                      </div>
                    </>
                  ) : (
                    <div className="md:col-span-2">
                      <dt className="text-xs font-medium uppercase tracking-normal text-slate-400">Escopo</dt>
                      <dd>Empresa inteira - detalhamento por setor/responsavel bloqueado no Basico</dd>
                    </div>
                  )}
                </dl>

                {canManage ? (
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <details>
                      <summary className="text-sm font-medium text-slate-700">Editar meta</summary>
                      <div className="mt-3">
                        <GoalForm
                          departments={departments}
                          users={users}
                          allowAssignments={access.canUseGoalAssignments}
                          initial={{
                            id: goal.id,
                            title: goal.title,
                            description: goal.description ?? "",
                            targetValue: goal.targetValue,
                            currentValue: goal.currentValue,
                            unit: goal.unit,
                            period: goal.period,
                            status: goal.status,
                            departmentId: goal.departmentId ?? "",
                            responsibleId: goal.responsibleId ?? "",
                            startDate: toDateInputValue(goal.startDate),
                            endDate: toDateInputValue(goal.endDate),
                          }}
                        />
                      </div>
                    </details>
                    <form
                      action={async () => {
                        "use server";
                        await deleteGoalAction(goal.id);
                      }}
                      className="mt-3"
                    >
                      <button className={buttonClassName("ghost", "sm")} type="submit">
                        <Trash2 className="h-3.5 w-3.5" />
                        Excluir meta
                      </button>
                    </form>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="Voce ainda nao cadastrou metas"
          description="Crie uma meta simples para acompanhar se sua equipe esta no caminho certo."
        />
      )}
    </div>
  );
}
