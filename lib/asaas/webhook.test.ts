import { describe, expect, it } from "vitest";
import { isHandledPaymentEvent, isValidWebhookToken, parseWebhookPayload } from "./webhook";

const token = "token-de-webhook-do-asaas";

function paymentEvent(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    id: "evt_0001",
    event: "PAYMENT_RECEIVED",
    dateCreated: "2026-08-18 10:00:00",
    payment: {
      id: "pay_0001",
      customer: "cus_0001",
      subscription: "sub_0001",
      value: 249.9,
      billingType: "PIX",
      status: "RECEIVED",
      dueDate: "2026-08-20",
      invoiceUrl: "https://sandbox.asaas.com/i/pay_0001",
      ...overrides,
    },
  });
}

describe("isValidWebhookToken", () => {
  it("accepts the configured token", () => {
    expect(isValidWebhookToken(token, token)).toBe(true);
  });

  it("rejects a different token", () => {
    expect(isValidWebhookToken("token-errado", token)).toBe(false);
  });

  it("rejects tokens of a different length without throwing", () => {
    expect(isValidWebhookToken("curto", token)).toBe(false);
    expect(isValidWebhookToken(`${token}-com-sufixo`, token)).toBe(false);
  });

  it("rejects a missing header", () => {
    expect(isValidWebhookToken(null, token)).toBe(false);
    expect(isValidWebhookToken(undefined, token)).toBe(false);
    expect(isValidWebhookToken("", token)).toBe(false);
  });
});

describe("parseWebhookPayload", () => {
  it("parses a payment event", () => {
    const result = parseWebhookPayload(paymentEvent());

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.data.id).toBe("evt_0001");
      expect(result.data.event).toBe("PAYMENT_RECEIVED");
      expect(result.data.payment.id).toBe("pay_0001");
      expect(result.data.payment.billingType).toBe("PIX");
    }
  });

  it("keeps a payment without subscription", () => {
    const result = parseWebhookPayload(paymentEvent({ subscription: null }));

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.data.payment.subscription).toBeNull();
    }
  });

  it("falls back to UNDEFINED for an unknown billing type", () => {
    const result = parseWebhookPayload(paymentEvent({ billingType: "CRIPTO" }));

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.data.payment.billingType).toBe("UNDEFINED");
    }
  });

  it("rejects a body that is not JSON", () => {
    const result = parseWebhookPayload("<html>erro</html>");

    expect(result.ok).toBe(false);
  });

  it("rejects an event without the payment object", () => {
    const result = parseWebhookPayload(JSON.stringify({ id: "evt_0002", event: "PAYMENT_RECEIVED" }));

    expect(result.ok).toBe(false);
  });

  it("rejects an event without an id, since idempotency depends on it", () => {
    const result = parseWebhookPayload(paymentEvent().replace('"id":"evt_0001",', ""));

    expect(result.ok).toBe(false);
  });
});

describe("isHandledPaymentEvent", () => {
  it("recognises events that change a subscription", () => {
    expect(isHandledPaymentEvent("PAYMENT_RECEIVED")).toBe(true);
    expect(isHandledPaymentEvent("PAYMENT_CONFIRMED")).toBe(true);
    expect(isHandledPaymentEvent("PAYMENT_OVERDUE")).toBe(true);
  });

  it("ignores events with no effect on access", () => {
    expect(isHandledPaymentEvent("PAYMENT_CREATED")).toBe(false);
    expect(isHandledPaymentEvent("PAYMENT_UPDATED")).toBe(false);
    expect(isHandledPaymentEvent("QUALQUER_COISA")).toBe(false);
  });
});
