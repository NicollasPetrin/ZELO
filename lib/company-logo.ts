/**
 * Logo da empresa.
 *
 * So imagem de bitmap: PNG, JPG ou WEBP. SVG fica de fora de proposito, porque
 * SVG e documento e pode carregar script; servido para a equipe inteira, seria
 * um jeito de rodar codigo no navegador de todo mundo da empresa.
 */
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;

export const LOGO_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export const LOGO_ACCEPT = Object.keys(LOGO_TYPES).join(",");

export type LogoValidation = { ok: true; extension: string; contentType: string } | { ok: false; reason: string };

/**
 * Tipo real do arquivo pelos primeiros bytes. O tipo que o navegador declara
 * vem de quem envia e pode ser qualquer coisa; os bytes nao mentem.
 */
export function sniffImageType(bytes: Uint8Array): string | null {
  const comeca = (assinatura: number[], deslocamento = 0) => assinatura.every((byte, i) => bytes[deslocamento + i] === byte);

  if (comeca([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (comeca([0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }
  // RIFF....WEBP
  if (comeca([0x52, 0x49, 0x46, 0x46]) && comeca([0x57, 0x45, 0x42, 0x50], 8)) {
    return "image/webp";
  }
  return null;
}

export function validateLogoFile(file: { size: number; bytes: Uint8Array }): LogoValidation {
  if (file.size <= 0) {
    return { ok: false, reason: "O arquivo chegou vazio. Tente enviar de novo." };
  }

  if (file.size > LOGO_MAX_BYTES) {
    return { ok: false, reason: "A logo passa de 2 MB. Use uma imagem menor." };
  }

  const tipo = sniffImageType(file.bytes);
  const extension = tipo ? LOGO_TYPES[tipo] : undefined;

  if (!tipo || !extension) {
    return { ok: false, reason: "Envie a logo em PNG, JPG ou WEBP." };
  }

  return { ok: true, extension, contentType: tipo };
}

/** Caminho no armazenamento. Muda a cada envio, para o navegador nunca mostrar a logo antiga do cache. */
export function buildLogoKey(companyId: string, logoId: string, extension: string) {
  return `empresas/${companyId}/logo/${logoId}.${extension}`;
}

/** Iniciais para quando nao ha logo: "Mercado Bom Preco" vira "MB". */
export function companyInitials(name: string) {
  const palavras = name
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((p) => p.length > 0 && !/^(de|da|do|das|dos|e|ltda|me|eireli|sa)$/i.test(p));

  return (palavras.slice(0, 2).map((p) => p[0]).join("") || name.slice(0, 1) || "Z").toUpperCase();
}
