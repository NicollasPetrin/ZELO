import { describe, expect, it } from "vitest";
import { buildTaskEvent, shouldRemoveFromCalendar, wallTime } from "./event";

const tarefa = {
  id: "tarefa-1",
  title: "Repor prateleira de bebidas",
  description: "Conferir validade e repor o que faltar.",
  // 17:00 em Brasilia = 20:00 UTC.
  dueDate: new Date("2026-09-10T20:00:00.000Z"),
  priority: "HIGH" as const,
  status: "PENDING" as const,
  requiresProof: true,
  departmentName: "Operacao",
  creatorName: "Nicollas",
};

describe("wallTime", () => {
  it("converts the instant to the wall clock in Brasilia", () => {
    expect(wallTime(new Date("2026-09-10T20:00:00.000Z"))).toBe("2026-09-10T17:00:00");
  });

  it("rolls the date back when the instant falls on the previous local day", () => {
    // 02:00 UTC do dia 10 ainda e 23:00 do dia 9 em Brasilia.
    expect(wallTime(new Date("2026-09-10T02:00:00.000Z"))).toBe("2026-09-09T23:00:00");
  });

  it("writes midnight as 00, not 24", () => {
    expect(wallTime(new Date("2026-09-10T03:00:00.000Z"))).toBe("2026-09-10T00:00:00");
  });
});

describe("buildTaskEvent", () => {
  it("puts the priority in the title, which is all the week grid shows", () => {
    expect(buildTaskEvent(tarefa).summary).toBe("[Alta] Repor prateleira de bebidas");
  });

  it("ends at the deadline and starts shortly before it", () => {
    const evento = buildTaskEvent(tarefa);

    expect(evento.end.dateTime).toBe("2026-09-10T17:00:00");
    expect(evento.start.dateTime).toBe("2026-09-10T16:30:00");
    expect(evento.start.timeZone).toBe("America/Sao_Paulo");
  });

  it("carries the information the person needs to act", () => {
    const { description } = buildTaskEvent(tarefa);

    expect(description).toContain("Conferir validade");
    expect(description).toContain("Prioridade: Alta");
    expect(description).toContain("Setor: Operacao");
    expect(description).toContain("Solicitado por: Nicollas");
    expect(description).toContain("Exige foto de conclusao");
  });

  it("links back to the task when the address is known", () => {
    const evento = buildTaskEvent(tarefa, "https://usezelogestao.com.br");

    expect(evento.description).toContain("https://usezelogestao.com.br/tasks/tarefa-1");
    expect(evento.source?.url).toBe("https://usezelogestao.com.br/tasks/tarefa-1");
  });

  it("omits the link instead of writing a broken one when there is no address", () => {
    const evento = buildTaskEvent(tarefa);

    expect(evento.description).not.toContain("undefined");
    expect(evento.source).toBeUndefined();
  });

  it("does not mention proof for a task that does not require it", () => {
    const evento = buildTaskEvent({ ...tarefa, requiresProof: false });

    expect(evento.description).not.toContain("Exige foto");
  });

  it("asks for a reminder the day before and one hour before", () => {
    const { reminders } = buildTaskEvent(tarefa);

    expect(reminders.useDefault).toBe(false);
    expect(reminders.overrides.map((o) => o.minutes)).toEqual([1440, 60]);
  });
});

describe("shouldRemoveFromCalendar", () => {
  it("clears the calendar once the task is done or dropped", () => {
    expect(shouldRemoveFromCalendar("COMPLETED")).toBe(true);
    expect(shouldRemoveFromCalendar("CANCELED")).toBe(true);
  });

  it("keeps everything still open on the calendar", () => {
    for (const status of ["PENDING", "IN_PROGRESS", "IN_REVIEW", "OVERDUE"] as const) {
      expect(shouldRemoveFromCalendar(status)).toBe(false);
    }
  });
});
