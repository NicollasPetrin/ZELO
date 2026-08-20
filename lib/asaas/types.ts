import { z } from "zod";

export const ASAAS_PROVIDER = "asaas";

/**
 * Eventos de cobranca que alteram o estado de uma assinatura no Zelo.
 * A lista completa do Asaas e maior; aqui ficam apenas os que a aplicacao
 * precisa tratar. Os demais sao aceitos e registrados como IGNORED.
 */
export const handledPaymentEvents = [
  // Marca o inicio de cada ciclo da assinatura: e neste evento que a fatura
  // local do mes passa a existir, antes mesmo de haver pagamento.
  "PAYMENT_CREATED",
  "PAYMENT_CONFIRMED",
  "PAYMENT_RECEIVED",
  "PAYMENT_OVERDUE",
  "PAYMENT_REFUNDED",
  "PAYMENT_DELETED",
  "PAYMENT_CHARGEBACK_REQUESTED",
] as const;

export type HandledPaymentEvent = (typeof handledPaymentEvents)[number];

export const asaasBillingTypeSchema = z.enum([
  "BOLETO",
  "CREDIT_CARD",
  "PIX",
  "UNDEFINED",
]);

export type AsaasBillingType = z.infer<typeof asaasBillingTypeSchema>;

export const asaasPaymentSchema = z.object({
  id: z.string().min(1),
  customer: z.string().min(1),
  subscription: z.string().min(1).nullish(),
  value: z.number(),
  netValue: z.number().nullish(),
  billingType: asaasBillingTypeSchema.catch("UNDEFINED"),
  status: z.string().min(1),
  dueDate: z.string().min(1),
  paymentDate: z.string().nullish(),
  invoiceUrl: z.string().nullish(),
  externalReference: z.string().nullish(),
});

export type AsaasPayment = z.infer<typeof asaasPaymentSchema>;

export const asaasWebhookEventSchema = z.object({
  id: z.string().min(1),
  event: z.string().min(1),
  dateCreated: z.string().nullish(),
  payment: asaasPaymentSchema,
});

export type AsaasWebhookEvent = z.infer<typeof asaasWebhookEventSchema>;

export const asaasCustomerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  cpfCnpj: z.string().nullish(),
  email: z.string().nullish(),
});

export type AsaasCustomer = z.infer<typeof asaasCustomerSchema>;
