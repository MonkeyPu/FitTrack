import { describe, expect, it } from "vitest";
import { addNutrients, nutrientColumns, readNutrients, readTotals, sumItems, totalColumns, zeroNutrients } from "./nutrition";

const n = (o: Partial<ReturnType<typeof zeroNutrients>>) => ({ ...zeroNutrients(), ...o });

describe("nutrition helpers", () => {
  it("sums a combination: yoghurt plus protein powder", () => {
    const yoghurt = { qty: 1, calories: 100, protein: 10, nutrients: n({ carbs: 6, sugar: 6, fat: 3 }) };
    const powder = { qty: 1.5, calories: 120, protein: 24, nutrients: n({ carbs: 2, sugar: 1, fat: 1.5 }) };
    const s = sumItems([yoghurt, powder]);
    expect(s.calories).toBe(280);
    expect(s.protein).toBe(46);
    expect(s.nutrients.carbs).toBe(9);
    expect(s.nutrients.fat).toBeCloseTo(5.25, 10);
  });
  it("reads and writes nutrient columns", () => {
    const row = { carbs_per_serving: "12.5", sugar_per_serving: 3, fat_per_serving: null };
    expect(readNutrients(row).carbs).toBe(12.5);
    expect(readNutrients(row).fat).toBe(0);
    expect(nutrientColumns(n({ fiber: 4 }), "_per_serving_snapshot").fiber_per_serving_snapshot).toBe(4);
    expect(readTotals({ total_salt: "0.8" }).salt).toBe(0.8);
    expect(totalColumns(n({ carbs: 10 }), 3).total_carbs).toBe(30);
  });
  it("adds nutrient sets", () => {
    expect(addNutrients(n({ sugar: 1 }), n({ sugar: 2, fat: 1 }))).toEqual(n({ sugar: 3, fat: 1 }));
  });
});
