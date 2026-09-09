import type { TaskStatus } from "@prisma/client";

/**
 * Foto de celular comprimida cabe folgada em 8 MB. O limite existe porque o
 * arquivo passa pela aplicacao antes de chegar ao armazenamento, e um envio sem
 * teto prende o servidor.
 */
export const PROOF_MAX_BYTES = 8 * 1024 * 1024;

/**
 * Tipos aceitos, com a extensao usada no nome do objeto.
 *
 * A lista e fechada em imagem: prova de servico feito e foto. Aceitar qualquer
 * arquivo transformaria o campo em porta de entrada para conteudo executavel
 * dentro do armazenamento da empresa.
 */
export const PROOF_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

export const PROOF_ACCEPT = Object.keys(PROOF_TYPES).join(",");

export type ProofValidation = { ok: true; extension: string } | { ok: false; reason: string };

export function validateProofFile(file: { type: string; size: number }): ProofValidation {
  const extension = PROOF_TYPES[file.type.toLowerCase()];

  if (!extension) {
    return { ok: false, reason: "Envie uma foto (JPG, PNG, WEBP ou HEIC)." };
  }

  if (file.size <= 0) {
    return { ok: false, reason: "O arquivo chegou vazio. Tente enviar de novo." };
  }

  if (file.size > PROOF_MAX_BYTES) {
    const limite = Math.round(PROOF_MAX_BYTES / (1024 * 1024));

    return { ok: false, reason: `A foto passa de ${limite} MB. Reduza a qualidade e tente de novo.` };
  }

  return { ok: true, extension };
}

/**
 * Caminho do objeto no armazenamento.
 *
 * Comeca pela empresa para que uma regra de ciclo de vida ou uma exclusao possa
 * agir por empresa sem varrer o bucket inteiro, e termina no id da prova, que ja
 * e unico.
 */
export function buildProofKey(companyId: string, taskId: string, proofId: string, extension: string) {
  return `empresas/${companyId}/tarefas/${taskId}/${proofId}.${extension}`;
}

/**
 * Se a tarefa pode ser dada como concluida.
 *
 * A regra existe num lugar so porque ela e o proposito da funcionalidade: sem
 * isso, marcar "concluida" continuaria valendo como prova de que algo foi
 * feito, que e exatamente o que se quis corrigir.
 */
export function canComplete(task: { requiresProof: boolean }, proofCount: number) {
  return !task.requiresProof || proofCount > 0;
}

export const PROOF_REQUIRED_MESSAGE =
  "Esta tarefa exige foto de conclusao. Envie a prova para que ela possa ser aprovada.";

/**
 * Status que a tarefa assume quando uma prova e enviada.
 *
 * Enviar prova nao conclui: passa para revisao, e quem cobrou a tarefa aprova.
 * Concluir sozinho ao anexar a foto devolveria ao funcionario o poder de
 * declarar o proprio trabalho pronto, sem ninguem olhar.
 */
export function statusAfterProof(atual: TaskStatus): TaskStatus {
  if (atual === "COMPLETED" || atual === "CANCELED") {
    return atual;
  }

  return "IN_REVIEW";
}

/** Status de volta quando a prova e recusada. */
export function statusAfterRejection(): TaskStatus {
  return "IN_PROGRESS";
}
