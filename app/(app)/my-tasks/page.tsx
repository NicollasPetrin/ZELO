import Link from "next/link";
import { Search } from "lucide-react";
import { DataTable, Td, Th } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { OnboardingCard } from "@/components/onboarding-card";
import { PageHeader } from "@/components/page-header";
import { PriorityBadge } from "@/components/priority-badge";
import { StatusBadge } from "@/components/status-badge";
import { buttonClassName } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/fields";
import { listMyTasks } from "@/features/tasks/data";
import { TaskStatusForm } from "@/features/tasks/task-inline-forms";
import { requireUser } from "@/lib/auth/session";
import { formatDate, isTaskLate } from "@/lib/format";
import { priorityLabels, statusLabels } from "@/lib/labels";
import { isOnboardingCompleted } from "@/lib/onboarding";
import { SearchParams, searchValue } from "@/lib/search";
import { taskPriorities, taskStatuses } from "@/lib/validations";

export default async function MyTasksPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const status = searchValue(params, "status");
  const priority = searchValue(params, "priority");
  const query = searchValue(params, "q");
  const [tasks, onboardingCompleted] = await Promise.all([
    listMyTasks(user, { q: query, status, priority }),
    isOnboardingCompleted(user.id, "tasks"),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Minhas Tarefas"
        description="Veja suas responsabilidades, atualize o andamento e registre comentarios quando houver progresso."
      />

      <OnboardingCard
        stepKey="tasks"
        title="Crie tarefas com responsavel, prazo, prioridade e setor"
        description="Assim cada pessoa sabe exatamente o que precisa fazer e o gestor acompanha o andamento sem cobrancas soltas."
        completed={onboardingCompleted}
      />

      <form className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_180px_180px_auto]">
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
      ) : (
        <EmptyState
          title="Voce ainda nao tem tarefas"
          description="Quando uma tarefa for atribuida a voce, ela aparecera aqui com prazo, prioridade e status para acompanhamento."
        />
      )}
    </div>
  );
}
