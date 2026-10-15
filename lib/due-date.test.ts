import { describe, expect, it } from "vitest";
import { brasiliaDay, brasiliaTime, DEFAULT_DUE_TIME, dueDateAt } from "./due-date";

describe("dueDateAt", () => {
  it("reads the time as Brasilia time, whatever the server clock is", () => {
    expect(dueDateAt("2026-10-16", "09:00")?.toISOString()).toBe("2026-10-16T12:00:00.000Z");
  });

  it("defaults to the end of the working day in Brasilia", () => {
    expect(DEFAULT_DUE_TIME).toBe("17:00");
    expect(dueDateAt("2026-10-16")?.toISOString()).toBe("2026-10-16T20:00:00.000Z");
  });

  it("keeps a late evening deadline on the day it was set for", () => {
    const prazo = dueDateAt("2026-10-16", "22:30")!;

    expect(prazo.toISOString()).toBe("2026-10-17T01:30:00.000Z");
    expect(brasiliaDay(prazo)).toBe("2026-10-16");
    expect(brasiliaTime(prazo)).toBe("22:30");
  });

  it("refuses days and times that do not exist", () => {
    expect(dueDateAt("2026-02-31")).toBeNull();
    expect(dueDateAt("2026-10-16", "24:00")).toBeNull();
    expect(dueDateAt("16/10/2026")).toBeNull();
    expect(dueDateAt("2026-10-16", "9h")).toBeNull();
  });

  it("reads midnight back as 00:00", () => {
    expect(brasiliaTime(dueDateAt("2026-10-16", "00:00")!)).toBe("00:00");
  });
});
