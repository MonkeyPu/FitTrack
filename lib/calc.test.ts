import { describe, expect, it } from "vitest";
import { lineTotal, percent, statusOf, summarize, type Targets } from "./calc";

const targets: Targets = { maintenance: 2500, maxFood: 2000, netTarget: 1700, protein: 120 };

describe("lineTotal", () => {
  it("chicken breast example: 2 servings of 165 kcal / 31 g", () => {
    expect(lineTotal(2, 165)).toBe(330);
    expect(lineTotal(2, 31)).toBe(62);
  });
  it("keeps raw precision", () => {
    expect(lineTotal(3, 0.1)).toBeCloseTo(0.3, 10);
  });
});

describe("summarize", () => {
  const foods = [
    { total_calories: 800, total_protein: 40 },
    { total_calories: 300, total_protein: 15 },
  ];
  const meals = [{ total_calories: 350, total_protein: 30 }];
  const activities = [{ calories_burned: 250 }];

  it("matches the spec dashboard example", () => {
    const s = summarize(foods, meals, activities, targets);
    expect(s.foodCalories).toBe(1450);
    expect(s.exerciseCalories).toBe(250);
    expect(s.net).toBe(1200);
    expect(s.foodRemaining).toBe(550);
    expect(s.netRemaining).toBe(500);
    expect(s.protein).toBe(85);
    expect(s.proteinRemaining).toBe(35);
    expect(s.proteinPct).toBeCloseTo(70.83, 1);
  });

  it("does not let exercise change food remaining (no double counting)", () => {
    const a = summarize(foods, meals, [], targets);
    const b = summarize(foods, meals, [{ calories_burned: 900 }], targets);
    expect(b.foodRemaining).toBe(a.foodRemaining);
    expect(b.net).toBe(a.net - 900);
  });

  it("allows negative remaining and >100% progress", () => {
    const s = summarize([{ total_calories: 2300, total_protein: 0 }], [], [], targets);
    expect(s.foodRemaining).toBe(-300);
    expect(s.foodPct).toBeCloseTo(115, 5);
    expect(statusOf(s.foodPct)).toBe("over");
  });

  it("handles missing or zero targets", () => {
    const none: Targets = { maintenance: null, maxFood: null, netTarget: 0, protein: null };
    const s = summarize(foods, meals, activities, none);
    expect(s.foodPct).toBeNull();
    expect(s.netPct).toBeNull();
    expect(s.foodRemaining).toBeNull();
    expect(s.netRemaining).toBeNull();
    expect(s.proteinRemaining).toBeNull();
    expect(statusOf(s.foodPct)).toBe("none");
  });

  it("handles an empty day", () => {
    const s = summarize([], [], [], targets);
    expect(s.net).toBe(0);
    expect(s.foodRemaining).toBe(2000);
  });

  it("net can go negative when exercise exceeds food", () => {
    const s = summarize([{ total_calories: 200, total_protein: 0 }], [], [{ calories_burned: 500 }], targets);
    expect(s.net).toBe(-300);
    expect(s.netRemaining).toBe(2000);
  });
});

describe("nutrient totals", () => {
  it("adds carbs, sugar and fat across food and meal entries, ignoring entries without them", () => {
    const s = summarize(
      [{ total_calories: 100, total_protein: 5, total_carbs: 20, total_sugar: 4 }, { total_calories: 50, total_protein: 0 }],
      [{ total_calories: 300, total_protein: 10, total_carbs: 40, total_fat: 12 }],
      [],
      targets,
    );
    expect(s.nutrients.carbs).toBe(60);
    expect(s.nutrients.sugar).toBe(4);
    expect(s.nutrients.fat).toBe(12);
    expect(s.nutrients.added_sugar).toBe(0);
  });
});

describe("deficit", () => {
  const day = (food: number, burned: number) =>
    summarize([{ total_calories: food, total_protein: 0 }], [], [{ calories_burned: burned }], targets);

  it("is maintenance minus net calories", () => {
    expect(day(1450, 250).deficit).toBe(1300); // 2500 - (1450 - 250)
    expect(day(0, 0).deficit).toBe(2500);
  });
  it("goes negative for a surplus", () => {
    expect(day(3000, 0).deficit).toBe(-500);
  });
  it("target deficit is maintenance minus net target, only when positive", () => {
    expect(day(0, 0).targetDeficit).toBe(800);
    const maintenanceTarget: Targets = { ...targets, netTarget: 2500 };
    expect(summarize([], [], [], maintenanceTarget).targetDeficit).toBeNull();
  });
  it("is null without maintenance calories", () => {
    expect(summarize([], [], [], { ...targets, maintenance: null }).deficit).toBeNull();
  });
});

describe("percent / statusOf", () => {
  it("classifies progress", () => {
    expect(statusOf(percent(50, 100))).toBe("ok");
    expect(statusOf(percent(95, 100))).toBe("near");
    expect(statusOf(percent(100, 100))).toBe("near");
    expect(statusOf(percent(101, 100))).toBe("over");
  });
});
