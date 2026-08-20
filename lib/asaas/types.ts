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

/** Eventos de nota fiscal de servico emitida pelo Asaas. */
export const handledInvoiceEvents = [
  "INVOICE_CREATED",
  "INVOICE_UPDATED",
  "INVOICE_SYNCHRONIZED",
  "INVOICE_AUTHORIZED",
  "INVOICE_CANCELED",
  "INVOICE_CANCELLATION_DENIED",
  "INVOICE_ERROR",
] as const;

export type HandledInvoiceEvent = (typeof handledInvoiceEvents)[number];

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

export const asaasInvoiceSchema = z.object({
  id: z.string().min(1),
  status: z.string().min(1),
  customer: z.string().nullish(),
  payment: z.string().nullish(),
  number: z.string().nullish(),
  value: z.number().nullish(),
  effectiveDate: z.string().nullish(),
  pdfUrl: z.string().nullish(),
  xmlUrl: z.string().nullish(),
  externalReference: z.string().nullish(),
});

export type AsaasInvoice = z.infer<typeof asaasInvoiceSchema>;

/**
 * Só `id` e `event` são exigidos, porque são o minimo para gravar o evento sem
 * duplicar. Os objetos de cobranca e de nota vem conforme a familia do evento, e
 * ambos sao opcionais de proposito: exigir um deles faria o endpoint devolver
 * 400 para qualquer familia de evento nova que o Asaas venha a criar, e 15
 * respostas de erro seguidas pausam a fila de entrega.
 */
export const asaasWebhookEventSchema = z.object({
  id: z.string().min(1),
  event: z.string().min(1),
  dateCreated: z.string().nullish(),
  payment: asaasPaymentSchema.optional(),
  invoice: asaasInvoiceSchema.optional(),
});

export type AsaasWebhookEvent = z.infer<typeof asaasWebhookEventSchema>;

export const asaasCheckoutSchema = z.object({
  id: z.string().min(1),
  /** URL hospedada pelo Asaas onde o cliente conclui o pagamento. */
  link: z.string().min(1),
  status: z.string().min(1),
  externalReference: z.string().nullish(),
});

export type AsaasCheckout = z.infer<typeof asaasCheckoutSchema>;

export type AsaasCheckoutInput = {
  billingTypes: AsaasBillingType[];
  /** Cliente ja existente no Asaas. E o vinculo que sobrevive ate o pagamento. */
  customer: string;
  chargeTypes: Array<"DETACHED" | "RECURRENT" | "INSTALLMENT">;
  minutesToExpire: number;
  items: Array<{
    name: string;
    description?: string;
    quantity: number;
    value: number;
  }>;
  subscription?: {
    cycle: "MONTHLY" | "YEARLY";
    nextDueDate: string;
  };
  callback: {
    successUrl: string;
    cancelUrl: string;
    expiredUrl: string;
  };
};

export const asaasCustomerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  cpfCnpj: z.string().nullish(),
  email: z.string().nullish(),
});

export type AsaasCustomer = z.infer<typeof asaasCustomerSchema>;
