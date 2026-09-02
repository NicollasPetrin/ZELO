import type { TaskPriority } from "@prisma/client";

/**
 * Peso de cada prioridade na pontuacao.
 *
 * A distancia entre os niveis cresce de proposito: uma urgente vale mais que
 * tres baixas, entao acumular tarefa simples nao supera quem resolve o que
 * trava a operacao.
 */
export const POINTS_BY_PRIORITY: Record<TaskPriority, number> = {
  LOW: 1,
  MEDIUM: 3,
  HIGH: 5,
  URGENT: 8,
};

/** Ordem de exibicao, da mais leve para a mais pesada. */
export const priorityOrder: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export type PriorityCount = Record<TaskPriority, number>;

export function emptyPriorityCount(): PriorityCount {
  return { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 };
}

export function pointsFor(priority: TaskPriority, quantidade = 1) {
  return POINTS_BY_PRIORITY[priority] * quantidade;
}

/** Total de pontos a partir da contagem de tarefas concluidas por prioridade. */
export function totalPoints(counts: PriorityCount) {
  return priorityOrder.reduce((soma, prioridade) => soma + pointsFor(prioridade, counts[prioridade]), 0);
}

export function totalTasks(counts: PriorityCount) {
  return priorityOrder.reduce((soma, prioridade) => soma + counts[prioridade], 0);
}

export type ScoredMember<T> = T & {
  counts: PriorityCount;
  points: number;
  tasks: number;
  position: number;
};

/**
 * Ordena por pontos e atribui posicao, dando a mesma colocacao a quem empata.
 *
 * Sem tratar empate, duas pessoas com o mesmo total apareceriam como 1o e 2o
 * por acaso da ordenacao, o que numa tela que a equipe inteira ve nao passa
 * despercebido.
 */
export function rankMembers<T>(membros: Array<T & { counts: PriorityCount }>): Array<ScoredMember<T>> {
  const comPontos = membros.map((membro) => ({
    ...membro,
    points: totalPoints(membro.counts),
    tasks: totalTasks(membro.counts),
  }));

  comPontos.sort((a, b) => b.points - a.points || b.tasks - a.tasks);

  let posicao = 0;
  let anterior: number | null = null;

  return comPontos.map((membro, indice) => {
    if (anterior === null || membro.points !== anterior) {
      posicao = indice + 1;
      anterior = membro.points;
    }

    return { ...membro, position: posicao };
  });
}
