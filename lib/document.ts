/**
 * Validacao de CPF e CNPJ.
 *
 * O documento e usado para abrir o cadastro do pagador na processadora, entao
 * validar de verdade importa: um documento que apenas parece certo cria um
 * cliente errado la fora, e o erro so aparece na hora de cobrar.
 */

export type DocumentKind = "CPF" | "CNPJ";

export type ParsedDocument = {
  digits: string;
  kind: DocumentKind;
};

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

/** Rejeita 00000000000 e afins, que passam no calculo mas nao existem. */
function allSameDigit(digits: string) {
  return /^(\d)\1+$/.test(digits);
}

function isValidCpf(digits: string) {
  if (digits.length !== 11 || allSameDigit(digits)) {
    return false;
  }

  for (let checkIndex = 9; checkIndex < 11; checkIndex++) {
    let sum = 0;

    for (let i = 0; i < checkIndex; i++) {
      sum += Number(digits[i]) * (checkIndex + 1 - i);
    }

    const remainder = (sum * 10) % 11;
    const expected = remainder === 10 ? 0 : remainder;

    if (expected !== Number(digits[checkIndex])) {
      return false;
    }
  }

  return true;
}

function isValidCnpj(digits: string) {
  if (digits.length !== 14 || allSameDigit(digits)) {
    return false;
  }

  const check = (length: number) => {
    let weight = length - 7;
    let sum = 0;

    for (let i = 0; i < length; i++) {
      sum += Number(digits[i]) * weight--;

      if (weight < 2) {
        weight = 9;
      }
    }

    const remainder = sum % 11;

    return remainder < 2 ? 0 : 11 - remainder;
  };

  return check(12) === Number(digits[12]) && check(13) === Number(digits[13]);
}

/** Devolve os digitos e o tipo quando o documento e valido, ou null. */
export function parseDocument(value: string | null | undefined): ParsedDocument | null {
  if (!value) {
    return null;
  }

  const digits = onlyDigits(value);

  if (isValidCnpj(digits)) {
    return { digits, kind: "CNPJ" };
  }

  if (isValidCpf(digits)) {
    return { digits, kind: "CPF" };
  }

  return null;
}

export function isValidDocument(value: string | null | undefined) {
  return parseDocument(value) !== null;
}

/** Formata para leitura. Guardamos sempre so os digitos. */
export function formatDocument(value: string | null | undefined) {
  const parsed = parseDocument(value);

  if (!parsed) {
    return value ?? "";
  }

  if (parsed.kind === "CPF") {
    return parsed.digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  }

  return parsed.digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

/**
 * Versao mascarada para telas e registros de auditoria: mostra o suficiente
 * para a pessoa reconhecer o proprio documento, sem reproduzi-lo inteiro onde
 * nao e necessario.
 */
export function maskDocument(value: string | null | undefined) {
  const parsed = parseDocument(value);

  if (!parsed) {
    return "";
  }

  const { digits } = parsed;
  const visibleTail = digits.slice(-2);
  const visibleHead = digits.slice(0, 3);

  return `${visibleHead}${"*".repeat(digits.length - 5)}${visibleTail}`;
}
