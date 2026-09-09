import "server-only";
import { getStorageConfig } from "@/lib/env";
import { HASH_VAZIO, sha256Hex, signS3Request } from "@/lib/storage/signature";

const TIMEOUT_MS = 20_000;

export class StorageError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "StorageError";
    this.status = status;
  }
}

async function enviar(
  method: "GET" | "PUT" | "DELETE",
  objectKey: string,
  body?: { bytes: Buffer; contentType: string },
) {
  const config = getStorageConfig();

  const assinado = signS3Request({
    method,
    host: config.host,
    bucket: config.bucket,
    objectKey,
    region: config.region,
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    payloadHash: body ? sha256Hex(body.bytes) : HASH_VAZIO,
    contentType: body?.contentType,
    now: new Date(),
  });

  let resposta: Response;

  try {
    resposta = await fetch(assinado.url, {
      method,
      headers: assinado.headers,
      body: body ? new Uint8Array(body.bytes) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new StorageError(`O armazenamento nao respondeu em ${TIMEOUT_MS}ms.`, 504);
    }

    throw new StorageError("Nao foi possivel contatar o armazenamento.", 503);
  }

  if (!resposta.ok) {
    // O R2 responde erro em XML. Guardamos o texto inteiro na mensagem porque e
    // o unico lugar onde aparece a causa real (chave errada, bucket
    // inexistente, relogio fora de hora).
    const detalhe = (await resposta.text()).slice(0, 400);

    throw new StorageError(`Armazenamento respondeu ${resposta.status}: ${detalhe}`, resposta.status);
  }

  return resposta;
}

export async function putObject(objectKey: string, bytes: Buffer, contentType: string) {
  await enviar("PUT", objectKey, { bytes, contentType });
}

export async function getObject(objectKey: string) {
  const resposta = await enviar("GET", objectKey);

  return {
    body: resposta.body,
    contentType: resposta.headers.get("content-type") ?? "application/octet-stream",
    contentLength: resposta.headers.get("content-length"),
  };
}

export async function deleteObject(objectKey: string) {
  await enviar("DELETE", objectKey);
}

/**
 * Grava, le e apaga um objeto descartavel.
 *
 * Existe porque a assinatura so pode ser conferida de verdade contra o servico:
 * um teste de unidade prova que o algoritmo e estavel, nao que a credencial e o
 * bucket estao certos. Este caminho da a resposta em um clique, e a mensagem de
 * erro do R2 chega inteira a quem for corrigir.
 */
export async function testStorageRoundTrip() {
  const objectKey = `diagnostico/${Date.now()}.txt`;
  const conteudo = Buffer.from("zelo-diagnostico", "utf8");

  await putObject(objectKey, conteudo, "text/plain");

  const lido = await getObject(objectKey);
  const texto = lido.body ? await new Response(lido.body).text() : "";

  await deleteObject(objectKey);

  if (texto !== "zelo-diagnostico") {
    throw new StorageError("O arquivo foi gravado, mas voltou diferente na leitura.", 500);
  }

  return { objectKey };
}
