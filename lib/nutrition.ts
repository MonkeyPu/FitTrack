export const NUTRIENTS = [
  { key: "carbs", label: "Carbs" },
  { key: "sugar", label: "Sugar" },
  { key: "fat", label: "Fat" },
  { key: "sat_fat", label: "Saturated fat" },
  { key: "fiber", label: "Fiber" },
  { key: "salt", label: "Salt" },
] as const;

export type NutrientKey = (typeof NUTRIENTS)[number]["key"];
export type Nutrients = Record<NutrientKey, number>;
export const NUTRIENT_KEYS = NUTRIENTS.map((n) => n.key) as NutrientKey[];

/** Optional daily goals in grams. A missing key means no goal for that nutrient. */
export type NutrientGoals = Partial<Record<NutrientKey, number>>;

/** "max" goals are limits to stay under. "min" goals are amounts to reach. */
export const NUTRIENT_GOAL_KIND: Record<NutrientKey, "max" | "min"> = {
  carbs: "max", sugar: "max", fat: "max", sat_fat: "max", fiber: "min", salt: "max",
};

/** Cleans whatever is stored in profiles.nutrient_goals. Anything not a positive number is dropped. */
export function parseNutrientGoals(v: unknown): NutrientGoals {
  const out: NutrientGoals = {};
  if (!v || typeof v !== "object") return out;
  for (const k of NUTRIENT_KEYS) {
    const n = Number((v as Record<string, unknown>)[k]);
    if (Number.isFinite(n) && n > 0) out[k] = n;
  }
  return out;
}

export const zeroNutrients = (): Nutrients => ({ carbs: 0, sugar: 0, fat: 0, sat_fat: 0, fiber: 0, salt: 0 });

type Row = Record<string, unknown>;
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Reads `<key><suffix>` columns, e.g. carbs_per_serving or carbs_per_serving_snapshot. */
export function readNutrients(row: Row, suffix = "_per_serving"): Nutrients {
  const out = zeroNutrients();
  for (const k of NUTRIENT_KEYS) out[k] = num(row[`${k}${suffix}`]);
  return out;
}

/** Reads the generated `total_<key>` columns. */
export function readTotals(row: Row): Nutrients {
  const out = zeroNutrients();
  for (const k of NUTRIENT_KEYS) out[k] = num(row[`total_${k}`]);
  return out;
}

export function nutrientColumns(n: Nutrients, suffix = "_per_serving"): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of NUTRIENT_KEYS) out[`${k}${suffix}`] = n[k];
  return out;
}

export function totalColumns(n: Nutrients, servings: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of NUTRIENT_KEYS) out[`total_${k}`] = n[k] * servings;
  return out;
}

export function addNutrients(a: Nutrients, b: Nutrients): Nutrients {
  const out = zeroNutrients();
  for (const k of NUTRIENT_KEYS) out[k] = a[k] + b[k];
  return out;
}

export type Item = { qty: number; calories: number; protein: number; nutrients: Nutrients };

/** Values for ONE serving of a combination: each item's per-serving value times its quantity. */
export function sumItems(items: Item[]): { calories: number; protein: number; nutrients: Nutrients } {
  let nutrients = zeroNutrients();
  let calories = 0;
  let protein = 0;
  for (const i of items) {
    calories += i.qty * i.calories;
    protein += i.qty * i.protein;
    const scaled = zeroNutrients();
    for (const k of NUTRIENT_KEYS) scaled[k] = i.qty * i.nutrients[k];
    nutrients = addNutrients(nutrients, scaled);
  }
  return { calories, protein, nutrients };
}

/** Form helpers: nutrient inputs are strings while editing. Blank means 0. */
export type NutrientStrings = Record<NutrientKey, string>;
export const emptyNutrientStrings = (): NutrientStrings => ({ carbs: "", sugar: "", fat: "", sat_fat: "", fiber: "", salt: "" });
export function toNutrientStrings(n: Nutrients): NutrientStrings {
  const out = emptyNutrientStrings();
  for (const k of NUTRIENT_KEYS) out[k] = n[k] ? String(n[k]) : "";
  return out;
}
