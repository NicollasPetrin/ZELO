import { describe, expect, it } from "vitest";
import { isTaskLate, reconcileTaskStatus } from "./task-status";

const agora = new Date("2026-08-31T12:00:00.000Z");
const DIA = 24 * 60 * 60 * 1000;
const emDias = (dias: number) => new Date(agora.getTime() + dias * DIA);

describe("reconcileTaskStatus", () => {
  it("clears the overdue mark when the deadline moves to the future", () => {
    expect(reconcileTaskStatus("OVERDUE", emDias(3), agora)).toBe("PENDING");
  });

  it("keeps it overdue while the deadline is still in the past", () => {
    expect(reconcileTaskStatus("OVERDUE", emDias(-3), agora)).toBe("OVERDUE");
  });

  it("treats a deadline moved to this exact moment as still past", () => {
    expect(reconcileTaskStatus("OVERDUE", agora, agora)).toBe("OVERDUE");
  });

  it("leaves every other status untouched, even with a past deadline", () => {
    for (const status of ["PENDING", "IN_PROGRESS", "IN_REVIEW", "COMPLETED", "CANCELED"] as const) {
      expect(reconcileTaskStatus(status, emDias(-5), agora)).toBe(status);
    }
  });

  it("does not turn a completed task overdue because it was late", () => {
    expect(reconcileTaskStatus("COMPLETED", emDias(-10), agora)).toBe("COMPLETED");
  });
});

describe("isTaskLate", () => {
  it("counts a task whose deadline passed", () => {
    expect(isTaskLate({ status: "PENDING", dueDate: emDias(-1) }, agora)).toBe(true);
  });

  it("counts a task marked overdue even with a future deadline", () => {
    expect(isTaskLate({ status: "OVERDUE", dueDate: emDias(2) }, agora)).toBe(true);
  });

  it("does not count what is already done or cancelled", () => {
    expect(isTaskLate({ status: "COMPLETED", dueDate: emDias(-5) }, agora)).toBe(false);
    expect(isTaskLate({ status: "CANCELED", dueDate: emDias(-5) }, agora)).toBe(false);
  });

  it("does not count a task still within its deadline", () => {
    expect(isTaskLate({ status: "IN_PROGRESS", dueDate: emDias(1) }, agora)).toBe(false);
  });
});
