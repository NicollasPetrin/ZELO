import { describe, expect, it } from "vitest";
import { encodeObjectKey, HASH_VAZIO, sha256Hex, signS3Request } from "./signature";

const base = {
  host: "conta.r2.cloudflarestorage.com",
  bucket: "zelo-provas",
  objectKey: "empresa-1/tarefa-2/foto.jpg",
  region: "auto",
  accessKeyId: "CHAVE_DE_TESTE",
  secretAccessKey: "SEGREDO_DE_TESTE",
  now: new Date("2026-09-09T15:04:05.000Z"),
};

describe("encodeObjectKey", () => {
  it("keeps the slashes that separate folders", () => {
    expect(encodeObjectKey("a/b/c.jpg")).toBe("a/b/c.jpg");
  });

  it("encodes what would break the path", () => {
    expect(encodeObjectKey("empresa/foto do dia.jpg")).toBe("empresa/foto%20do%20dia.jpg");
    expect(encodeObjectKey("empresa/relatorio#1.jpg")).toBe("empresa/relatorio%231.jpg");
  });
});

describe("signS3Request", () => {
  it("builds the canonical request the way S3 expects it", () => {
    const assinado = signS3Request({ ...base, method: "GET", payloadHash: HASH_VAZIO });

    expect(assinado.canonicalRequest).toBe(
      [
        "GET",
        "/zelo-provas/empresa-1/tarefa-2/foto.jpg",
        "",
        "host:conta.r2.cloudflarestorage.com\nx-amz-content-sha256:" + HASH_VAZIO + "\nx-amz-date:20260909T150405Z\n",
        "host;x-amz-content-sha256;x-amz-date",
        HASH_VAZIO,
      ].join("\n"),
    );
  });

  it("puts the date and the scope in the string to sign", () => {
    const assinado = signS3Request({ ...base, method: "GET", payloadHash: HASH_VAZIO });
    const linhas = assinado.stringToSign.split("\n");

    expect(linhas[0]).toBe("AWS4-HMAC-SHA256");
    expect(linhas[1]).toBe("20260909T150405Z");
    expect(linhas[2]).toBe("20260909/auto/s3/aws4_request");
    expect(linhas[3]).toBe(sha256Hex(assinado.canonicalRequest));
  });

  it("signs the content type when there is a body, and lists it in the signed headers", () => {
    const assinado = signS3Request({
      ...base,
      method: "PUT",
      contentType: "image/jpeg",
      payloadHash: sha256Hex("conteudo"),
    });

    expect(assinado.headers["content-type"]).toBe("image/jpeg");
    expect(assinado.canonicalRequest).toContain("content-type;host;x-amz-content-sha256;x-amz-date");
    expect(assinado.headers.Authorization).toContain("SignedHeaders=content-type;host;x-amz-content-sha256;x-amz-date");
  });

  it("carries the credential with the scope, which is what the service checks first", () => {
    const assinado = signS3Request({ ...base, method: "GET", payloadHash: HASH_VAZIO });

    expect(assinado.headers.Authorization).toContain("Credential=CHAVE_DE_TESTE/20260909/auto/s3/aws4_request");
    expect(assinado.headers.Authorization).toMatch(/Signature=[0-9a-f]{64}$/);
  });

  it("gives a different signature for a different object, secret or moment", () => {
    const assinar = (mudanca: Partial<typeof base>) =>
      signS3Request({ ...base, method: "GET", payloadHash: HASH_VAZIO, ...mudanca }).headers.Authorization;

    const original = assinar({});

    expect(assinar({ objectKey: "outro.jpg" })).not.toBe(original);
    expect(assinar({ secretAccessKey: "OUTRO_SEGREDO" })).not.toBe(original);
    expect(assinar({ now: new Date("2026-09-10T15:04:05.000Z") })).not.toBe(original);
  });

  it("is deterministic for the same input, so a retry sends the same signature", () => {
    const a = signS3Request({ ...base, method: "GET", payloadHash: HASH_VAZIO });
    const b = signS3Request({ ...base, method: "GET", payloadHash: HASH_VAZIO });

    expect(a.headers.Authorization).toBe(b.headers.Authorization);
  });

  it("builds the url from host, bucket and key", () => {
    const assinado = signS3Request({ ...base, method: "PUT", payloadHash: HASH_VAZIO });

    expect(assinado.url).toBe("https://conta.r2.cloudflarestorage.com/zelo-provas/empresa-1/tarefa-2/foto.jpg");
  });
});
