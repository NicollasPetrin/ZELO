import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Cofre para segredos de terceiros guardados no banco.
 *
 * O refresh token do Google nao expira e da acesso continuo a agenda de uma
 * pessoa. Guardado em texto puro, qualquer copia do banco — um backup, um dump
 * de suporte, uma consulta de leitura — vira um molho de chaves das agendas de
 * todos os clientes. Guardado assim, uma copia do banco sozinha nao abre nada:
 * a chave mora na variavel de ambiente.
 *
 * AES-256-GCM porque ele autentica junto: texto adulterado falha na abertura em
 * vez de devolver lixo silenciosamente.
 */

const ALGORITMO = "aes-256-gcm";
const TAMANHO_IV = 12;
const VERSAO = "v1";

/**
 * A chave de 32 bytes vem do hash do segredo da aplicacao. Derivar em vez de
 * exigir mais uma variavel evita o cenario em que alguem gera uma chave curta
 * demais na pressa do deploy.
 */
function chaveDe(segredo: string) {
  return createHash("sha256").update(segredo).digest();
}

export function encryptSecret(texto: string, segredo: string) {
  const iv = randomBytes(TAMANHO_IV);
  const cipher = createCipheriv(ALGORITMO, chaveDe(segredo), iv);
  const cifrado = Buffer.concat([cipher.update(texto, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [VERSAO, iv.toString("base64url"), tag.toString("base64url"), cifrado.toString("base64url")].join(".");
}

export function decryptSecret(guardado: string, segredo: string) {
  const partes = guardado.split(".");

  if (partes.length !== 4 || partes[0] !== VERSAO) {
    throw new Error("Segredo guardado em formato desconhecido.");
  }

  const [, iv, tag, cifrado] = partes;
  const decipher = createDecipheriv(ALGORITMO, chaveDe(segredo), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));

  return Buffer.concat([decipher.update(Buffer.from(cifrado, "base64url")), decipher.final()]).toString("utf8");
}
