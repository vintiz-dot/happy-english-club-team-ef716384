import { describe, expect, test } from "bun:test";
import { fitCount, pageCount, pageSlice, rowCount } from "../src/components/leaderboard/restPaging";

describe("board strip paging", () => {
  test("the star board's strip fits two 500px cards, not the six a nine-child class has", () => {
    // 1920 board - 2*56 padding - 40 rail gap - 480 rail - 190 label - 24 gap
    const track = 1920 - 112 - 40 - 480 - 190 - 24;
    expect(track).toBe(1074);
    expect(fitCount(track, 500, 20)).toBe(2);
    expect(pageCount(6, fitCount(track, 500, 20))).toBe(3);
  });

  test("every student below the podium is reached by the pages", () => {
    const perPage = fitCount(1074, 500, 20);
    const seen: number[] = [];
    for (let p = 0; p < pageCount(6, perPage); p++) {
      const slice = pageSlice(6, perPage, p);
      for (let i = slice.from; i < slice.to; i++) seen.push(i);
      // Nothing is hidden without the board saying so.
      expect(slice.label).not.toBeNull();
    }
    expect(seen).toEqual([0, 1, 2, 3, 4, 5]);
  });

  test("the night league table fits two 60px rows in its 170px strip", () => {
    expect(rowCount(170, 60, 8, 28)).toBe(2);
    // Jupiter has seven children, so four sit below the podium.
    expect(pageCount(4, rowCount(170, 60, 8, 28))).toBe(2);
  });

  test("a class that fits says nothing extra", () => {
    expect(pageSlice(2, 2, 0).label).toBeNull();
    expect(pageSlice(0, 2, 0).label).toBeNull();
    expect(pageSlice(2, 2, 0)).toMatchObject({ from: 0, to: 2 });
  });

  test("a page past the end clamps to the last one instead of showing nothing", () => {
    expect(pageSlice(6, 2, 9)).toMatchObject({ from: 4, to: 6 });
    expect(pageSlice(6, 2, -1)).toMatchObject({ from: 0, to: 2 });
  });
});
