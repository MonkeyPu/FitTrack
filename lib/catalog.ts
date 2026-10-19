import { zeroNutrients, type Nutrients } from "./nutrition";

/** Stores people can filter by. Ids are Open Food Facts store tags. */
export const STORES = [
  { id: "mercadona", label: "Mercadona", kind: "store" },
  { id: "carrefour", label: "Carrefour", kind: "store" },
  { id: "dia", label: "Dia", kind: "store" },
  { id: "lidl", label: "Lidl", kind: "store" },
  { id: "alcampo", label: "Alcampo", kind: "store" },
  { id: "eroski", label: "Eroski", kind: "store" },
  { id: "aldi", label: "Aldi", kind: "store" },
  { id: "consum", label: "Consum", kind: "store" },
  { id: "spain", label: "All of Spain", kind: "country" },
] as const;
export type StoreId = (typeof STORES)[number]["id"];

/** The only fields we ask Open Food Facts for. */
export const OFF_FIELDS = "code,product_name,product_name_es,generic_name,brands,quantity,serving_size,serving_quantity,nutriments,stores";

export type CatalogProduct = {
  code: string;
  name: string;
  brand: string | null;
  quantity: string | null;
  unit: "g" | "ml";
  /** size of one serving in g or ml, when the label gives one */
  servingAmount: number | null;
  hasNutrition: boolean;
  /** values per 100 g (or 100 ml) */
  per100: { calories: number; protein: number; nutrients: Nutrients };
  warnings: string[];
};

export type PickedFood = { code: string; name: string; serving: string; calories: number; protein: number; nutrients: Nutrients };

type Raw = Record<string, unknown>;
const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Turns an Open Food Facts product into our shape, or null if it has no usable name or barcode. */
export function parseOffProduct(p: Raw): CatalogProduct | null {
  const code = text(p.code) || (typeof p.code === "number" ? String(p.code) : "");
  const name = text(p.product_name_es) || text(p.product_name) || text(p.generic_name);
  if (!code || !name) return null;

  const n = (p.nutriments ?? {}) as Raw;
  const val = (k: string) => {
    const x = Number(n[k]);
    return n[k] !== undefined && n[k] !== "" && Number.isFinite(x) && x >= 0 ? x : null;
  };
  let kcal = val("energy-kcal_100g");
  if (kcal === null) {
    const kj = val("energy_100g") ?? val("energy-kj_100g");
    if (kj !== null) kcal = kj / 4.184;
  }
  const protein = val("proteins_100g") ?? 0;
  const nutrients: Nutrients = {
    ...zeroNutrients(),
    carbs: val("carbohydrates_100g") ?? 0,
    sugar: val("sugars_100g") ?? 0,
    fat: val("fat_100g") ?? 0,
    sat_fat: val("saturated-fat_100g") ?? 0,
    fiber: val("fiber_100g") ?? 0,
    salt: val("salt_100g") ?? 0,
  };

  const sizeText = `${text(p.quantity)} ${text(p.serving_size)}`;
  const unit: "g" | "ml" = /\d\s*(ml|cl|l)\b/i.test(sizeText) && !/\d\s*(g|kg)\b/i.test(sizeText) ? "ml" : "g";
  const serving = Number(p.serving_quantity);
  const brand = text(p.brands).split(",")[0]?.trim() || null;

  const warnings: string[] = [];
  const calories = kcal ?? 0;
  if (kcal !== null && kcal > 900) warnings.push("The calories look too high. Check the label.");
  if (protein + nutrients.carbs + nutrients.fat > 105) warnings.push("The nutrition values don't add up. Check the label.");
  if (nutrients.sugar > nutrients.carbs + 0.5) warnings.push("Sugar is higher than carbs. Check the label.");

  return {
    code, name, brand,
    quantity: text(p.quantity) || null,
    unit,
    servingAmount: Number.isFinite(serving) && serving > 0 && serving <= 2000 ? serving : null,
    hasNutrition: kcal !== null,
    per100: { calories, protein, nutrients },
    warnings,
  };
}

const r2 = (x: number) => Math.round(x * 100) / 100;

/** Values for a chosen amount (g or ml), rounded to 2 decimals. */
export function scaleProduct(p: CatalogProduct, amount: number) {
  const f = amount / 100;
  const nutrients = zeroNutrients();
  for (const k of Object.keys(nutrients) as (keyof Nutrients)[]) nutrients[k] = r2(p.per100.nutrients[k] * f);
  return { calories: r2(p.per100.calories * f), protein: r2(p.per100.protein * f), nutrients };
}

export const displayName = (p: CatalogProduct) => (p.brand && !p.name.toLowerCase().includes(p.brand.toLowerCase()) ? `${p.name} (${p.brand})` : p.name).slice(0, 100);
