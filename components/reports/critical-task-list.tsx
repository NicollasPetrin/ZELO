import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PriorityBadge } from "@/components/priority-badge";
import { StatusBadge } from "@/components/status-badge";
import type { CriticalTask } from "@/features/premium/report-types";
import { formatDate, isTaskLate } from "@/lib/format";

/**
 * A mesma lista aparecia como "Tarefas que pedem atencao" nos relatorios
 * basicos e como "Tarefas criticas" nos completos, com marcacao identica. O
 * titulo continua na pagina, que e onde ele difere.
 */
export function CriticalTaskList({ tasks }: { tasks: CriticalTask[] }) {
  if (!tasks.length) {
    return (
      <EmptyState
        title="Sem tarefas criticas"
        description="Nao ha tarefas atrasadas ou urgentes abertas neste momento."
      />
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <Link
          key={task.id}
          href={`/tasks/${task.id}`}
          className="grid gap-3 rounded-md border border-slate-100 p-3 hover:bg-slate-50 md:grid-cols-[1fr_auto]"
        >
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
      ))}
    </div>
  );
}
