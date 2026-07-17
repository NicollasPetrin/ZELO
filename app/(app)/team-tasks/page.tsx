import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { DataTable, Td, Th } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { LockedFeatureCard } from "@/components/locked-feature-card";
import { OnboardingCard } from "@/components/onboarding-card";
import { PageHeader } from "@/components/page-header";
import { PriorityBadge } from "@/components/priority-badge";
import { StatusBadge } from "@/components/status-badge";
import { SubscriptionRequiredCard } from "@/components/subscription-required-card";
import { buttonClassName } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/fields";
import { getTaskFormOptions, listTeamTasks } from "@/features/tasks/data";
import { TaskForm } from "@/features/tasks/task-form";
import { requireTeamArea } from "@/lib/auth/guards";
import { formatDate, isTaskLate } from "@/lib/format";
import { priorityLabels, statusLabels } from "@/lib/labels";
import { isOnboardingCompleted } from "@/lib/onboarding";
import { getPlanAccess } from "@/lib/plans";
import { SearchParams, searchValue } from "@/lib/search";
import { getActivePlanCode } from "@/lib/subscription";
import { taskPriorities, taskStatuses } from "@/lib/validations";

export default async function TeamTasksPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireTeamArea();
  const activePlanCode = getActivePlanCode(user.company);

  if (!activePlanCode) {
    return <SubscriptionRequiredCard />;
  }

  const params = await searchParams;
  const status = searchValue(params, "status");
  const priority = searchValue(params, "priority");
  const departmentId = searchValue(params, "departmentId");
  const assigneeId = searchValue(params, "assigneeId");
  const query = searchValue(params, "q");
  const access = getPlanAccess(activePlanCode);
  const taskFilters = access.canUseAdvancedFilters
    ? { q: query, status, priority, departmentId, assigneeId }
    : { q: query, status };

  const [tasks, options, onboardingCompleted] = await Promise.all([
    listTeamTasks(user, taskFilters),
    getTaskFormOptions(user.companyId),
    isOnboardingCompleted(user, "team-tasks"),
  ]);
  const { departments, users } = options;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tarefas da Equipe"
        description={
          access.canUseAdvancedFilters
            ? "Crie, filtre por setor, responsavel, prioridade e acompanhe tarefas da empresa."
            : "Crie e acompanhe tarefas. Filtros avancados entram a partir do Plano Gestao."
        }
        actions={<a href="#nova-tarefa" className={buttonClassName("primary")}><Plus className="h-4 w-4" />Nova tarefa</a>}
      />

      <OnboardingCard
        stepKey="team-tasks"
        title="Crie tarefas com responsavel, prazo, prioridade e setor"
        description="Assim cada pessoa sabe exatamente o que precisa fazer e voce acompanha pendencias por responsavel, setor e prazo."
        completed={onboardingCompleted}
      />

      {!access.canUseAdvancedFilters ? (
        <LockedFeatureCard
          title="Filtros avancados de tarefas"
          description="Setor, responsavel e prioridade ficam bloqueados no Basico. O Plano Gestao libera a triagem operacional completa."
          requiredPlan="Gestao"
        />
      ) : null}

      <form className={`grid gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm ${access.canUseAdvancedFilters ? "xl:grid-cols-[1fr_160px_160px_180px_180px_auto]" : "md:grid-cols-[1fr_180px_auto]"}`}>
        <div className="space-y-1.5">
          <Label>Buscar</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <Input className="pl-9" name="q" placeholder="Titulo ou descricao" defaultValue={query ?? ""} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select name="status" defaultValue={status ?? ""}>
            <option value="">Todos</option>
            {taskStatuses.map((taskStatus) => (
              <option key={taskStatus} value={taskStatus}>
                {statusLabels[taskStatus]}
              </option>
            ))}
          </Select>
        </div>
        {access.canUseAdvancedFilters ? (
          <>
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Select name="priority" defaultValue={priority ?? ""}>
                <option value="">Todas</option>
                {taskPriorities.map((taskPriority) => (
                  <option key={taskPriority} value={taskPriority}>
                    {priorityLabels[taskPriority]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Setor</Label>
              <Select name="departmentId" defaultValue={departmentId ?? ""}>
                <option value="">Todos</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Responsavel</Label>
              <Select name="assigneeId" defaultValue={assigneeId ?? ""}>
                <option value="">Todos</option>
                {users.map((teamUser) => (
                  <option key={teamUser.id} value={teamUser.id}>
                    {teamUser.name}
                  </option>
                ))}
              </Select>
            </div>
          </>
        ) : null}
        <div className="flex items-end">
          <button className={buttonClassName("secondary")} type="submit">
            Filtrar
          </button>
        </div>
      </form>

      {tasks.length ? (
        <DataTable>
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <Th>Tarefa</Th>
                <Th>Responsavel</Th>
                <Th>Setor</Th>
                <Th>Prazo</Th>
                <Th>Prioridade</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {tasks.map((task) => (
                <tr key={task.id}>
                  <Td>
                    <Link href={`/tasks/${task.id}`} className="font-medium text-slate-950 hover:underline">
                      {task.title}
                    </Link>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{task.description}</p>
                  </Td>
                  <Td>{task.assignee.name}</Td>
                  <Td>{task.department.name}</Td>
                  <Td>{formatDate(task.dueDate)}</Td>
                  <Td><PriorityBadge priority={task.priority} /></Td>
                  <Td><StatusBadge status={task.status} late={isTaskLate(task.status, task.dueDate)} /></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTable>
      ) : (
        <EmptyState
          title="Voce ainda nao criou nenhuma tarefa"
          description="Comece criando a primeira tarefa da equipe para tirar as pendencias do WhatsApp e colocar tudo em um lugar visivel."
        />
      )}

      <section id="nova-tarefa" className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-950">Nova tarefa</h2>
        {!access.canUseRecurringTasks ? (
          <LockedFeatureCard
            title="Tarefas recorrentes"
            description="No Plano Basico as tarefas sao criadas uma a uma. Recorrencia diaria, semanal ou mensal entra no Plano Gestao."
            requiredPlan="Gestao"
          />
        ) : null}
        <TaskForm users={users} departments={departments} allowRecurrence={access.canUseRecurringTasks} />
      </section>
    </div>
  );
}
