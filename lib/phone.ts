/**
 * Telefone brasileiro para uso na cobranca.
 *
 * A processadora exige o telefone do pagador para emitir a cobranca, entao um
 * numero invalido nao e detalhe de cadastro: ele impede a venda.
 */

const DDDS_VALIDOS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19,
  21, 22, 24, 27, 28,
  31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49,
  51, 53, 54, 55,
  61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79,
  81, 82, 83, 84, 85, 86, 87, 88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export type ParsedPhone = {
  digits: string;
  isMobile: boolean;
};

/**
 * Aceita fixo (10 digitos) e celular (11 digitos, comecando com 9 apos o DDD).
 * Um "+55" na frente e removido, porque e assim que muita gente copia o numero.
 */
export function parsePhone(value: string | null | undefined): ParsedPhone | null {
  if (!value) {
    return null;
  }

  let digits = onlyDigits(value);

  if (digits.length === 13 && digits.startsWith("55")) {
    digits = digits.slice(2);
  }

  if (digits.length === 12 && digits.startsWith("55")) {
    digits = digits.slice(2);
  }

  if (digits.length !== 10 && digits.length !== 11) {
    return null;
  }

  if (!DDDS_VALIDOS.has(Number(digits.slice(0, 2)))) {
    return null;
  }

  const isMobile = digits.length === 11;

  // Celular no Brasil sempre comeca com 9 depois do DDD.
  if (isMobile && digits[2] !== "9") {
    return null;
  }

  // Fixo nunca comeca com 0 ou 1 depois do DDD.
  if (!isMobile && Number(digits[2]) < 2) {
    return null;
  }

  return { digits, isMobile };
}

export function isValidPhone(value: string | null | undefined) {
  return parsePhone(value) !== null;
}

export function formatPhone(value: string | null | undefined) {
  const parsed = parsePhone(value);

  if (!parsed) {
    return value ?? "";
  }

  const { digits, isMobile } = parsed;

  return isMobile
    ? digits.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3")
    : digits.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
}
