import type { TaskPriority, TaskStatus } from "@prisma/client";
import { priorityLabels, statusLabels } from "@/lib/labels";

export const CALENDAR_TIME_ZONE = "America/Sao_Paulo";

/** Quanto tempo o compromisso ocupa na agenda, terminando no prazo. */
const DURACAO_MINUTOS = 30;

/**
 * Instante convertido em hora de parede de Brasilia, no formato que o Google
 * espera junto do campo timeZone.
 *
 * O prazo e guardado como instante; a agenda precisa do horario como a pessoa
 * le. Mandar o instante em UTC com timeZone de Sao Paulo faria o Google somar o
 * fuso duas vezes e o compromisso apareceria tres horas fora do lugar.
 */
export function wallTime(date: Date, timeZone = CALENDAR_TIME_ZONE) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const pegar = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "00";
  // O Intl devolve 24 para a meia-noite em algumas plataformas.
  const hora = pegar("hour") === "24" ? "00" : pegar("hour");

  return `${pegar("year")}-${pegar("month")}-${pegar("day")}T${hora}:${pegar("minute")}:${pegar("second")}`;
}

export type TaskForCalendar = {
  id: string;
  title: string;
  description: string;
  dueDate: Date;
  priority: TaskPriority;
  status: TaskStatus;
  requiresProof: boolean;
  departmentName: string | null;
  creatorName: string | null;
};

export type GoogleEventBody = {
  summary: string;
  description: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  reminders: { useDefault: false; overrides: Array<{ method: "popup"; minutes: number }> };
  source?: { title: string; url: string };
};

/**
 * Traduz a tarefa no compromisso que aparece na agenda do funcionario.
 *
 * A prioridade vai no titulo porque e o unico texto que a pessoa ve na grade da
 * semana; o resto — setor, quem pediu, se exige foto — vai na descricao, junto
 * do link que traz de volta para a tarefa. Uma agenda que so diz "Tarefa" nao
 * ajuda ninguem a decidir o que fazer primeiro.
 */
export function buildTaskEvent(task: TaskForCalendar, appUrl?: string): GoogleEventBody {
  const fim = task.dueDate;
  const inicio = new Date(fim.getTime() - DURACAO_MINUTOS * 60 * 1000);

  const linhas = [
    task.description,
    "",
    `Prioridade: ${priorityLabels[task.priority]}`,
    `Status: ${statusLabels[task.status]}`,
    ...(task.departmentName ? [`Setor: ${task.departmentName}`] : []),
    ...(task.creatorName ? [`Solicitado por: ${task.creatorName}`] : []),
    ...(task.requiresProof ? ["Exige foto de conclusao."] : []),
  ];

  if (appUrl) {
    linhas.push("", `Abrir na Zelo: ${appUrl}/tasks/${task.id}`);
  }

  return {
    summary: `[${priorityLabels[task.priority]}] ${task.title}`,
    description: linhas.join("\n"),
    start: { dateTime: wallTime(inicio), timeZone: CALENDAR_TIME_ZONE },
    end: { dateTime: wallTime(fim), timeZone: CALENDAR_TIME_ZONE },
    // Um aviso na vespera para dar tempo de organizar, e outro uma hora antes
    // para nao esquecer no dia.
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 24 * 60 },
        { method: "popup", minutes: 60 },
      ],
    },
    ...(appUrl ? { source: { title: "Zelo", url: `${appUrl}/tasks/${task.id}` } } : {}),
  };
}

/**
 * Tarefa concluida ou cancelada sai da agenda.
 *
 * Deixar o compromisso de algo ja resolvido faz a agenda mentir sobre o dia da
 * pessoa, e e o tipo de ruido que leva alguem a desligar a integracao.
 */
export function shouldRemoveFromCalendar(status: TaskStatus) {
  return status === "COMPLETED" || status === "CANCELED";
}
