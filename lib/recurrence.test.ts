import { describe, expect, it } from "vitest";
import { getNextRecurrenceDate } from "./recurrence";

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
