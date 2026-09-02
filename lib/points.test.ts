import { describe, expect, it } from "vitest";
import { POINTS_BY_PRIORITY, emptyPriorityCount, rankMembers, totalPoints, totalTasks } from "./points";

const contagem = (low: number, medium: number, high: number, urgent: number) => ({
  LOW: low,
  MEDIUM: medium,
  HIGH: high,
  URGENT: urgent,
});

describe("totalPoints", () => {
  it("weights each priority", () => {
    expect(totalPoints(contagem(1, 0, 0, 0))).toBe(1);
    expect(totalPoints(contagem(0, 1, 0, 0))).toBe(3);
    expect(totalPoints(contagem(0, 0, 1, 0))).toBe(5);
    expect(totalPoints(contagem(0, 0, 0, 1))).toBe(8);
  });

  it("adds the priorities together", () => {
    expect(totalPoints(contagem(2, 3, 1, 1))).toBe(2 + 9 + 5 + 8);
  });

  it("is zero for someone who finished nothing", () => {
    expect(totalPoints(emptyPriorityCount())).toBe(0);
  });

  it("keeps one urgent worth more than three low, which is the point of the scale", () => {
    expect(totalPoints(contagem(0, 0, 0, 1))).toBeGreaterThan(totalPoints(contagem(3, 0, 0, 0)));
  });
});

describe("totalTasks", () => {
  it("counts tasks regardless of weight", () => {
    expect(totalTasks(contagem(2, 3, 1, 1))).toBe(7);
  });
});

describe("rankMembers", () => {
  it("orders by points, highest first", () => {
    const ranking = rankMembers([
      { id: "a", counts: contagem(1, 0, 0, 0) },
      { id: "b", counts: contagem(0, 0, 0, 1) },
      { id: "c", counts: contagem(0, 1, 0, 0) },
    ]);

    expect(ranking.map((m) => m.id)).toEqual(["b", "c", "a"]);
    expect(ranking.map((m) => m.position)).toEqual([1, 2, 3]);
  });

  it("gives tied people the same position instead of an arbitrary order", () => {
    const ranking = rankMembers([
      { id: "a", counts: contagem(0, 1, 0, 0) },
      { id: "b", counts: contagem(3, 0, 0, 0) },
      { id: "c", counts: contagem(0, 0, 0, 1) },
    ]);

    // a e b somam 3 pontos cada; c soma 8.
    expect(ranking[0].id).toBe("c");
    expect(ranking[1].position).toBe(2);
    expect(ranking[2].position).toBe(2);
  });

  it("breaks a tie by who finished more tasks, before falling back to order", () => {
    const ranking = rankMembers([
      { id: "poucas", counts: contagem(0, 1, 0, 0) },
      { id: "muitas", counts: contagem(3, 0, 0, 0) },
    ]);

    expect(ranking[0].id).toBe("muitas");
    expect(ranking[0].position).toBe(1);
    expect(ranking[1].position).toBe(1);
  });

  it("keeps people with no completed tasks in the list, at the bottom", () => {
    const ranking = rankMembers([
      { id: "zerado", counts: emptyPriorityCount() },
      { id: "ativo", counts: contagem(0, 0, 1, 0) },
    ]);

    expect(ranking.map((m) => m.id)).toEqual(["ativo", "zerado"]);
    expect(ranking[1].points).toBe(0);
  });

  it("handles an empty team", () => {
    expect(rankMembers([])).toEqual([]);
  });
});

describe("POINTS_BY_PRIORITY", () => {
  it("grows with severity", () => {
    expect(POINTS_BY_PRIORITY.LOW).toBeLessThan(POINTS_BY_PRIORITY.MEDIUM);
    expect(POINTS_BY_PRIORITY.MEDIUM).toBeLessThan(POINTS_BY_PRIORITY.HIGH);
    expect(POINTS_BY_PRIORITY.HIGH).toBeLessThan(POINTS_BY_PRIORITY.URGENT);
  });
});
