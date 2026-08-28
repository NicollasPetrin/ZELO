import "server-only";
import { z } from "zod";

/**
 * Tamanho minimo do token de webhook. Nao entra no schema porque um valor curto
 * nao pode derrubar a aplicacao inteira: e tratado como "webhook nao
 * configurado" na hora do uso.
 */
const WEBHOOK_TOKEN_MIN_LENGTH = 16;

const envSchema = z.object({
  // Sem estas duas a aplicacao nao funciona de forma alguma, entao aqui falhar e
  // o comportamento certo.
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // As demais sao opcionais e nunca derrubam o build: um erro de digitacao numa
  // variavel de cobranca deve desligar a cobranca, nao tirar o site do ar.
  ASAAS_API_KEY: z.string().min(1).optional(),
  ASAAS_ENVIRONMENT: z.enum(["sandbox", "production"]).catch("sandbox").default("sandbox"),
  ASAAS_WEBHOOK_TOKEN: z.string().optional(),
  ASAAS_USER_AGENT: z.string().min(1).default("Zelo"),
  APP_URL: z.string().optional(),
});

// Uma variavel declarada e vazia no .env chega aqui como "" e nao como undefined,
// o que quebraria os campos opcionais e os defaults. Tratamos vazio como ausente.
function optionalEnv(value: string | undefined) {
  const trimmed = value?.trim();

  return trimmed ? trimmed : undefined;
}

/**
 * Aceita a URL colada do navegador, sem esquema. Exigir "https://" fazia o build
 * inteiro falhar por causa de um detalhe de digitacao.
 */
function normalizeUrl(value: string | undefined) {
  const trimmed = optionalEnv(value);

  if (!trimmed) {
    return undefined;
  }

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    return new URL(withScheme).origin;
  } catch {
    console.error("[env] APP_URL invalida, ignorando o valor recebido.");

    return undefined;
  }
}

const parsedEnv = envSchema.safeParse({
  DATABASE_URL: process.env.DATABASE_URL,
  SESSION_SECRET: process.env.SESSION_SECRET,
  NODE_ENV: process.env.NODE_ENV,
  ASAAS_API_KEY: optionalEnv(process.env.ASAAS_API_KEY),
  ASAAS_ENVIRONMENT: optionalEnv(process.env.ASAAS_ENVIRONMENT),
  ASAAS_WEBHOOK_TOKEN: optionalEnv(process.env.ASAAS_WEBHOOK_TOKEN),
  ASAAS_USER_AGENT: optionalEnv(process.env.ASAAS_USER_AGENT),
  APP_URL: normalizeUrl(process.env.APP_URL),
});

// Este modulo e avaliado durante o build, quando o Next carrega os modulos de
// servidor para coletar os dados das paginas. Sem uma mensagem propria, uma
// variavel ausente aparece como "Failed to collect page data for /alguma-pagina",
// que nao diz o que faltou nem onde definir. Nunca imprimimos o valor recebido,
// apenas o nome da variavel e o motivo.
if (!parsedEnv.success) {
  const problemas = parsedEnv.error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(raiz)"}: ${issue.message}`)
    .join("\n");

  throw new Error(
    [
      "Variaveis de ambiente ausentes ou invalidas:",
      problemas,
      "",
      "Defina-as no ambiente de build e de execucao da plataforma.",
      "O arquivo .env.example lista todas as variaveis esperadas.",
    ].join("\n"),
  );
}

export const env = parsedEnv.data;

export function getSessionSecret() {
  return env.SESSION_SECRET;
}

export const ASAAS_NOT_CONFIGURED_MESSAGE =
  "Checkout de pagamento ainda nao configurado. Configure a processadora para permitir a compra online do plano.";

export const ASAAS_WEBHOOK_NOT_CONFIGURED_MESSAGE =
  "Webhook da processadora ainda nao configurado. Defina ASAAS_WEBHOOK_TOKEN para receber eventos.";

export type AsaasConfig = {
  apiKey: string;
  baseUrl: string;
  userAgent: string;
  environment: "sandbox" | "production";
};

const asaasBaseUrls = {
  sandbox: "https://api-sandbox.asaas.com/v3",
  production: "https://api.asaas.com/v3",
} as const;

export function isAsaasConfigured() {
  return Boolean(env.ASAAS_API_KEY);
}

/**
 * Ambiente que a propria chave declara: as de homologacao comecam com
 * $aact_hmlg_ e as de producao com $aact_prod_.
 *
 * Devolve null para formatos que nao reconhecemos, para que uma mudanca no
 * padrao do Asaas nao passe a bloquear cobranca que estava funcionando.
 */
function environmentFromKey(apiKey: string): "sandbox" | "production" | null {
  if (apiKey.startsWith("$aact_hmlg_")) {
    return "sandbox";
  }

  if (apiKey.startsWith("$aact_prod_")) {
    return "production";
  }

  return null;
}

export function getAsaasConfig(): AsaasConfig {
  if (!env.ASAAS_API_KEY) {
    throw new Error(ASAAS_NOT_CONFIGURED_MESSAGE);
  }

  const doTipoDaChave = environmentFromKey(env.ASAAS_API_KEY);

  // Trocar a chave e esquecer o ambiente (ou o contrario) faz a aplicacao
  // chamar a URL errada, e o Asaas responde apenas "a chave nao pertence a este
  // ambiente" — sem dizer qual das duas variaveis corrigir. Preferimos falhar
  // aqui, dizendo o que ajustar.
  //
  // Nao adotamos o ambiente da chave silenciosamente: uma chave de producao com
  // ASAAS_ENVIRONMENT=sandbox passaria a cobrar de verdade justamente de quem
  // acreditava estar testando.
  if (doTipoDaChave && doTipoDaChave !== env.ASAAS_ENVIRONMENT) {
    throw new Error(
      `A ASAAS_API_KEY e do ambiente "${doTipoDaChave}", mas ASAAS_ENVIRONMENT esta como ` +
        `"${env.ASAAS_ENVIRONMENT}". Ajuste uma das duas para que fiquem iguais.`,
    );
  }

  return {
    apiKey: env.ASAAS_API_KEY,
    baseUrl: asaasBaseUrls[env.ASAAS_ENVIRONMENT],
    userAgent: env.ASAAS_USER_AGENT,
    environment: env.ASAAS_ENVIRONMENT,
  };
}

export const APP_URL_NOT_CONFIGURED_MESSAGE =
  "APP_URL nao configurada. Ela e necessaria para o Asaas devolver o cliente ao site depois do pagamento.";

/** Base publica da aplicacao, ja normalizada (sem barra final). */
export function getAppUrl() {
  if (!env.APP_URL) {
    throw new Error(APP_URL_NOT_CONFIGURED_MESSAGE);
  }

  return env.APP_URL;
}

/**
 * Token do webhook, ou null quando ausente ou curto demais para ser seguro.
 *
 * Devolver null em vez de lancar mantem a falha contida: a rota do webhook
 * recusa os eventos e o resto da aplicacao continua de pe.
 */
export function getAsaasWebhookToken() {
  const token = env.ASAAS_WEBHOOK_TOKEN;

  if (!token) {
    return null;
  }

  if (token.length < WEBHOOK_TOKEN_MIN_LENGTH) {
    console.error(
      `[env] ASAAS_WEBHOOK_TOKEN tem menos de ${WEBHOOK_TOKEN_MIN_LENGTH} caracteres. ` +
        "O webhook fica desligado ate que seja corrigido.",
    );

    return null;
  }

  return token;
}
