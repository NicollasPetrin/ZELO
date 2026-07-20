import { describe, expect, it } from "vitest";
import { pageOffset, paginatedResult, parsePage } from "./pagination";

describe("pagination", () => {
  it("normalizes invalid page values", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage("2.5")).toBe(1);
  });

  it("calculates the offset and page count", () => {
    expect(parsePage("3")).toBe(3);
    expect(pageOffset(3, 25)).toBe(50);
    expect(paginatedResult(["item"], 51, 3, 25)).toEqual({
      items: ["item"],
      totalItems: 51,
      page: 3,
      pageSize: 25,
      pageCount: 3,
    });
  });
});
