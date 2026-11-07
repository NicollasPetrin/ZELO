import "server-only";
import type { TaskStatus } from "@prisma/client";
import { recordActivity } from "@/lib/audit";
import { prisma } from "@/lib/db/client";
import { brasiliaDay, dueDateAt } from "@/lib/due-date";
import { decidir, personaDoEmail, sorteio, type Decisao } from "@/lib/simulation";
import { isTaskLate } from "@/lib/task-status";
import { syncTaskCalendarSafely } from "@/features/calendar/sync";
import { advanceRecurringTaskSafely } from "@/features/tasks/recurrence";

/**
 * Motor da equipe ficticia.
 *
 * So roda em empresa de demonstracao (isDemo), e so para quem nao e dono: o
 * dono e a pessoa que esta testando. Cada rodada deixa poucas pessoas agirem,
 * para que a loja ande num ritmo que da para acompanhar na tela, e toda acao
 * passa pelos mesmos efeitos de quando alguem mexe na tarefa pela Zelo:
 * status, notificacao para quem criou, historico, agenda e a proxima
 * ocorrencia da rotina.
 */

const ABERTAS: TaskStatus[] = ["PENDING", "OVERDUE", "IN_PROGRESS"];
const ACOES_POR_RODADA = 3;
/** Tarefa criada ha menos que isto e "nova": quem recebeu pega antes das outras. */
const NOVA_MS = 60 * 60 * 1000;

export type AcaoSimulada = {
  pessoaId: string;
  pessoa: string;
  tipo: Decisao["tipo"];
  taskId: string;
  tarefa: string;
  comentario?: string;
};

function somarDia(dia: string, n: number) {
  const data = new Date(`${dia}T12:00:00Z`);
  data.setUTCDate(data.getUTCDate() + n);
  return data.toISOString().slice(0, 10);
}

export async function runSimulationTick(companyId: string, agora: Date = new Date()): Promise<AcaoSimulada[]> {
  const empresa = await prisma.company.findUnique({ where: { id: companyId }, select: { isDemo: true } });

  if (!empresa?.isDemo) {
    return [];
  }

  const pessoas = await prisma.user.findMany({
    where: { companyId, isActive: true, role: { not: "OWNER" } },
    select: { id: true, name: true, email: true },
  });

  if (pessoas.length === 0) {
    return [];
  }

  const tarefas = await prisma.task.findMany({
    where: { companyId, status: { in: ABERTAS }, assigneeId: { in: pessoas.map((p) => p.id) } },
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      dueDate: true,
      requiresProof: true,
      assigneeId: true,
      creatorId: true,
      recurrenceRule: { select: { id: true } },
      _count: { select: { proofs: true } },
      comments: { select: { authorId: true, createdAt: true } },
    },
  });

  const hoje = brasiliaDay(agora);
  const amanha = somarDia(hoje, 1);
  const nova = (t: (typeof tarefas)[number]) => !t.recurrenceRule && agora.getTime() - t.createdAt.getTime() < NOVA_MS;
  const cobrada = (t: (typeof tarefas)[number]) => {
    const deOutros = t.comments.filter((c) => c.authorId !== t.assigneeId).map((c) => c.createdAt.getTime());
    const meus = t.comments.filter((c) => c.authorId === t.assigneeId).map((c) => c.createdAt.getTime());
    return deOutros.length > 0 && Math.max(...deOutros) > (meus.length ? Math.max(...meus) : 0);
  };
  // Ninguem adianta a rotina de amanha: a recorrente so entra no dia dela. A
  // tarefa avulsa entra ate um dia antes, ou na hora, se acabou de chegar.
  const elegivel = (t: (typeof tarefas)[number]) => {
    const dia = brasiliaDay(t.dueDate);
    return dia <= hoje || cobrada(t) || (!t.recurrenceRule && (dia <= amanha || nova(t)));
  };
  const ordem = (t: (typeof tarefas)[number]) =>
    (nova(t) ? 0 : cobrada(t) ? 1 : isTaskLate(t, agora) ? 2 : 3) * 1e13 + t.dueDate.getTime() / 1e3;

  const porPessoa = new Map<string, typeof tarefas>();
  for (const t of tarefas) {
    porPessoa.set(t.assigneeId, [...(porPessoa.get(t.assigneeId) ?? []), t]);
  }

  // Quem tem tarefa nova ou cobranca vai na frente; o resto roda numa ordem
  // que muda a cada rodada, para a loja nao ter sempre os mesmos tres agindo.
  const rodada = Math.floor(agora.getTime() / 10000);
  const fila = [...pessoas].sort((a, b) => {
    const urgente = (id: string) => ((porPessoa.get(id) ?? []).some((t) => nova(t) || cobrada(t)) ? 0 : 1);
    return urgente(a.id) - urgente(b.id) || sorteio(`${a.id}:${rodada}`) - sorteio(`${b.id}:${rodada}`);
  });

  const feitas: AcaoSimulada[] = [];

  for (const pessoa of fila) {
    if (feitas.length >= ACOES_POR_RODADA) break;

    const minhas = porPessoa.get(pessoa.id) ?? [];
    const persona = personaDoEmail(pessoa.email);
    const candidatas = minhas.filter(elegivel).sort((a, b) => ordem(a) - ordem(b));

    for (const t of candidatas) {
      const decisao = decidir(
        persona,
        { id: t.id, status: t.status, createdAt: t.createdAt, updatedAt: t.updatedAt, requiresProof: t.requiresProof, provas: t._count.proofs },
        t.comments,
        pessoa.id,
        agora,
        minhas.length,
      );

      if (!decisao) continue;

      const aplicou = await aplicar(companyId, pessoa, t, decisao, agora);
      if (aplicou) {
        feitas.push({ pessoaId: pessoa.id, pessoa: pessoa.name, tipo: decisao.tipo, taskId: t.id, tarefa: t.title, comentario: decisao.comentario });
      }
      break;
    }
  }

  return feitas;
}

async function comentar(companyId: string, pessoa: { id: string; name: string }, t: { id: string; title: string; creatorId: string }, texto: string) {
  await prisma.taskComment.create({ data: { taskId: t.id, authorId: pessoa.id, text: texto } });

  if (t.creatorId !== pessoa.id) {
    await prisma.notification.create({
      data: {
        companyId,
        userId: t.creatorId,
        type: "NEW_COMMENT",
        title: "Novo comentário",
        message: `${pessoa.name} comentou em "${t.title}".`,
        link: `/tasks/${t.id}`,
        relatedTaskId: t.id,
      },
    });
  }

  await recordActivity({
    companyId,
    actorId: pessoa.id,
    type: "TASK_COMMENTED",
    entityType: "Task",
    entityId: t.id,
    title: "Comentário em tarefa",
    description: t.title,
    metadata: { simulacao: true },
  });
}

async function aplicar(
  companyId: string,
  pessoa: { id: string; name: string },
  t: { id: string; title: string; status: TaskStatus; creatorId: string },
  decisao: Decisao,
  agora: Date,
) {
  if (decisao.tipo === "comentar") {
    await comentar(companyId, pessoa, t, decisao.comentario);
    return true;
  }

  const novo: TaskStatus = decisao.tipo === "concluir" ? "COMPLETED" : "IN_PROGRESS";

  // So muda se ninguem mexeu na tarefa desde a leitura: duas abas abertas na
  // loja nao podem concluir a mesma rotina duas vezes.
  const mudou = await prisma.task.updateMany({
    where: { id: t.id, companyId, status: t.status },
    data: { status: novo, completedAt: novo === "COMPLETED" ? agora : null },
  });

  if (mudou.count === 0) {
    return false;
  }

  if (decisao.comentario) {
    await comentar(companyId, pessoa, t, decisao.comentario);
  }

  if (novo === "COMPLETED") {
    await advanceRecurringTaskSafely(t.id, { id: pessoa.id, companyId });
  }

  if (t.creatorId !== pessoa.id) {
    await prisma.notification.create({
      data: {
        companyId,
        userId: t.creatorId,
        type: "STATUS_UPDATED",
        title: "Status atualizado",
        message: `${pessoa.name} atualizou "${t.title}".`,
        link: `/tasks/${t.id}`,
        relatedTaskId: t.id,
      },
    });
  }

  await recordActivity({
    companyId,
    actorId: pessoa.id,
    type: "TASK_UPDATED",
    entityType: "Task",
    entityId: t.id,
    title: "Status da tarefa atualizado",
    description: t.title,
    metadata: { status: novo, simulacao: true },
  });

  await syncTaskCalendarSafely(t.id);
  return true;
}

/* ------------------------------------------------------------------ */
/* O que a tela da loja mostra                                         */
/* ------------------------------------------------------------------ */

export type TarefaDaLoja = {
  id: string;
  titulo: string;
  status: TaskStatus;
  prazo: string;
  atrasada: boolean;
  hoje: boolean;
};

export type PessoaDaLoja = {
  id: string;
  chave: string;
  nome: string;
  papel: string;
  cargo: string | null;
  setor: string | null;
  abertas: number;
  atrasadas: number;
  hoje: number;
  fazendo: string | null;
  feitasHoje: number;
  tarefas: TarefaDaLoja[];
};

export type EventoDaLoja = {
  id: string;
  quando: string;
  pessoaId: string | null;
  quem: string;
  tipo: "concluiu" | "comecou" | "criou" | "renovou" | "comentou" | "reabriu" | "atualizou";
  tarefa: string;
  taskId: string | null;
  texto?: string;
};

export type Loja = {
  agora: string;
  pessoas: PessoaDaLoja[];
  eventos: EventoDaLoja[];
};

function lerStatus(metadata: string | null): string | null {
  if (!metadata) return null;
  try {
    const valor = JSON.parse(metadata) as { status?: unknown };
    return typeof valor.status === "string" ? valor.status : null;
  } catch {
    return null;
  }
}

export async function getLiveStore(companyId: string, agora: Date = new Date()): Promise<Loja> {
  const hoje = brasiliaDay(agora);
  const inicioDoDia = dueDateAt(hoje, "00:00") ?? agora;

  const [pessoas, tarefas, logs, comentarios] = await Promise.all([
    prisma.user.findMany({
      where: { companyId, isActive: true },
      select: { id: true, name: true, email: true, role: true, position: true, department: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.task.findMany({
      where: {
        companyId,
        OR: [{ status: { in: ABERTAS } }, { status: "IN_REVIEW" }, { status: "COMPLETED", completedAt: { gte: inicioDoDia } }],
      },
      select: { id: true, title: true, status: true, dueDate: true, assigneeId: true, updatedAt: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.activityLog.findMany({
      where: { companyId, entityType: "Task", type: { in: ["TASK_CREATED", "TASK_UPDATED"] } },
      select: { id: true, createdAt: true, actorId: true, type: true, title: true, description: true, entityId: true, metadata: true, actor: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.taskComment.findMany({
      where: { task: { companyId } },
      select: { id: true, createdAt: true, text: true, authorId: true, author: { select: { name: true } }, task: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  const lista: PessoaDaLoja[] = pessoas.map((p) => {
    const minhas = tarefas.filter((t) => t.assigneeId === p.id);
    const abertas = minhas.filter((t) => t.status !== "COMPLETED");
    const fazendo = abertas
      .filter((t) => t.status === "IN_PROGRESS")
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];

    return {
      id: p.id,
      chave: p.email.split("@")[0]?.toLowerCase() ?? "",
      nome: p.name,
      papel: p.role,
      cargo: p.position,
      setor: p.department?.name ?? null,
      abertas: abertas.length,
      atrasadas: abertas.filter((t) => isTaskLate(t, agora)).length,
      hoje: abertas.filter((t) => !isTaskLate(t, agora) && brasiliaDay(t.dueDate) === hoje).length,
      fazendo: fazendo?.title ?? null,
      feitasHoje: minhas.length - abertas.length,
      tarefas: minhas.slice(0, 40).map((t) => ({
        id: t.id,
        titulo: t.title,
        status: t.status,
        prazo: t.dueDate.toISOString(),
        atrasada: isTaskLate(t, agora),
        hoje: brasiliaDay(t.dueDate) === hoje,
      })),
    };
  });

  const eventos: EventoDaLoja[] = [
    ...logs.map((l): EventoDaLoja => {
      const status = lerStatus(l.metadata);
      const tipo: EventoDaLoja["tipo"] =
        l.type === "TASK_CREATED"
          ? l.title.startsWith("Próxima ocorrência")
            ? "renovou"
            : "criou"
          : status === "COMPLETED"
            ? "concluiu"
            : status === "IN_PROGRESS"
              ? "comecou"
              : status === "PENDING"
                ? "reabriu"
                : "atualizou";
      return {
        id: `log-${l.id}`,
        quando: l.createdAt.toISOString(),
        pessoaId: l.actorId,
        quem: l.actor?.name ?? "Alguém",
        tipo,
        tarefa: l.description ?? "",
        taskId: l.entityId,
      };
    }),
    ...comentarios.map(
      (c): EventoDaLoja => ({
        id: `com-${c.id}`,
        quando: c.createdAt.toISOString(),
        pessoaId: c.authorId,
        quem: c.author.name,
        tipo: "comentou",
        tarefa: c.task.title,
        taskId: c.task.id,
        texto: c.text,
      }),
    ),
  ].sort((a, b) => b.quando.localeCompare(a.quando));

  // "Concluiu" e o comentario que veio junto viram uma linha so no feed.
  const juntos: EventoDaLoja[] = [];
  for (const e of eventos) {
    if (e.tipo === "comentou") {
      const par = juntos.find(
        (x) =>
          (x.tipo === "concluiu" || x.tipo === "comecou") &&
          !x.texto &&
          x.pessoaId === e.pessoaId &&
          x.taskId === e.taskId &&
          Math.abs(new Date(x.quando).getTime() - new Date(e.quando).getTime()) < 3000,
      );
      if (par) {
        par.texto = e.texto;
        continue;
      }
    }
    juntos.push(e);
  }

  return { agora: agora.toISOString(), pessoas: lista, eventos: juntos.slice(0, 30) };
}
