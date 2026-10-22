import { PHRASES, WORDS } from "./catalog-terms";
import { zeroNutrients, type Nutrients } from "./nutrition";

/**
 * Stores in the catalog. `id` is the value of the `store` column in catalog_products.
 * To add a store: import its products with scripts/import_catalog.py, then add it here.
 */
export const STORES: readonly { id: string; label: string }[] = [{ id: "mercadona", label: "Mercadona" }];

/** The columns the app reads from catalog_products. */
export const CATALOG_COLUMNS = "id,store,product_id,ean,name,brand,category,packaging,price,pack_size,pack_unit,unit,pack_amount,kcal,protein,carbs,sugar,fat,sat_fat,fiber,image_url";

export type CatalogRow = {
  id: string; store: string; product_id: string; ean: string | null; name: string; brand: string | null; category: string | null;
  packaging: string | null; price: number | string | null; pack_size: number | string | null; pack_unit: string | null;
  unit: "g" | "ml"; pack_amount: number | string | null;
  kcal: number | string | null; protein: number | string | null; carbs: number | string | null; sugar: number | string | null;
  fat: number | string | null; sat_fat: number | string | null; fiber: number | string | null; image_url: string | null;
};

export type CatalogProduct = {
  id: string;
  store: string;
  code: string;
  ean: string | null;
  name: string;
  brand: string | null;
  category: string | null;
  image: string | null;
  /** pack as the store writes it, e.g. "Botella 1 l" */
  quantity: string | null;
  price: number | null;
  unit: "g" | "ml";
  /** whole pack in g or ml, when known */
  packAmount: number | null;
  hasNutrition: boolean;
  /** values per 100 g (or 100 ml) */
  per100: { calories: number; protein: number; nutrients: Nutrients };
  warnings: string[];
};

export type PickedFood = { code: string; name: string; serving: string; calories: number; protein: number; nutrients: Nutrients };

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const x = Number(v);
  return Number.isFinite(x) && x >= 0 ? x : null;
};

/** Turns a catalog_products row into our shape. A row without calories is shown as "No nutrition data". */
export function productFromRow(r: CatalogRow): CatalogProduct {
  const kcal = num(r.kcal);
  const protein = num(r.protein) ?? 0;
  const nutrients: Nutrients = {
    ...zeroNutrients(),
    carbs: num(r.carbs) ?? 0, sugar: num(r.sugar) ?? 0, fat: num(r.fat) ?? 0, sat_fat: num(r.sat_fat) ?? 0, fiber: num(r.fiber) ?? 0,
  };
  const warnings: string[] = [];
  if (kcal !== null && kcal > 900) warnings.push("The calories look too high. Check the label.");
  if (protein + nutrients.carbs + nutrients.fat > 105) warnings.push("The nutrition values don't add up. Check the label.");
  if (nutrients.sugar > nutrients.carbs + 0.5) warnings.push("Sugar is higher than carbs. Check the label.");

  const size = num(r.pack_size);
  const quantity = [r.packaging, size ? `${size} ${r.pack_unit ?? ""}`.trim() : ""].filter(Boolean).join(" ") || null;
  return {
    id: r.id, store: r.store, code: r.product_id, ean: r.ean, name: r.name, brand: r.brand, category: r.category,
    image: r.image_url, quantity, price: num(r.price), unit: r.unit === "ml" ? "ml" : "g", packAmount: num(r.pack_amount),
    hasNutrition: kcal !== null, per100: { calories: kcal ?? 0, protein, nutrients }, warnings,
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

export const priceText = (price: number | null) => (price === null ? "" : `${price.toFixed(2).replace(".", ",")} €`);

/** Product photos come from imgix, which resizes on request. Ask for the size we show instead of the full image. */
export function imageAt(url: string | null, px: number): string | null {
  if (!url || !url.startsWith("https://")) return null;
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith("imgix.net")) return url;
    u.search = `?fit=crop&w=${px}&h=${px}`;
    return u.toString();
  } catch { return null; }
}

/* ───────────── typed text ───────────── */

/** Reduces typed text to plain words so it can never form query syntax. */
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
 * Turns typed text into search groups for search_catalog(). Every group must match a product; inside a group any
 * alternative will do. An alternative is the start of a word ("yogur"), or a whole word when it ends in $ ("sal$").
 * Typed words match themselves and their singular forms, and English food words add their Spanish names
 * (see catalog-terms.ts), so "chicken breast" looks for "pollo" and "pechuga".
 */
export function searchGroups(typed: string): string[] {
  const words = tokens(typed);
  const phraseAt = (i: number) => {
    for (const n of [3, 2, 1]) {
      if (i + n > words.length) continue;
      const head = words.slice(i, i + n - 1).join(" ");
      for (const last of forms(words[i + n - 1])) {
        const groups = PHRASES[head ? `${head} ${last}` : last];
        if (groups) return { n, groups };
      }
    }
    return null;
  };
  const groups: string[][] = [];
  for (let i = 0; i < words.length;) {
    const phrase = phraseAt(i);
    if (phrase) { groups.push(...phrase.groups); i += phrase.n; continue; }
    const w = words[i++];
    const alts = new Set<string>([w]);
    for (const f of forms(w)) {
      if (f !== w) alts.add(`${f}$`);
      for (const a of WORDS[f] ?? []) alts.add(a);
    }
    groups.push([...alts]);
  }
  return groups.slice(0, 8).map((g) => g.join("|"));
}
