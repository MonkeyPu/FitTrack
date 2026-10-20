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
  /** small product photo, when Open Food Facts has one */
  image: string | null;
  /** store tags like "mercadona", and country tags like "en:spain", when the record has them */
  stores: string[];
  countries: string[];
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
/** Reads text from a string, a list (first non-empty) or a per-language object (Spanish first). */
const text = (v: unknown): string => {
  if (typeof v === "string") return v.trim();
  if (Array.isArray(v)) return v.map(text).find(Boolean) ?? "";
  if (v && typeof v === "object") {
    const o = v as Raw;
    for (const k of ["es", "main", "en", "fr"]) { const t = text(o[k]); if (t) return t; }
    return Object.values(o).map(text).find(Boolean) ?? "";
  }
  return "";
};
const list = (v: unknown): string[] => (Array.isArray(v) ? v.map(text).filter(Boolean) : typeof v === "string" ? v.split(",").map((x) => x.trim()).filter(Boolean) : []);
const slug = (x: string) => x.toLowerCase().trim().replace(/\s+/g, "-");

/** Picks a small photo from whichever image fields the record has, or builds the address from its image data. */
export function imageOf(p: Raw, code: string): string | null {
  for (const k of ["image_front_small_url", "image_small_url", "image_front_thumb_url", "image_thumb_url", "image_front_url", "image_url"]) {
    const u = text(p[k]);
    if (u.startsWith("https://")) return u;
  }
  const front = (p.selected_images as Raw | undefined)?.front as Raw | undefined;
  for (const size of ["small", "thumb", "display"]) {
    const u = text(front?.[size]);
    if (u.startsWith("https://")) return u;
  }
  const images = p.images as Raw | undefined;
  if (images && typeof images === "object" && /^\d{8,14}$/.test(code)) {
    const keys = Object.keys(images).filter((k) => /^front_/.test(k));
    const key = keys.find((k) => k === "front_es") ?? keys.find((k) => k === "front_en") ?? keys[0];
    const rev = Number(((key ? images[key] : null) as Raw | null)?.rev);
    if (key && Number.isFinite(rev) && rev > 0) {
      const path = code.length <= 8 ? code : (() => { const c = code.padStart(13, "0"); return `${c.slice(0, 3)}/${c.slice(3, 6)}/${c.slice(6, 9)}/${c.slice(9)}`; })();
      return `https://images.openfoodfacts.org/images/products/${path}/${key}.${rev}.200.jpg`;
    }
  }
  return null;
}

/** Turns an Open Food Facts product into our shape, or null if it has no usable name or barcode. */
export function parseOffProduct(p: Raw): CatalogProduct | null {
  const code = text(p.code) || (typeof p.code === "number" ? String(p.code) : "");
  const name = text(p.product_name_es) || text(p.product_name) || text(p.generic_name);
  if (!code || !name) return null;
  // Products Open Food Facts has marked as discontinued may have stale values.
  if (p.obsolete === true || p.obsolete === "on" || p.obsolete === "true") return null;

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
    added_sugar: val("added-sugars_100g") ?? 0,
  };

  const sizeText = `${text(p.quantity)} ${text(p.serving_size)}`;
  const unit: "g" | "ml" = /\d\s*(ml|cl|l)\b/i.test(sizeText) && !/\d\s*(g|kg)\b/i.test(sizeText) ? "ml" : "g";
  const serving = Number(p.serving_quantity);
  const brand = (Array.isArray(p.brands) ? text(p.brands) : text(p.brands).split(",")[0]?.trim()) || null;
  const stores = (Array.isArray(p.stores_tags) ? list(p.stores_tags) : list(p.stores).map(slug)).map((x) => x.toLowerCase());
  const countries = list(p.countries_tags).map((x) => x.toLowerCase());

  const warnings: string[] = [];
  const calories = kcal ?? 0;
  if (kcal !== null && kcal > 900) warnings.push("The calories look too high. Check the label.");
  if (protein + nutrients.carbs + nutrients.fat > 105) warnings.push("The nutrition values don't add up. Check the label.");
  if (nutrients.sugar > nutrients.carbs + 0.5) warnings.push("Sugar is higher than carbs. Check the label.");

  return {
    code, name, brand,
    image: imageOf(p, code),
    stores, countries,
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

/* ───────────── typed text ───────────── */

/** Reduces typed text to plain words so it can never form query syntax for the search service. */
export function plainWords(input: string): string {
  return input.toLowerCase().replace(/&/g, " and ").replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim().slice(0, 80).trim();
}

const fold = (x: string) => x.normalize("NFKD").replace(/\p{M}+/gu, "").toLowerCase().replace(/[’'`´]/g, "").replace(/œ/g, "oe").replace(/æ/g, "ae");
const tokens = (x: string) => fold(x).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
const forms = (w: string) => {
  const f = new Set([w]);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) f.add(w.slice(0, -1));
  if (w.length > 4 && w.endsWith("es")) f.add(w.slice(0, -2));
  if (w.length > 4 && w.endsWith("ies")) f.add(`${w.slice(0, -3)}y`);
  return f;
};

/**
 * True when every typed word starts a word of the name (or name + brand), so "yogur nat" finds
 * "Yogur natural". Plural and singular forms match each other ("yogures" finds "yogur").
 */
export function matchesWords(typed: string, name: string, brand?: string | null): boolean {
  const words = tokens(typed);
  if (words.length === 0) return true;
  const shown = tokens(`${name} ${brand ?? ""}`);
  return words.every((w) => shown.some((s) => s.startsWith(w) || [...forms(w)].some((f) => forms(s).has(f))));
}

/** Whether a product belongs to the chosen store (Mercadona also covers its Hacendado brand). */
export function matchesStore(p: CatalogProduct, storeId: string): boolean {
  if (storeId === "spain") return p.countries.some((c) => c === "en:spain" || c === "spain");
  if (p.stores.some((s) => s === storeId || s.includes(storeId))) return true;
  const brand = (p.brand ?? "").toLowerCase();
  return storeId === "mercadona" && /hacendado|mercadona/.test(brand);
}
