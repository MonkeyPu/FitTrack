import { describe, expect, it } from "vitest";
import { average, groupDaily, rangeDates } from "./history";

describe("history helpers", () => {
  it("builds a date range ending today, oldest first", () => {
    expect(rangeDates("2026-10-15", 3)).toEqual(["2026-10-13", "2026-10-14", "2026-10-15"]);
    expect(rangeDates("2026-03-01", 2)).toEqual(["2026-02-28", "2026-03-01"]);
  });
  it("groups food, meals and exercise by day without leaking across days", () => {
    const m = groupDaily(
      [{ log_date: "2026-10-14", total_calories: 300, total_protein: 20 }],
      [{ log_date: "2026-10-14", total_calories: 500, total_protein: 30 }, { log_date: "2026-10-15", total_calories: 100, total_protein: 5 }],
      [{ log_date: "2026-10-14", calories_burned: 200 }],
    );
    expect(m.get("2026-10-14")).toEqual({ date: "2026-10-14", food: 800, protein: 50, exercise: 200 });
    expect(m.get("2026-10-15")?.food).toBe(100);
    expect(m.get("2026-10-13")).toBeUndefined();
  });
  it("averages only days with values", () => {
    expect(average([100, null, 300, undefined])).toBe(200);
    expect(average([null])).toBeNull();
  });
});
