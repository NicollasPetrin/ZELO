import { createHash, createHmac } from "node:crypto";

/**
 * Assinatura AWS SigV4 para a API S3 do Cloudflare R2.
 *
 * Escrita a mao em vez de trazer o SDK da AWS: o projeto inteiro tem nove
 * dependencias, e o SDK pesa mais que todas juntas para fazer tres chamadas
 * (guardar, ler e apagar um arquivo). O algoritmo e publico e cabe aqui.
 *
 * A funcao e pura e recebe o instante por parametro: assinatura que depende do
 * relogio nao teria como ser testada.
 */

const ALGORITMO = "AWS4-HMAC-SHA256";
const SERVICO = "s3";

export function sha256Hex(data: string | Buffer) {
  return createHash("sha256").update(data).digest("hex");
}

function hmac(key: Buffer | string, data: string) {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

/** Hash do corpo vazio, exigido no header de toda requisicao sem corpo. */
export const HASH_VAZIO = sha256Hex("");

/**
 * Cada segmento do caminho e codificado, mas as barras continuam separando
 * segmentos: codificar a barra faria o S3 procurar um objeto cujo nome contem
 * "%2F", que e outro objeto.
 */
export function encodeObjectKey(key: string) {
  return key
    .split("/")
    .map((segmento) => encodeURIComponent(segmento))
    .join("/");
}

function amzDate(now: Date) {
  const iso = now.toISOString().replace(/[:-]|\.\d{3}/g, "");

  return { longa: iso, curta: iso.slice(0, 8) };
}

export type S3SignInput = {
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  /** Host do endpoint, sem esquema. Ex.: abc123.r2.cloudflarestorage.com */
  host: string;
  bucket: string;
  objectKey: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Hash hex do corpo. Use HASH_VAZIO quando nao ha corpo. */
  payloadHash: string;
  contentType?: string;
  now: Date;
};

export type SignedS3Request = {
  url: string;
  headers: Record<string, string>;
  /** Exposto para teste: e aqui que erro de assinatura costuma nascer. */
  canonicalRequest: string;
  stringToSign: string;
};

export function signS3Request(input: S3SignInput): SignedS3Request {
  const { longa, curta } = amzDate(input.now);
  const caminho = `/${input.bucket}/${encodeObjectKey(input.objectKey)}`;

  const headers: Record<string, string> = {
    host: input.host,
    "x-amz-content-sha256": input.payloadHash,
    "x-amz-date": longa,
  };

  if (input.contentType) {
    headers["content-type"] = input.contentType;
  }

  const nomesOrdenados = Object.keys(headers).sort();
  const canonicalHeaders = nomesOrdenados.map((nome) => `${nome}:${headers[nome].trim()}\n`).join("");
  const signedHeaders = nomesOrdenados.join(";");

  const canonicalRequest = [
    input.method,
    caminho,
    "",
    canonicalHeaders,
    signedHeaders,
    input.payloadHash,
  ].join("\n");

  const escopo = `${curta}/${input.region}/${SERVICO}/aws4_request`;
  const stringToSign = [ALGORITMO, longa, escopo, sha256Hex(canonicalRequest)].join("\n");

  const chaveData = hmac(`AWS4${input.secretAccessKey}`, curta);
  const chaveRegiao = hmac(chaveData, input.region);
  const chaveServico = hmac(chaveRegiao, SERVICO);
  const chaveAssinatura = hmac(chaveServico, "aws4_request");
  const assinatura = createHmac("sha256", chaveAssinatura).update(stringToSign, "utf8").digest("hex");

  return {
    url: `https://${input.host}${caminho}`,
    headers: {
      ...headers,
      Authorization: `${ALGORITMO} Credential=${input.accessKeyId}/${escopo}, SignedHeaders=${signedHeaders}, Signature=${assinatura}`,
    },
    canonicalRequest,
    stringToSign,
  };
}
