import { describe, expect, it } from "vitest";
import { amountAt, baseAmount, factorFor, formatAmount, itemFromPicked, itemsFromMeal, recipeTotals, scaledItems, servingUnit, type RecipeItem } from "./recipe";
import { zeroNutrients } from "./nutrition";

const item = (o: Partial<RecipeItem>): RecipeItem => ({ food_id: null, name: "x", serving: "100 g", qty: 1, calories: 100, protein: 10, nutrients: zeroNutrients(), ...o });
// 150 g chicken (165 kcal per 100 g), 1 scoop protein powder, 200 ml milk (46 kcal per 100 ml)
const recipe = [
  item({ name: "Chicken", serving: "100 g", qty: 1.5, calories: 165, protein: 31 }),
  item({ name: "Protein powder", serving: "1 scoop", qty: 1, calories: 120, protein: 24 }),
  item({ name: "Milk", serving: "100 ml", qty: 2, calories: 46, protein: 3.4 }),
];

describe("servingUnit", () => {
  it("splits a number and a unit", () => {
    expect(servingUnit("100 g")).toEqual({ per: 100, unit: "g" });
    expect(servingUnit("250ml")).toEqual({ per: 250, unit: "ml" });
    expect(servingUnit("1 scoop")).toEqual({ per: 1, unit: "scoop" });
    expect(servingUnit("2,5 dl")).toEqual({ per: 2.5, unit: "dl" });
    expect(servingUnit("100")).toEqual({ per: 100, unit: "units" });
  });
  it("falls back to one serving", () => {
    expect(servingUnit("big spoon")).toEqual({ per: 1, unit: "big spoon" });
    expect(servingUnit("1/2 cup")).toEqual({ per: 1, unit: "1/2 cup" });
    expect(servingUnit("")).toEqual({ per: 1, unit: "serving" });
    expect(servingUnit(null)).toEqual({ per: 1, unit: "serving" });
    expect(servingUnit("0 g")).toEqual({ per: 1, unit: "0 g" });
  });
});

describe("amounts and scaling", () => {
  it("shows each ingredient in its own unit", () => {
    expect(recipe.map(baseAmount)).toEqual([150, 1, 200]);
  });
  it("doubles everything when one ingredient is doubled", () => {
    const f = factorFor(recipe, 0, 300)!; // chicken 150 g -> 300 g
    expect(f).toBe(2);
    expect(recipe.map((i) => amountAt(i, f))).toEqual([300, 2, 400]);
  });
  it("works from any ingredient, not just the first", () => {
    const f = factorFor(recipe, 2, 100)!; // milk 200 ml -> 100 ml
    expect(f).toBe(0.5);
    expect(recipe.map((i) => amountAt(i, f))).toEqual([75, 0.5, 100]);
  });
  it("rejects amounts that aren't positive numbers", () => {
    expect(factorFor(recipe, 0, 0)).toBeNull();
    expect(factorFor(recipe, 0, NaN)).toBeNull();
    expect(factorFor(recipe, 0, -5)).toBeNull();
    expect(factorFor(recipe, 9, 5)).toBeNull();
  });
  it("scales the quantities that get logged", () => {
    expect(scaledItems(recipe, 2).map((i) => i.qty)).toEqual([3, 2, 4]);
    expect(scaledItems(recipe, 1 / 3).map((i) => i.qty)).toEqual([0.5, 0.33, 0.67]);
  });
  it("adds up the totals at any multiplier", () => {
    const one = recipeTotals(recipe, 1); // 247.5 + 120 + 92
    expect(one.calories).toBeCloseTo(459.5, 5);
    expect(one.protein).toBeCloseTo(46.5 + 24 + 6.8, 5);
    expect(recipeTotals(recipe, 2).calories).toBeCloseTo(one.calories * 2, 5);
  });
  it("formats amounts for a text box", () => {
    expect(formatAmount(150)).toBe("150");
    expect(formatAmount(12.456)).toBe("12.46");
    expect(formatAmount(1234.5)).toBe("1234.5");
  });
});

describe("itemsFromMeal", () => {
  it("reads the saved copy of each ingredient", () => {
    const meal = {
      id: "m", name: "Bowl",
      meal_items: [{
        id: "i", meal_id: "m", food_id: null, food_name_snapshot: "Rice", serving_description_snapshot: "100 g", calories_per_serving_snapshot: 130,
        protein_per_serving_snapshot: 2.7, serving_quantity: 1.5, carbs_per_serving_snapshot: 28, sugar_per_serving_snapshot: 0, fat_per_serving_snapshot: 0.3,
        sat_fat_per_serving_snapshot: 0, fiber_per_serving_snapshot: 0.4, added_sugar_per_serving_snapshot: 0,
      }],
    };
    const [r] = itemsFromMeal(meal as never);
    expect(r).toMatchObject({ name: "Rice", serving: "100 g", qty: 1.5, calories: 130, protein: 2.7 });
    expect(r.nutrients.carbs).toBe(28);
  });
});

describe("itemFromPicked", () => {
  it("turns a catalog product into an ingredient measured in grams", () => {
    const n = { ...zeroNutrients(), carbs: 30, fat: 1.5 };
    const { item, amount } = itemFromPicked({
      code: "1", name: "Arroz", serving: "150 g", calories: 195, protein: 4.05, nutrients: n, amount: 150, unit: "g",
      per100: { calories: 130, protein: 2.7, nutrients: n },
    });
    expect(amount).toBe(150);
    expect(item).toMatchObject({ food_id: null, name: "Arroz", serving: "100 g", qty: 1.5, calories: 130, protein: 2.7 });
    expect(baseAmount(item)).toBe(150); // shown as 150 g in the recipe
    expect(factorFor([item], 0, 300)).toBe(2);
  });
  it("works for liquids", () => {
    const { item } = itemFromPicked({ code: "2", name: "Leche", serving: "250 ml", calories: 115, protein: 8.5, nutrients: zeroNutrients(), amount: 250, unit: "ml", per100: { calories: 46, protein: 3.4, nutrients: zeroNutrients() } });
    expect(servingUnit(item.serving)).toEqual({ per: 100, unit: "ml" });
    expect(baseAmount(item)).toBe(250);
  });
});
