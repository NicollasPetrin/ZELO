import { describe, expect, it } from "vitest";
import { landingComparison, landingFaqs, landingPlanCopy } from "./landing-content";
import { formatPriceCents, planDetails, planOrder } from "./plans";
import { TRIAL_DAYS } from "./subscription";

describe("landing content", () => {
  it.each(planOrder)("keeps %s prices and capacity tied to the catalog", (code) => {
    expect(landingComparison.find((row) => row.feature === "Mensalidade base")?.[code]).toBe(`${formatPriceCents(planDetails[code].priceCents)}/mês`);
    expect(landingComparison.find((row) => row.feature === "Usuário adicional")?.[code]).toBe(`${formatPriceCents(planDetails[code].pricePerExtraUserCents)}/mês`);
    expect(landingComparison.find((row) => row.feature === "Usuários incluídos")?.[code]).toBe(String(planDetails[code].includedUsers));
    expect(landingComparison.find((row) => row.feature === "Limite de usuários ativos")?.[code]).toBe(String(planDetails[code].maxUsers ?? "Sem teto"));
    expect(landingPlanCopy[code].features).toHaveLength(5);
  });
  it("preserves the report differences", () => {
    const row = landingComparison.find((item) => item.feature === "Relatórios");
    expect(row).toMatchObject({ BASIC: "Não incluídos", MANAGEMENT: "Básicos", COMPLETE: "Completos, com leitura executiva" });
  });
  it("states the actual trial and cancellation conditions", () => {
    expect(landingFaqs[0].question).toContain(String(TRIAL_DAYS));
    expect(landingFaqs[0].answer).toContain("primeira cobrança");
    expect(landingFaqs[0].answer).toContain("cancele antes");
  });
});
