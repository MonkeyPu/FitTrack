import { describe, expect, it } from "vitest";
import { weightsKcal, weightsMinutes, weightsSummary } from "./weights";

describe("weightsMinutes", () => {
  it("adds the reps and the rests between sets", () => {
    expect(weightsMinutes(3, 10, "medium")).toBe(4); // 90 s lifting + 2 x 75 s rest = 240 s
    expect(weightsMinutes(5, 5, "heavy")).toBe(10); // 75 s + 4 x 120 s = 555 s, rounded up
    expect(weightsMinutes(1, 1, "light")).toBe(1);
  });
  it("is null for anything that isn't whole sets and reps", () => {
    expect(weightsMinutes(0, 10, "medium")).toBeNull();
    expect(weightsMinutes(3, 2.5, "medium")).toBeNull();
    expect(weightsMinutes(3, 10, "extreme")).toBeNull();
  });
});

describe("weightsKcal", () => {
  it("counts only the calories above resting", () => {
    expect(weightsKcal({ sets: 3, reps: 10, intensity: "medium", weightKg: 70 })).toEqual({ kcal: 16, minutes: 4 }); // 3.5 x 70 x 4/60
  });
  it("burns more when it is harder, with more sets and at a higher weight", () => {
    const k = (o: Partial<Parameters<typeof weightsKcal>[0]>) => weightsKcal({ sets: 4, reps: 8, intensity: "medium", weightKg: 70, ...o })!.kcal;
    expect(k({ intensity: "heavy" })).toBeGreaterThan(k({ intensity: "medium" }));
    expect(k({ intensity: "medium" })).toBeGreaterThan(k({ intensity: "light" }));
    expect(k({ sets: 8 })).toBeGreaterThan(k({ sets: 4 }));
    expect(k({ weightKg: 90 })).toBeGreaterThan(k({ weightKg: 70 }));
  });
  it("uses a time you typed in place of the worked-out one", () => {
    expect(weightsKcal({ sets: 3, reps: 10, intensity: "medium", weightKg: 70, minutes: 60 })).toEqual({ kcal: 245, minutes: 60 });
  });
  it("needs a weight", () => {
    expect(weightsKcal({ sets: 3, reps: 10, intensity: "medium", weightKg: null })).toBeNull();
    expect(weightsKcal({ sets: 3, reps: 10, intensity: "medium", weightKg: 0 })).toBeNull();
  });
});

describe("weightsSummary", () => {
  it("reads like a sentence", () => {
    expect(weightsSummary({ sets: 3, reps_per_set: 10, intensity: "medium" })).toBe("3 sets × 10 reps · medium");
    expect(weightsSummary({ sets: 1, reps_per_set: 1, intensity: "heavy" })).toBe("1 set × 1 rep · heavy");
    expect(weightsSummary({})).toBe("");
  });
});
