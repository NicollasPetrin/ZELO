import Link from "next/link";
import { Bell, ChevronRight, Crosshair, Plus } from "lucide-react";
import { PriorityBadge } from "@/components/priority-badge";
import { ProgressBar } from "@/components/progress-bar";
import { SubscriptionRequiredCard } from "@/components/subscription-required-card";
import { buttonClassName } from "@/components/ui/button";
import { getHomeData } from "@/features/home/data";
import { getTaskFormOptions } from "@/features/tasks/data";
import { VoiceTaskDialog } from "@/features/tasks/voice-task-dialog";
import { requireUser } from "@/lib/auth/session";
import { messageDay, messageTime } from "@/lib/chat";
import { cn } from "@/lib/cn";
import { FUSO_OPERACAO } from "@/lib/due-date";
import { formatDate, formatDateTime } from "@/lib/format";
import { bucketTasks, focusReason, focusTask, greeting } from "@/lib/home";
import { canManageTasks } from "@/lib/permissions";
import { getActivePlanCode } from "@/lib/subscription";

type Tarefa = Awaited<ReturnType<typeof getHomeData>>["abertas"][number];

function quandoVence(tarefa: Tarefa, grupo: "late" | "today" | "week" | "later") {
  if (grupo === "today") {
    return `Hoje, ${messageTime(tarefa.dueDate)}`;
  }
  return grupo === "later" ? formatDate(tarefa.dueDate) : formatDateTime(tarefa.dueDate);
}

function Grupo({
  titulo,
  tarefas,
  grupo,
  vazio,
  aberto = true,
}: {
  titulo: string;
  tarefas: Tarefa[];
  grupo: "late" | "today" | "week" | "later";
  vazio: string;
  aberto?: boolean;
}) {
  return (
    <details open={aberto} className="group rounded-md border border-slate-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-950 [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-90" aria-hidden="true" />
        <span className={cn(grupo === "late" && tarefas.length > 0 && "text-rose-700")}>{titulo}</span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{tarefas.length}</span>
      </summary>
      {tarefas.length === 0 ? (
        <p className="border-t border-slate-100 px-4 py-3 text-sm text-slate-500">{vazio}</p>
      ) : (
        <ul className="divide-y divide-slate-100 border-t border-slate-100">
          {tarefas.map((tarefa) => (
            <li key={tarefa.id}>
              <Link href={`/tasks/${tarefa.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 hover:bg-slate-50">
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    tarefa.status === "IN_PROGRESS" ? "bg-sky-500" : tarefa.status === "IN_REVIEW" ? "bg-violet-500" : "bg-slate-300",
                  )}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate text-sm text-slate-900">{tarefa.title}</span>
                <span className="hidden text-xs text-slate-500 sm:inline">{tarefa.department.name}</span>
                <PriorityBadge priority={tarefa.priority} />
                <span className={cn("text-xs", grupo === "late" ? "font-semibold text-rose-700" : "text-slate-500")}>
                  {quandoVence(tarefa, grupo)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

export default async function InicioPage() {
  const user = await requireUser();

  if (!getActivePlanCode(user.company)) {
    return <SubscriptionRequiredCard />;
  }

  const podeCriar = canManageTasks(user.role);
  const agora = new Date();
  const [{ abertas, semana, notificacoes }, opcoes] = await Promise.all([
    getHomeData(user, agora),
    podeCriar ? getTaskFormOptions(user.companyId) : null,
  ]);
  const grupos = bucketTasks(abertas, agora);
  const foco = focusTask(abertas, agora);
  const primeiroNome = user.name.split(" ")[0];
  const data = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: FUSO_OPERACAO }).format(agora);
  const porcentagem = semana.total ? Math.round((semana.feitas / semana.total) * 100) : 0;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">
              {greeting(agora)}, {primeiroNome}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {data.charAt(0).toUpperCase() + data.slice(1)} · {abertas.length}{" "}
              {abertas.length === 1 ? "tarefa sua em aberto" : "tarefas suas em aberto"}
            </p>
          </div>
          {opcoes ? (
            <div className="flex flex-wrap gap-2">
              <VoiceTaskDialog
                variant="secondary"
                meId={user.id}
                people={opcoes.users.map((u) => ({ id: u.id, name: u.name, departmentId: u.departmentId }))}
                departments={opcoes.departments.map((d) => ({ id: d.id, name: d.name }))}
              />
              <Link href="/team-tasks#nova-tarefa" className={buttonClassName("primary")}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Nova tarefa
              </Link>
            </div>
          ) : null}
        </div>

        <section className="rounded-md border border-emerald-200 bg-emerald-50 p-4" aria-labelledby="foco-titulo">
          <h2 id="foco-titulo" className="flex items-center gap-2 text-xs font-semibold uppercase text-emerald-800">
            <Crosshair className="h-4 w-4" aria-hidden="true" />
            Foco do dia
          </h2>
          {foco ? (
            <>
              <p className="mt-2 text-lg font-semibold text-slate-950">{foco.title}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <span className={cn(grupos.late.includes(foco) ? "font-semibold text-rose-700" : "text-slate-700")}>
                  {focusReason(foco, agora)}
                </span>
                <PriorityBadge priority={foco.priority} />
                <span className="text-slate-600">{foco.department.name}</span>
              </div>
              <Link href={`/tasks/${foco.id}`} className={cn(buttonClassName("primary"), "mt-3")}>
                Abrir tarefa
              </Link>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-700">Nada pendente com você. Bom trabalho.</p>
          )}
        </section>

        <Grupo titulo="Atrasadas" tarefas={grupos.late} grupo="late" vazio="Nada atrasado." />
        <Grupo titulo="Hoje" tarefas={grupos.today} grupo="today" vazio="Nada para hoje." />
        <Grupo titulo="Próximos 7 dias" tarefas={grupos.week} grupo="week" vazio="Nada nos próximos dias." />
        <Grupo titulo="Mais adiante" tarefas={grupos.later} grupo="later" vazio="Nada mais adiante." aberto={false} />
      </div>

      <aside className="space-y-4">
        <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-950">Sua semana</h2>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {semana.feitas} <span className="text-sm font-normal text-slate-500">de {semana.total} concluídas</span>
          </p>
          <div className="mt-3">
            <ProgressBar value={porcentagem} />
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-950">Caixa de entrada</h2>
            <Link href="/notifications" className="text-xs font-medium text-emerald-700 hover:underline">
              Ver tudo
            </Link>
          </div>
          {notificacoes.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Nada novo por aqui.</p>
          ) : (
            <ul className="mt-2 divide-y divide-slate-100">
              {notificacoes.map((n) => (
                <li key={n.id} className="py-2">
                  <Link href={n.link || "/notifications"} className="flex gap-2 text-sm hover:underline">
                    <Bell className={cn("mt-0.5 h-4 w-4 shrink-0", n.isRead ? "text-slate-300" : "text-emerald-600")} aria-hidden="true" />
                    <span className="min-w-0">
                      <span className={cn("block", n.isRead ? "text-slate-600" : "font-medium text-slate-950")}>{n.title}</span>
                      <span className="line-clamp-2 block text-xs text-slate-500">{n.message}</span>
                      <span className="block text-[11px] text-slate-400">
                        {messageDay(n.createdAt)} {messageTime(n.createdAt)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}
