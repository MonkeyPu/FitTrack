import { readNutrients, sumItems, type Nutrients } from "./nutrition";
import { parseDecimal } from "./number";
import type { Meal } from "./types";

/**
 * Recipes: a big food made of ingredients, each with its own amount. When you log one you can change the amount
 * of ANY ingredient and the others follow in the same proportion, so the recipe keeps its balance.
 * A recipe item is stored like any combined food: values for one serving of the ingredient, and how many servings are used.
 */
export type RecipeItem = {
  food_id: string | null;
  name: string;
  /** what one serving is, e.g. "100 g" or "1 scoop" */
  serving: string | null;
  /** how many servings of the ingredient the recipe uses */
  qty: number;
  calories: number;
  protein: number;
  nutrients: Nutrients;
};

/** Splits a serving into a number and a unit: "100 g" is 100 and "g", "1 scoop" is 1 and "scoop". */
export function servingUnit(desc: string | null | undefined): { per: number; unit: string } {
  const d = (desc ?? "").trim();
  if (!d) return { per: 1, unit: "serving" };
  const m = /^(\d+(?:[.,]\d+)?)(?![\d/])\s*(.*)$/.exec(d);
  const per = m ? parseDecimal(m[1]) : NaN;
  if (m && per > 0) return { per, unit: m[2].trim() || "units" };
  return { per: 1, unit: d };
}

/** How much of the ingredient the recipe uses, in its own unit (150 for 1.5 servings of "100 g"). */
export const baseAmount = (i: RecipeItem) => i.qty * servingUnit(i.serving).per;

/** The amount for the same ingredient when the whole recipe is multiplied by `factor`. */
export const amountAt = (i: RecipeItem, factor: number) => baseAmount(i) * factor;

/** What to multiply the recipe by so that ingredient `index` comes to `amount`. Null when that isn't possible. */
export function factorFor(items: RecipeItem[], index: number, amount: number): number | null {
  const base = items[index] ? baseAmount(items[index]) : 0;
  return Number.isFinite(amount) && amount > 0 && base > 0 ? amount / base : null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** The ingredients with every quantity multiplied by `factor` (a quantity is stored to 2 decimals). */
export const scaledItems = (items: RecipeItem[], factor: number): RecipeItem[] => items.map((i) => ({ ...i, qty: round2(i.qty * factor) }));

/** Calories, protein and nutrients of the whole recipe at this multiplier. */
export function recipeTotals(items: RecipeItem[], factor: number) {
  return sumItems(scaledItems(items, factor));
}

/** An amount as it is typed in a box: no thousands commas, at most 2 decimals. */
export const formatAmount = (n: number) => String(round2(n));

export function itemsFromMeal(meal: Meal): RecipeItem[] {
  return (meal.meal_items ?? []).map((i) => ({
    food_id: i.food_id, name: i.food_name_snapshot, serving: i.serving_description_snapshot, qty: Number(i.serving_quantity),
    calories: Number(i.calories_per_serving_snapshot), protein: Number(i.protein_per_serving_snapshot),
    nutrients: readNutrients(i as unknown as Record<string, unknown>, "_per_serving_snapshot"),
  }));
}
