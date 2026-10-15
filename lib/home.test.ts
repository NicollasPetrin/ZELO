import { describe, expect, it } from "vitest";
import { bucketTasks, focusReason, focusTask, greeting, type HomeTask } from "./home";

// Quinta, 15/10/2026, 14h em Brasilia.
const agora = new Date("2026-10-15T17:00:00.000Z");
const t = (id: string, dueIso: string, priority: HomeTask["priority"] = "MEDIUM", status: HomeTask["status"] = "PENDING"): HomeTask => ({
  id,
  dueDate: new Date(dueIso),
  priority,
  status,
});

describe("bucketTasks", () => {
  const tarefas = [
    t("ontem", "2026-10-14T20:00:00.000Z"),
    t("hoje-cedo", "2026-10-15T12:00:00.000Z"),
    t("hoje-17h", "2026-10-15T20:00:00.000Z"),
    t("hoje-22h", "2026-10-16T01:00:00.000Z"),
    t("amanha", "2026-10-16T20:00:00.000Z"),
    t("semana", "2026-10-22T20:00:00.000Z"),
    t("depois", "2026-10-23T20:00:00.000Z"),
    t("feita", "2026-10-14T20:00:00.000Z", "MEDIUM", "COMPLETED"),
    t("cancelada", "2026-10-15T20:00:00.000Z", "MEDIUM", "CANCELED"),
  ];
  const grupos = bucketTasks(tarefas, agora);
  const ids = (lista: HomeTask[]) => lista.map((x) => x.id);

  it("puts anything past its deadline in late, including earlier today", () => {
    expect(ids(grupos.late)).toEqual(["ontem", "hoje-cedo"]);
  });

  it("keeps a 22h deadline in today, by the Brasilia calendar", () => {
    expect(ids(grupos.today)).toEqual(["hoje-17h", "hoje-22h"]);
  });

  it("splits the next 7 days from what comes after", () => {
    expect(ids(grupos.week)).toEqual(["amanha", "semana"]);
    expect(ids(grupos.later)).toEqual(["depois"]);
  });

  it("leaves completed and canceled tasks out", () => {
    const todos = [...grupos.late, ...grupos.today, ...grupos.week, ...grupos.later];
    expect(ids(todos)).not.toContain("feita");
    expect(ids(todos)).not.toContain("cancelada");
  });
});

describe("focusTask", () => {
  it("starts with the oldest late task", () => {
    const foco = focusTask([t("urgente-amanha", "2026-10-16T20:00:00.000Z", "URGENT"), t("atrasada", "2026-10-13T20:00:00.000Z", "LOW")], agora);
    expect(foco?.id).toBe("atrasada");
  });

  it("without delays, picks the highest priority", () => {
    const foco = focusTask([t("media-hoje", "2026-10-15T20:00:00.000Z"), t("urgente-sexta", "2026-10-16T20:00:00.000Z", "URGENT")], agora);
    expect(foco?.id).toBe("urgente-sexta");
  });

  it("has nothing to focus on when everything is done", () => {
    expect(focusTask([t("feita", "2026-10-15T20:00:00.000Z", "HIGH", "COMPLETED")], agora)).toBeNull();
  });
});

describe("focusReason", () => {
  it("says how late or how soon", () => {
    expect(focusReason(t("a", "2026-10-14T20:00:00.000Z"), agora)).toBe("Venceu ontem");
    expect(focusReason(t("a", "2026-10-12T20:00:00.000Z"), agora)).toBe("Venceu há 3 dias");
    expect(focusReason(t("a", "2026-10-15T12:00:00.000Z"), agora)).toBe("Venceu hoje às 09:00");
    expect(focusReason(t("a", "2026-10-15T20:00:00.000Z"), agora)).toBe("Vence hoje às 17:00");
    expect(focusReason(t("a", "2026-10-16T12:00:00.000Z"), agora)).toBe("Vence amanhã às 09:00");
    expect(focusReason(t("a", "2026-10-20T20:00:00.000Z"), agora)).toBe("Vence em 5 dias");
  });
});

describe("greeting", () => {
  it("follows the Brasilia clock", () => {
    expect(greeting(new Date("2026-10-15T11:00:00.000Z"))).toBe("Bom dia");
    expect(greeting(agora)).toBe("Boa tarde");
    expect(greeting(new Date("2026-10-16T01:00:00.000Z"))).toBe("Boa noite");
  });
});
