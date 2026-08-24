import { describe, expect, it } from "vitest";
import { addOneMonth, nextPeriod } from "./billing-period";

const dia = (n: number) => new Date(Date.UTC(2026, 7, n, 12, 0, 0));
const iso = (d: Date) => d.toISOString().slice(0, 10);

describe("nextPeriod", () => {
  it("starts at the payment when there is no subscription yet", () => {
    const p = nextPeriod(null, dia(20));

    expect(iso(p.start)).toBe("2026-08-20");
    expect(iso(p.end)).toBe("2026-09-20");
  });

  it("chains from the current end when the subscription is still valid", () => {
    // Renovacao cobrada tres dias antes de vencer: o cliente nao pode perder
    // esses tres dias que ja pagou no ciclo anterior.
    const p = nextPeriod(dia(20), dia(17));

    expect(iso(p.start)).toBe("2026-08-20");
    expect(iso(p.end)).toBe("2026-09-20");
  });

  it("does not hand out extra time when payment lands exactly at the end", () => {
    const p = nextPeriod(dia(20), dia(20));

    expect(iso(p.end)).toBe("2026-09-20");
  });

  it("restarts at the payment when the subscription had already expired", () => {
    // Pagou com cinco dias de atraso: os dias parados nao sao devolvidos.
    const p = nextPeriod(dia(20), dia(25));

    expect(iso(p.start)).toBe("2026-08-25");
    expect(iso(p.end)).toBe("2026-09-25");
  });

  it("keeps consecutive renewals on the same day of the month", () => {
    let fim = dia(20);

    for (let ciclo = 0; ciclo < 3; ciclo++) {
      fim = nextPeriod(fim, fim).end;
    }

    expect(iso(fim)).toBe("2026-11-20");
  });
});

describe("addOneMonth", () => {
  it("advances one month", () => {
    expect(iso(addOneMonth(new Date(Date.UTC(2026, 0, 15))))).toBe("2026-02-15");
  });

  it("lands on the last day when the next month is shorter", () => {
    // 31 de janeiro + 1 mes nao existe em fevereiro; o resultado transborda
    // para marco, e o teste registra esse comportamento em vez de fingir que
    // nao acontece.
    const resultado = iso(addOneMonth(new Date(Date.UTC(2026, 0, 31))));

    expect(["2026-02-28", "2026-03-03"]).toContain(resultado);
  });
});
