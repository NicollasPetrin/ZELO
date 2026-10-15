import Link from "next/link";
import { Search } from "lucide-react";
import { DataTable, Td, Th } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { OnboardingCard } from "@/components/onboarding-card";
import { Pagination } from "@/components/pagination";
import { PageHeader } from "@/components/page-header";
import { PriorityBadge } from "@/components/priority-badge";
import { StatusBadge } from "@/components/status-badge";
import { SubscriptionRequiredCard } from "@/components/subscription-required-card";
import { buttonClassName } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/fields";
import { BOARD_COMPLETED_DAYS, listBoardTasks, listMyTasks } from "@/features/tasks/data";
import { TaskBoard } from "@/features/tasks/task-board";
import { TaskCardList } from "@/features/tasks/task-card-list";
import { TaskStatusForm } from "@/features/tasks/task-inline-forms";
import { parseTaskView, TaskViewSwitch } from "@/features/tasks/task-view-switch";
import { requireUser } from "@/lib/auth/session";
import { formatDate, isTaskLate } from "@/lib/format";
import { priorityLabels, statusLabels } from "@/lib/labels";
import { isOnboardingCompleted } from "@/lib/onboarding";
import { parsePage } from "@/lib/pagination";
import { SearchParams, searchValue } from "@/lib/search";
import { getActivePlanCode } from "@/lib/subscription";
import { taskPriorities, taskStatuses } from "@/lib/validations";

export default async function MyTasksPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  if (!getActivePlanCode(user.company)) {
    return <SubscriptionRequiredCard />;
  }

  const params = await searchParams;
  const status = searchValue(params, "status");
  const priority = searchValue(params, "priority");
  const query = searchValue(params, "q");
  const page = parsePage(searchValue(params, "page"));
  const view = parseTaskView(searchValue(params, "view"));
  const [taskPage, boardTasks, onboardingCompleted] = await Promise.all([
    view === "lista" ? listMyTasks(user, { q: query, status, priority }, page) : null,
    view === "quadro" ? listBoardTasks(user, "mine", { q: query, status, priority }) : null,
    isOnboardingCompleted(user, "tasks"),
  ]);
  const tasks = taskPage?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Minhas Tarefas"
        description="Veja suas responsabilidades, atualize o andamento e registre comentários quando houver progresso."
      />

      <OnboardingCard
        stepKey="tasks"
        title="Crie tarefas com responsável, prazo, prioridade e setor"
        description="Assim cada pessoa sabe exatamente o que precisa fazer e o gestor acompanha o andamento sem cobranças soltas."
        completed={onboardingCompleted}
      />

      <form className="grid grid-cols-2 gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_180px_180px_auto]">
        <div className="col-span-2 space-y-1.5 md:col-span-1">
          <Label>Buscar</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <Input className="pl-9" name="q" placeholder="Título ou descrição" defaultValue={query ?? ""} />
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
        {view === "quadro" ? <input type="hidden" name="view" value="quadro" /> : null}
        <div className="col-span-2 flex items-end md:col-span-1">
          <button className={buttonClassName("secondary")} type="submit">
            Filtrar
          </button>
        </div>
      </form>

      <TaskViewSwitch basePath="/my-tasks" params={params} view={view} />

      {boardTasks ? (
        <TaskBoard tasks={boardTasks} showAssignee={false} completedDays={BOARD_COMPLETED_DAYS} />
      ) : tasks.length ? (
        <>
          <TaskCardList tasks={tasks} renderFooter={(task) => <TaskStatusForm taskId={task.id} status={task.status} />} />
          <div className="hidden md:block">
            <DataTable>
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <Th>Tarefa</Th>
                    <Th>Setor</Th>
                    <Th>Prazo</Th>
                    <Th>Prioridade</Th>
                    <Th>Status</Th>
                    <Th>Atualizar</Th>
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
                      <Td>{task.department.name}</Td>
                      <Td>{formatDate(task.dueDate)}</Td>
                      <Td><PriorityBadge priority={task.priority} /></Td>
                      <Td><StatusBadge status={task.status} late={isTaskLate(task.status, task.dueDate)} /></Td>
                      <Td><TaskStatusForm taskId={task.id} status={task.status} /></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DataTable>
          </div>
        </>
      ) : (
        <EmptyState
          title="Você ainda não tem tarefas"
          description="Quando uma tarefa for atribuída a você, ela aparecerá aqui com prazo, prioridade e status para acompanhamento."
        />
      )}
      {taskPage ? <Pagination {...taskPage} searchParams={params} /> : null}
    </div>
  );
}
