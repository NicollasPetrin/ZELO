import { randomUUID } from "node:crypto";

/**
 * Identificador gerado pela aplicacao.
 *
 * O banco ja gera id sozinho na maioria dos casos, mas as vezes o id precisa
 * existir antes da linha: a foto de prova, por exemplo, e gravada no
 * armazenamento com o id no nome do arquivo, e so depois vira registro.
 */
export function createId() {
  return randomUUID();
}
