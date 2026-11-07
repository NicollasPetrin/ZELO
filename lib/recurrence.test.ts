import { describe, expect, it } from "vitest";
import { dueDateAt } from "./due-date";
import { getNextRecurrenceDate, nextOccurrenceAfter } from "./recurrence";

describe("getNextRecurrenceDate", () => {
  it("returns null for non-recurring tasks", () => {
    const next = getNextRecurrenceDate({
      type: "NONE",
      weekDays: null,
      monthDay: null,
      startDate: new Date("2026-01-01T12:00:00"),
      endDate: null,
    });

    expect(next).toBeNull();
  });

  it("calculates the next daily recurrence", () => {
    const next = getNextRecurrenceDate(
      {
        type: "DAILY",
        weekDays: null,
        monthDay: null,
        startDate: new Date("2026-01-01T12:00:00"),
        endDate: null,
      },
      new Date("2026-01-01T08:00:00"),
    );

    expect(next?.toISOString().slice(0, 10)).toBe("2026-01-02");
  });

  it("finds the next configured weekday", () => {
    const next = getNextRecurrenceDate(
      {
        type: "SPECIFIC_WEEKDAYS",
        weekDays: "1,3",
        monthDay: null,
        startDate: new Date("2026-01-04T12:00:00"),
        endDate: null,
      },
      new Date("2026-01-04T08:00:00"),
    );

    expect(next?.toISOString().slice(0, 10)).toBe("2026-01-05");
  });
});

describe("nextOccurrenceAfter", () => {
  const regra = (type: "NONE" | "DAILY" | "WEEKLY" | "MONTHLY" | "SPECIFIC_WEEKDAYS" | "SPECIFIC_MONTH_DAY", extra: Partial<{ weekDays: string; monthDay: number; startDate: Date; endDate: Date }> = {}) => ({
    type,
    weekDays: extra.weekDays ?? null,
    monthDay: extra.monthDay ?? null,
    startDate: extra.startDate ?? dueDateAt("2026-11-09", "07:00")!,
    endDate: extra.endDate ?? null,
  });
  const brasilia = (dia: string, hora = "17:00") => dueDateAt(dia, hora)!;

  it("nao tem proxima quando a tarefa nao e recorrente", () => {
    expect(nextOccurrenceAfter(regra("NONE"), brasilia("2026-11-09"), brasilia("2026-11-09", "08:00"))).toBeNull();
  });

  it("rotina diaria volta no dia seguinte, no mesmo horario", () => {
    const proxima = nextOccurrenceAfter(regra("DAILY"), brasilia("2026-11-09", "07:00"), brasilia("2026-11-09", "07:30"));
    expect(proxima).toEqual(brasilia("2026-11-10", "07:00"));
  });

  it("prazo a noite nao pula um dia por causa do relogio UTC do servidor", () => {
    // 21h15 em Brasilia ja e 00h15 do dia seguinte em UTC.
    const proxima = nextOccurrenceAfter(regra("DAILY"), brasilia("2026-11-09", "21:15"), brasilia("2026-11-09", "21:20"));
    expect(proxima).toEqual(brasilia("2026-11-10", "21:15"));
  });

  it("rotina diaria concluida com atraso volta hoje, sem acumular dias perdidos", () => {
    const proxima = nextOccurrenceAfter(regra("DAILY"), brasilia("2026-11-09", "07:00"), brasilia("2026-11-12", "10:00"));
    expect(proxima).toEqual(brasilia("2026-11-12", "07:00"));
  });

  it("rotina semanal mantem o dia da semana mesmo concluida com atraso", () => {
    // Segunda 09/11 concluida na quinta 12/11: a proxima e a segunda 16/11.
    const proxima = nextOccurrenceAfter(regra("WEEKLY"), brasilia("2026-11-09"), brasilia("2026-11-12"));
    expect(proxima).toEqual(brasilia("2026-11-16"));
  });

  it("rotina mensal do dia 31 cai no ultimo dia do mes curto e volta ao 31", () => {
    const inicio = brasilia("2026-10-31");
    const novembro = nextOccurrenceAfter(regra("MONTHLY", { startDate: inicio }), inicio, brasilia("2026-10-31", "18:00"));
    expect(novembro).toEqual(brasilia("2026-11-30"));
    const dezembro = nextOccurrenceAfter(regra("MONTHLY", { startDate: inicio }), novembro!, brasilia("2026-11-30", "18:00"));
    expect(dezembro).toEqual(brasilia("2026-12-31"));
  });

  it("dias da semana escolhidos: de segunda vai para quarta", () => {
    const proxima = nextOccurrenceAfter(regra("SPECIFIC_WEEKDAYS", { weekDays: "1,3" }), brasilia("2026-11-09"), brasilia("2026-11-09"));
    expect(proxima).toEqual(brasilia("2026-11-11"));
  });

  it("dia fixo do mes ainda neste mes quando vem depois do prazo", () => {
    const proxima = nextOccurrenceAfter(regra("SPECIFIC_MONTH_DAY", { monthDay: 20 }), brasilia("2026-11-09"), brasilia("2026-11-09"));
    expect(proxima).toEqual(brasilia("2026-11-20"));
  });

  it("dia fixo do mes vai para o mes seguinte quando ja passou", () => {
    const proxima = nextOccurrenceAfter(regra("SPECIFIC_MONTH_DAY", { monthDay: 5 }), brasilia("2026-11-09"), brasilia("2026-11-09"));
    expect(proxima).toEqual(brasilia("2026-12-05"));
  });

  it("para depois da data final da regra", () => {
    const proxima = nextOccurrenceAfter(regra("WEEKLY", { endDate: brasilia("2026-11-15") }), brasilia("2026-11-09"), brasilia("2026-11-09"));
    expect(proxima).toBeNull();
  });
});
