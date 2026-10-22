import { describe, expect, it } from "vitest";
import { goalDeficit, isBulking, netStatusOf, summarize } from "./calc";
import { modeHint } from "./safety";

const cut = { maintenance: 2500, maxFood: 2200, netTarget: 2000, protein: 120 };
const bulk = { maintenance: 2500, maxFood: 3200, netTarget: 3000, protein: 150 };
const food = (cal: number) => [{ total_calories: cal, total_protein: 100 }];

describe("bulking", () => {
  it("is bulking only when the net target is above maintenance", () => {
    expect(isBulking(bulk)).toBe(true);
    expect(isBulking(cut)).toBe(false);
    expect(isBulking({ maintenance: 2500, netTarget: 2500 })).toBe(false);
    expect(isBulking({ maintenance: null, netTarget: 3000 })).toBe(false);
  });
  it("reports the target surplus instead of a target deficit", () => {
    const s = summarize(food(2800), [], [], bulk);
    expect(s.targetSurplus).toBe(500);
    expect(s.targetDeficit).toBeNull();
    expect(s.deficit).toBe(-300); // negative deficit = surplus of 300
    expect(summarize(food(1800), [], [], cut).targetSurplus).toBeNull();
  });
  it("treats reaching the target as fine when bulking", () => {
    expect(netStatusOf(105, false)).toBe("over");
    expect(netStatusOf(105, true)).toBe("ok");
    expect(netStatusOf(60, true)).toBe("ok");
    expect(netStatusOf(140, true)).toBe("near");
    expect(netStatusOf(null, true)).toBe("none");
  });
  it("adds up the target surplus over the logged days", () => {
    const days = [{ date: "2026-10-01", food: 3000, exercise: 0 }, { date: "2026-10-02", food: 2900, exercise: 0 }];
    const g = goalDeficit(days, bulk, "2026-10-05");
    expect(g.deficit).toBe(-900); // 2 x 2500 - 5900
    expect(g.targetSurplus).toBe(1000);
    expect(g.targetDeficit).toBeNull();
  });
  it("says what the target means", () => {
    expect(modeHint(2500, 3000)).toContain("Bulking: 500 kcal above");
    expect(modeHint(2500, 2000)).toContain("Cutting: 500 kcal below");
    expect(modeHint(2500, 2500)).toContain("Maintaining");
    expect(modeHint(NaN, 2000)).toContain("above it to bulk");
  });
});
