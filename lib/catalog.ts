import { PHRASES, WORDS } from "./catalog-terms";
import { zeroNutrients, type Nutrients } from "./nutrition";

/**
 * Where products can come from. "mercadona" is our own catalog_products table (see scripts/import_catalog.py);
 * "off" is Open Food Facts, searched live through /api/catalog/search. People can pick one or both.
 */
export const CATALOGS = [
  { id: "mercadona", label: "Mercadona" },
  { id: "off", label: "Open Food Facts" },
] as const;
export type CatalogId = (typeof CATALOGS)[number]["id"];
export const catalogLabel = (id: string) => CATALOGS.find((c) => c.id === id)?.label ?? id;

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
  /** one serving in g or ml, when the label gives it (Open Food Facts) */
  servingAmount: number | null;
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
    image: r.image_url, quantity, price: num(r.price), unit: r.unit === "ml" ? "ml" : "g", packAmount: num(r.pack_amount), servingAmount: null,
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

/* ───────────── Open Food Facts ───────────── */

/** The only fields we ask Open Food Facts for. */
export const OFF_FIELDS = "code,product_name,product_name_es,generic_name,brands,quantity,serving_size,serving_quantity,nutriments,stores";

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

/** Mercadona's own brands. Those products come from our Mercadona catalog, so Open Food Facts copies are left out. */
const MERCADONA_BRANDS = /hacendado|deliplus|bosque verde|compy|mercadona/;

/** Turns an Open Food Facts product into our shape, or null if it has no usable name or barcode. */
export function parseOffProduct(p: Raw): CatalogProduct | null {
  const code = text(p.code) || (typeof p.code === "number" ? String(p.code) : "");
  const name = text(p.product_name_es) || text(p.product_name) || text(p.generic_name);
  if (!code || !name) return null;
  // Products Open Food Facts has marked as discontinued may have stale values.
  if (p.obsolete === true || p.obsolete === "on" || p.obsolete === "true") return null;
  const brand = (Array.isArray(p.brands) ? text(p.brands) : text(p.brands).split(",")[0]?.trim()) || null;
  const stores = (Array.isArray(p.stores_tags) ? list(p.stores_tags) : list(p.stores).map(slug)).map((x) => x.toLowerCase());
  if (stores.some((s) => s.includes("mercadona")) || MERCADONA_BRANDS.test((brand ?? "").toLowerCase()) || MERCADONA_BRANDS.test(name.toLowerCase())) return null;

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
    carbs: val("carbohydrates_100g") ?? 0, sugar: val("sugars_100g") ?? 0, fat: val("fat_100g") ?? 0,
    sat_fat: val("saturated-fat_100g") ?? 0, fiber: val("fiber_100g") ?? 0, added_sugar: val("added-sugars_100g") ?? 0,
  };
  const sizeText = `${text(p.quantity)} ${text(p.serving_size)}`;
  const unit: "g" | "ml" = /\d\s*(ml|cl|l)\b/i.test(sizeText) && !/\d\s*(g|kg)\b/i.test(sizeText) ? "ml" : "g";
  const serving = Number(p.serving_quantity);

  const warnings: string[] = [];
  if (kcal !== null && kcal > 900) warnings.push("The calories look too high. Check the label.");
  if (protein + nutrients.carbs + nutrients.fat > 105) warnings.push("The nutrition values don't add up. Check the label.");
  if (nutrients.sugar > nutrients.carbs + 0.5) warnings.push("Sugar is higher than carbs. Check the label.");

  return {
    id: `off:${code}`, store: "off", code, ean: code, name, brand, category: null, image: imageOf(p, code),
    quantity: text(p.quantity) || null, price: null, unit, packAmount: null,
    servingAmount: Number.isFinite(serving) && serving > 0 && serving <= 2000 ? serving : null,
    hasNutrition: kcal !== null, per100: { calories: kcal ?? 0, protein, nutrients }, warnings,
  };
}

/** A larger version of a product photo for the zoom view. */
export function zoomImage(url: string | null): string | null {
  if (!url) return null;
  if (url.includes("imgix.net")) return imageAt(url, 1000);
  return url.replace(/\.(100|200)\.jpg$/, ".400.jpg");
}

/** Open Food Facts has no English-to-Spanish matching, so ask it again with the Spanish names of the typed words. */
export function spanishWords(typed: string): string {
  return searchGroups(typed).map((g) => {
    const alts = g.split("|");
    return alts.slice(1).find((a) => !a.endsWith("$")) ?? alts[0];
  }).join(" ");
}

/**
 * True when every group has an alternative that starts a word (or, ending in $, is a whole word) of the name or
 * brand. This is the same rule search_catalog() applies in the database, used here for Open Food Facts results.
 */
export function matchesGroups(groups: string[], name: string, brand?: string | null): boolean {
  const shown = tokens(`${name} ${brand ?? ""}`);
  return groups.every((g) => g.split("|").some((a) => a !== "" && (a.endsWith("$") ? shown.includes(a.slice(0, -1)) : shown.some((t) => t.startsWith(a)))));
}
