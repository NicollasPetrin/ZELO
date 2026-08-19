import "server-only";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  ASAAS_API_KEY: z.string().min(1).optional(),
  ASAAS_ENVIRONMENT: z.enum(["sandbox", "production"]).default("sandbox"),
  ASAAS_WEBHOOK_TOKEN: z.string().min(16).optional(),
  ASAAS_USER_AGENT: z.string().min(1).default("Zelo"),
});

// Uma variavel declarada e vazia no .env chega aqui como "" e nao como undefined,
// o que quebraria os campos opcionais e os defaults. Tratamos vazio como ausente.
function optionalEnv(value: string | undefined) {
  const trimmed = value?.trim();

  return trimmed ? trimmed : undefined;
}

const parsedEnv = envSchema.safeParse({
  DATABASE_URL: process.env.DATABASE_URL,
  SESSION_SECRET: process.env.SESSION_SECRET,
  NODE_ENV: process.env.NODE_ENV,
  ASAAS_API_KEY: optionalEnv(process.env.ASAAS_API_KEY),
  ASAAS_ENVIRONMENT: optionalEnv(process.env.ASAAS_ENVIRONMENT),
  ASAAS_WEBHOOK_TOKEN: optionalEnv(process.env.ASAAS_WEBHOOK_TOKEN),
  ASAAS_USER_AGENT: optionalEnv(process.env.ASAAS_USER_AGENT),
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

export function getAsaasConfig(): AsaasConfig {
  if (!env.ASAAS_API_KEY) {
    throw new Error(ASAAS_NOT_CONFIGURED_MESSAGE);
  }

  return {
    apiKey: env.ASAAS_API_KEY,
    baseUrl: asaasBaseUrls[env.ASAAS_ENVIRONMENT],
    userAgent: env.ASAAS_USER_AGENT,
    environment: env.ASAAS_ENVIRONMENT,
  };
}

export function getAsaasWebhookToken() {
  if (!env.ASAAS_WEBHOOK_TOKEN) {
    throw new Error(ASAAS_WEBHOOK_NOT_CONFIGURED_MESSAGE);
  }

  return env.ASAAS_WEBHOOK_TOKEN;
}
