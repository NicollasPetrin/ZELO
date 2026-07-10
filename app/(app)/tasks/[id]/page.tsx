import Link from "next/link";
import { CalendarDays, Paperclip, Repeat2, UserRound } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { LockedFeatureCard } from "@/components/locked-feature-card";
import { PageHeader } from "@/components/page-header";
import { PriorityBadge } from "@/components/priority-badge";
import { StatusBadge } from "@/components/status-badge";
import { SubscriptionRequiredCard } from "@/components/subscription-required-card";
import { buttonClassName } from "@/components/ui/button";
import { getTaskDetail, getTaskFormOptions } from "@/features/tasks/data";
import { TaskAttachmentForm, TaskCommentForm, TaskStatusForm } from "@/features/tasks/task-inline-forms";
import { TaskForm } from "@/features/tasks/task-form";
import { requireUser } from "@/lib/auth/session";
import { formatDate, formatDateTime, isTaskLate, toDateInputValue } from "@/lib/format";
import { recurrenceLabels } from "@/lib/labels";
import { getPlanAccess } from "@/lib/plans";
import { getActivePlanCode } from "@/lib/subscription";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const activePlanCode = getActivePlanCode(user.company);

  if (!activePlanCode) {
    return <SubscriptionRequiredCard />;
  }

  const { id } = await params;
  const { task, canManage } = await getTaskDetail(user, id);
  const access = getPlanAccess(activePlanCode);

  const { departments, users } = canManage ? await getTaskFormOptions(user.companyId) : { departments: [], users: [] };

  return (
    <div className="space-y-6">
      <PageHeader
        title={task.title}
        description={task.description}
        actions={<Link href={canManage ? "/team-tasks" : "/my-tasks"} className={buttonClassName("secondary")}>Voltar</Link>}
      />

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={task.status} late={isTaskLate(task.status, task.dueDate)} />
              <PriorityBadge priority={task.priority} />
            </div>

            <dl className="mt-5 grid gap-4 text-sm text-slate-600 md:grid-cols-2">
              <div className="flex gap-3">
                <UserRound className="mt-0.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                <div>
                  <dt className="text-xs font-medium uppercase tracking-normal text-slate-400">Responsavel</dt>
                  <dd>{task.assignee.name}</dd>
                </div>
              </div>
              <div className="flex gap-3">
                <CalendarDays className="mt-0.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                <div>
                  <dt className="text-xs font-medium uppercase tracking-normal text-slate-400">Prazo</dt>
                  <dd>{formatDate(task.dueDate)}</dd>
                </div>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-normal text-slate-400">Setor</dt>
                <dd>{task.department.name}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-normal text-slate-400">Criada por</dt>
                <dd>{task.creator.name}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-normal text-slate-400">Criada em</dt>
                <dd>{formatDateTime(task.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-normal text-slate-400">Atualizada em</dt>
                <dd>{formatDateTime(task.updatedAt)}</dd>
              </div>
            </dl>

            {task.recurrenceRule ? (
              <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                <div className="flex items-center gap-2 font-medium text-slate-950">
                  <Repeat2 className="h-4 w-4" aria-hidden="true" />
                  {recurrenceLabels[task.recurrenceRule.type]}
                </div>
                <p className="mt-1">
                  Inicio em {formatDate(task.recurrenceRule.startDate)}
                  {task.recurrenceRule.endDate ? `, termina em ${formatDate(task.recurrenceRule.endDate)}` : ", sem data final definida"}.
                </p>
              </div>
            ) : null}
          </article>

          <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">Comentarios</h2>
            <div className="mt-4 space-y-3">
              {task.comments.length ? (
                task.comments.map((comment) => (
                  <div key={comment.id} className="rounded-md bg-slate-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                      <span className="font-medium text-slate-700">{comment.author.name}</span>
                      <span>{formatDateTime(comment.createdAt)}</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{comment.text}</p>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="Sem comentarios"
                  description="Registre atualizacoes relevantes para manter o historico da tarefa organizado."
                />
              )}
            </div>
            <div className="mt-5 border-t border-slate-100 pt-4">
              <TaskCommentForm taskId={task.id} />
            </div>
          </article>

          <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">Anexos</h2>
            <div className="mt-4 space-y-2">
              {task.attachments.length ? (
                task.attachments.map((attachment) => (
                  <div key={attachment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4 text-slate-400" aria-hidden="true" />
                      <div>
                        <a href={attachment.fileUrl} className="font-medium text-slate-950 hover:underline" target="_blank" rel="noreferrer">
                          {attachment.fileName}
                        </a>
                        <p className="text-xs text-slate-500">
                          {attachment.fileType ?? "Arquivo"} - enviado por {attachment.author.name} em {formatDateTime(attachment.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-600">Nenhum anexo registrado.</p>
              )}
            </div>
            <div className="mt-5 border-t border-slate-100 pt-4">
              <TaskAttachmentForm taskId={task.id} />
            </div>
          </article>
        </div>

        <aside className="space-y-4">
          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-950">Atualizar andamento</h2>
            <div className="mt-4">
              <TaskStatusForm taskId={task.id} status={task.status} />
            </div>
          </div>

          {canManage ? (
            <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-base font-semibold text-slate-950">Editar tarefa</h2>
              <div className="mt-4">
                {!access.canUseRecurringTasks ? (
                  <div className="mb-4">
                    <LockedFeatureCard
                      title="Recorrencia bloqueada"
                      description="A edicao de tarefas recorrentes fica disponivel a partir do Plano Gestao."
                      requiredPlan="Gestao"
                    />
                  </div>
                ) : null}
                <TaskForm
                  users={users}
                  departments={departments}
                  allowRecurrence={access.canUseRecurringTasks}
                  initial={{
                    id: task.id,
                    title: task.title,
                    description: task.description,
                    assigneeId: task.assigneeId,
                    departmentId: task.departmentId,
                    dueDate: toDateInputValue(task.dueDate),
                    priority: task.priority,
                    status: task.status,
                    recurrenceType: task.recurrenceRule?.type ?? "NONE",
                    weekDays: task.recurrenceRule?.weekDays ?? "",
                    monthDay: task.recurrenceRule?.monthDay ?? "",
                    recurrenceStartDate: toDateInputValue(task.recurrenceRule?.startDate ?? task.dueDate),
                    recurrenceEndDate: toDateInputValue(task.recurrenceRule?.endDate),
                  }}
                />
              </div>
            </div>
          ) : null}
        </aside>
      </section>
    </div>
  );
}
