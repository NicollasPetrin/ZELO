import Link from "next/link";
import type { ReactNode } from "react";
import type { TaskPriority, TaskStatus } from "@prisma/client";
import { PriorityBadge } from "@/components/priority-badge";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, isTaskLate } from "@/lib/format";

type TaskCardItem = {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date;
  priority: TaskPriority;
  status: TaskStatus;
  department: { name: string };
  assignee?: { name: string };
};

// No celular a tabela escondia prazo, prioridade e status atras de rolagem lateral.
// Abaixo de md cada tarefa vira um card com tudo visivel; a tabela segue nas telas maiores.
export function TaskCardList<T extends TaskCardItem>({
  tasks,
  renderFooter,
}: {
  tasks: T[];
  renderFooter?: (task: T) => ReactNode;
}) {
  return (
    <ul className="space-y-3 md:hidden">
      {tasks.map((task) => (
        <li key={task.id} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <Link href={`/tasks/${task.id}`} className="min-w-0 font-medium text-slate-950 hover:underline">
              {task.title}
            </Link>
            <div className="shrink-0">
              <StatusBadge status={task.status} late={isTaskLate(task.status, task.dueDate)} />
            </div>
          </div>
          {task.description ? (
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{task.description}</p>
          ) : null}
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {task.assignee ? (
              <div className="min-w-0">
                <dt className="text-xs text-slate-500">Responsavel</dt>
                <dd className="truncate text-slate-700">{task.assignee.name}</dd>
              </div>
            ) : null}
            <div className="min-w-0">
              <dt className="text-xs text-slate-500">Setor</dt>
              <dd className="truncate text-slate-700">{task.department.name}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs text-slate-500">Prazo</dt>
              <dd className="text-slate-700">{formatDate(task.dueDate)}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs text-slate-500">Prioridade</dt>
              <dd className="mt-0.5"><PriorityBadge priority={task.priority} /></dd>
            </div>
          </dl>
          {renderFooter ? <div className="mt-3 border-t border-slate-100 pt-3">{renderFooter(task)}</div> : null}
        </li>
      ))}
    </ul>
  );
}
