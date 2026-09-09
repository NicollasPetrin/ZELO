import "server-only";
import { prisma } from "@/lib/db/client";
import { getAppUrl } from "@/lib/env";
import { buildTaskEvent, shouldRemoveFromCalendar } from "@/lib/google/event";
import { GoogleError, refreshAccessToken } from "@/lib/google/oauth";
import { decryptSecret, encryptSecret } from "@/lib/secret-box";
import { getSessionSecret } from "@/lib/env";

const API = "https://www.googleapis.com/calendar/v3";
const TIMEOUT_MS = 15_000;
/** Renova o token um pouco antes da hora, para nao esbarrar no limite. */
const FOLGA_MS = 60_000;

/**
 * Token valido da pessoa, renovando quando necessario.
 *
 * O access token vive uma hora; o refresh token e o que sustenta a ligacao ao
 * longo do tempo. Os dois ficam cifrados no banco e so existem em claro dentro
 * desta funcao.
 */
async function accessTokenDe(userId: string) {
  const conta = await prisma.googleCalendarAccount.findUnique({ where: { userId } });

  if (!conta) {
    return null;
  }

  const segredo = getSessionSecret();

  if (conta.expiresAt.getTime() - FOLGA_MS > Date.now()) {
    return { token: decryptSecret(conta.accessToken, segredo), calendarId: conta.calendarId };
  }

  const renovado = await refreshAccessToken(decryptSecret(conta.refreshToken, segredo));

  await prisma.googleCalendarAccount.update({
    where: { userId },
    data: {
      accessToken: encryptSecret(renovado.access_token, segredo),
      expiresAt: new Date(Date.now() + renovado.expires_in * 1000),
      // O Google so devolve refresh token novo se ele mudou.
      ...(renovado.refresh_token ? { refreshToken: encryptSecret(renovado.refresh_token, segredo) } : {}),
    },
  });

  return { token: renovado.access_token, calendarId: conta.calendarId };
}

async function chamar(token: string, caminho: string, init: { method: string; body?: unknown }) {
  let resposta: Response;

  try {
    resposta = await fetch(`${API}${caminho}`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    throw new GoogleError("Nao foi possivel falar com o Google Agenda.", 503);
  }

  if (!resposta.ok) {
    throw new GoogleError(
      `Google Agenda respondeu ${resposta.status}: ${(await resposta.text()).slice(0, 300)}`,
      resposta.status,
    );
  }

  return resposta.status === 204 ? null : ((await resposta.json()) as { id?: string });
}

/**
 * Poe a tarefa na agenda de quem vai executa-la, ou tira de la quando ela deixa
 * de fazer sentido.
 *
 * Chamada como efeito de quem cria, edita ou muda o status de uma tarefa, e
 * escrita para nunca derrubar essa operacao: agenda fora do ar nao pode impedir
 * alguem de registrar trabalho. Por isso quem chama usa syncTaskCalendarSafely.
 */
export async function syncTaskCalendar(taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      title: true,
      description: true,
      dueDate: true,
      priority: true,
      status: true,
      requiresProof: true,
      assigneeId: true,
      department: { select: { name: true } },
      creator: { select: { name: true } },
      calendarEvents: { select: { id: true, userId: true, googleEventId: true } },
    },
  });

  if (!task) {
    return { skipped: "tarefa inexistente" } as const;
  }

  const vinculoAtual = task.calendarEvents.find((evento) => evento.userId === task.assigneeId) ?? null;

  // Tarefa que trocou de responsavel deixa de existir na agenda de quem nao e
  // mais dono dela.
  for (const evento of task.calendarEvents) {
    if (evento.userId !== task.assigneeId) {
      await removerEvento(evento.userId, evento.googleEventId, evento.id);
    }
  }

  const conta = await accessTokenDe(task.assigneeId);

  if (!conta) {
    return { skipped: "responsavel sem agenda conectada" } as const;
  }

  if (shouldRemoveFromCalendar(task.status)) {
    if (vinculoAtual) {
      await removerEvento(task.assigneeId, vinculoAtual.googleEventId, vinculoAtual.id);
    }

    return { removed: true } as const;
  }

  const corpo = buildTaskEvent(
    {
      id: task.id,
      title: task.title,
      description: task.description,
      dueDate: task.dueDate,
      priority: task.priority,
      status: task.status,
      requiresProof: task.requiresProof,
      departmentName: task.department?.name ?? null,
      creatorName: task.creator?.name ?? null,
    },
    getAppUrl(),
  );

  const caminho = `/calendars/${encodeURIComponent(conta.calendarId)}/events`;

  if (vinculoAtual) {
    try {
      await chamar(conta.token, `${caminho}/${encodeURIComponent(vinculoAtual.googleEventId)}`, {
        method: "PATCH",
        body: corpo,
      });

      return { updated: true } as const;
    } catch (error) {
      // Compromisso apagado na mao pela propria pessoa: o vinculo local ficou
      // orfao, entao ele e descartado e um novo evento e criado abaixo.
      if (!(error instanceof GoogleError) || (error.status !== 404 && error.status !== 410)) {
        throw error;
      }

      await prisma.taskCalendarEvent.delete({ where: { id: vinculoAtual.id } }).catch(() => undefined);
    }
  }

  const criado = await chamar(conta.token, caminho, { method: "POST", body: corpo });

  if (criado?.id) {
    await prisma.taskCalendarEvent.upsert({
      where: { taskId_userId: { taskId: task.id, userId: task.assigneeId } },
      create: { taskId: task.id, userId: task.assigneeId, googleEventId: criado.id },
      update: { googleEventId: criado.id },
    });
  }

  return { created: true } as const;
}

async function removerEvento(userId: string, googleEventId: string, vinculoId: string) {
  const conta = await accessTokenDe(userId);

  if (conta) {
    try {
      await chamar(conta.token, `/calendars/${encodeURIComponent(conta.calendarId)}/events/${encodeURIComponent(googleEventId)}`, {
        method: "DELETE",
      });
    } catch (error) {
      // Ja nao existe la: o objetivo estava alcancado.
      if (!(error instanceof GoogleError) || (error.status !== 404 && error.status !== 410)) {
        throw error;
      }
    }
  }

  await prisma.taskCalendarEvent.delete({ where: { id: vinculoId } }).catch(() => undefined);
}

/**
 * Versao que engole a falha.
 *
 * A agenda e um espelho da tarefa, nao a fonte dela. Se o Google estiver fora
 * do ar ou a permissao tiver sido revogada, quem esta trabalhando precisa
 * continuar criando e concluindo tarefa do mesmo jeito — o erro fica no log,
 * para quem cuida do sistema.
 */
export async function syncTaskCalendarSafely(taskId: string) {
  try {
    await syncTaskCalendar(taskId);
  } catch (error) {
    console.error("[google-agenda] falha ao sincronizar tarefa", taskId, error);
  }
}
