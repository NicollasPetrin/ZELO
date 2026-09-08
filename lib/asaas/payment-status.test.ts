import { describe, expect, it } from "vitest";
import { paymentStatusToEvent } from "./payment-status";

describe("paymentStatusToEvent", () => {
  it("treats authorized and received money as a confirmed payment", () => {
    for (const status of ["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"]) {
      expect(paymentStatusToEvent(status)).toBe("PAYMENT_CONFIRMED");
    }
  });

  it("treats a charge that has not come due as created, which is what a trial looks like", () => {
    expect(paymentStatusToEvent("PENDING")).toBe("PAYMENT_CREATED");
    expect(paymentStatusToEvent("AWAITING_RISK_ANALYSIS")).toBe("PAYMENT_CREATED");
  });

  it("reports an overdue charge", () => {
    expect(paymentStatusToEvent("OVERDUE")).toBe("PAYMENT_OVERDUE");
  });

  it("revokes only when the refund actually happened", () => {
    expect(paymentStatusToEvent("REFUNDED")).toBe("PAYMENT_REFUNDED");
    // Pedido em analise nao pode cortar o acesso: o estorno ainda pode ser negado.
    expect(paymentStatusToEvent("REFUND_REQUESTED")).toBeNull();
  });

  it("reports a chargeback", () => {
    expect(paymentStatusToEvent("CHARGEBACK_REQUESTED")).toBe("PAYMENT_CHARGEBACK_REQUESTED");
  });

  it("ignores a status it does not know instead of guessing", () => {
    expect(paymentStatusToEvent("DUNNING_REQUESTED")).toBeNull();
    expect(paymentStatusToEvent("")).toBeNull();
    expect(paymentStatusToEvent("QUALQUER_COISA")).toBeNull();
  });
});
