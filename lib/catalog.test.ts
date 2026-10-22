import { describe, expect, it } from "vitest";
import { displayName, imageAt, matchesGroups, parseOffProduct, plainWords, priceText, productFromRow, scaleProduct, searchGroups, spanishWords, zoomImage, type CatalogRow } from "./catalog";
import { PHRASES, WORDS } from "./catalog-terms";

const row = (o: Partial<CatalogRow> = {}): CatalogRow => ({
  id: "1", store: "mercadona", product_id: "4241", ean: "8402001027482", name: "Yogur natural", brand: "Hacendado", category: "Lácteos",
  packaging: "Pack", price: 1.05, pack_size: 4, pack_unit: "ud", unit: "g", pack_amount: null,
  kcal: 63, protein: 4.1, carbs: 5, sugar: 5, fat: 3, sat_fat: 2, fiber: null, image_url: "https://prod-mercadona.imgix.net/images/abc.jpg", ...o,
});

describe("productFromRow", () => {
  it("reads a Mercadona product", () => {
    const p = productFromRow(row());
    expect(p.name).toBe("Yogur natural");
    expect(p.hasNutrition).toBe(true);
    expect(p.per100.calories).toBe(63);
    expect(p.per100.nutrients.sat_fat).toBe(2);
    expect(p.per100.nutrients.fiber).toBe(0);
    expect(p.quantity).toBe("Pack 4 ud");
    expect(p.price).toBe(1.05);
    expect(p.warnings).toEqual([]);
  });
  it("accepts numbers sent as text and liquids", () => {
    const p = productFromRow(row({ kcal: "45.5", unit: "ml", pack_amount: "1000", pack_size: "1", pack_unit: "l", packaging: "Botella" }));
    expect(p.per100.calories).toBe(45.5);
    expect(p.unit).toBe("ml");
    expect(p.packAmount).toBe(1000);
    expect(p.quantity).toBe("Botella 1 l");
  });
  it("flags missing nutrition and suspicious values", () => {
    expect(productFromRow(row({ kcal: null })).hasNutrition).toBe(false);
    expect(productFromRow(row({ kcal: 1200, protein: 60, carbs: 60, fat: 30 })).warnings.length).toBe(2);
  });
});

describe("scaleProduct", () => {
  it("scales per-100 values to the chosen amount", () => {
    const s = scaleProduct(productFromRow(row()), 125);
    expect(s.calories).toBeCloseTo(78.75, 2);
    expect(s.protein).toBeCloseTo(5.13, 2);
    expect(s.nutrients.sugar).toBeCloseTo(6.25, 2);
  });
  it("adds the brand to the name only when it isn't already there", () => {
    expect(displayName(productFromRow(row()))).toBe("Yogur natural (Hacendado)");
    expect(displayName(productFromRow(row({ name: "Atún Hacendado" })))).toBe("Atún Hacendado");
  });
  it("writes prices the Spanish way", () => {
    expect(priceText(17.25)).toBe("17,25 €");
    expect(priceText(null)).toBe("");
  });
});

describe("images", () => {
  it("asks imgix for the size we show", () => {
    expect(imageAt("https://prod-mercadona.imgix.net/images/abc.jpg?fit=crop&h=3600&w=3600", 96)).toBe("https://prod-mercadona.imgix.net/images/abc.jpg?fit=crop&w=96&h=96");
    expect(imageAt("https://other.test/a.jpg", 96)).toBe("https://other.test/a.jpg");
    expect(imageAt("http://insecure.test/a.jpg", 96)).toBeNull();
    expect(imageAt(null, 96)).toBeNull();
  });
});

describe("typed text", () => {
  it("reduces typed text to plain words", () => {
    expect(plainWords("  Yogur  NATURAL!! ")).toBe("yogur natural");
    expect(plainWords("a,b) or (c")).toBe("a b or c");
    expect(plainWords("mac & cheese")).toBe("mac and cheese");
    expect(plainWords("*?%")).toBe("");
  });
});

describe("searchGroups", () => {
  it("looks for the start of each typed word, plus singular forms as whole words", () => {
    expect(searchGroups("Yogures")).toEqual(["yogures|yogure$|yogur$"]);
    expect(searchGroups("jamón serrano")).toEqual(["jamon", "serrano"]);
  });
  it("adds the Spanish names of English words", () => {
    expect(searchGroups("chicken breast")).toEqual(["chicken|pollo", "breast|pechuga"]);
    expect(searchGroups("Olive oil")).toEqual(["olive|oliva|aceituna", "oil|aceite"]);
    expect(searchGroups("eggs")).toContain("eggs|egg$|huevo");
    expect(searchGroups("gluten free bread")).toEqual(["gluten", "free|sin", "bread|pan$|panes$|panecillo|baguette|barra"]);
  });
  it("understands phrases, including plurals", () => {
    expect(searchGroups("ice cream")).toEqual(["helado"]);
    expect(searchGroups("green beans")).toEqual(["judia", "verde"]);
    expect(searchGroups("soy milk 1l")).toEqual(["soja", "bebida|leche", "1l"]);
    expect(searchGroups("crisps")).toEqual(["patata", "frita|chip"]);
  });
  it("keeps at most 8 groups and never builds database syntax from typed text", () => {
    expect(searchGroups("a b c d e f g h i j k")).toHaveLength(8);
    expect(searchGroups("100% (milk)_ | x")).toEqual(["100", "milk|leche", "x"]);
  });
  it("only has safe, lower-case, accent-free entries in the word list", () => {
    const entries = [...Object.entries(WORDS).flatMap(([k, v]) => [k, ...v]), ...Object.entries(PHRASES).flatMap(([k, v]) => [k, ...v.flat()])];
    for (const e of entries) expect(e.replace(/ /g, "")).toMatch(/^[a-z0-9]+\$?$/);
    for (const v of [...Object.values(WORDS), ...Object.values(PHRASES).flat()]) expect(v.length).toBeGreaterThan(0);
  });
});

describe("Open Food Facts products", () => {
  const raw = (o: Record<string, unknown> = {}) => ({
    code: "5449000000996", product_name: "Coca-Cola", brands: "Coca-Cola,Other", quantity: "330 ml", serving_quantity: "330",
    nutriments: { "energy-kcal_100g": 42, proteins_100g: 0, carbohydrates_100g: 10.6, sugars_100g: 10.6, fat_100g: 0 },
    image_front_small_url: "https://images.openfoodfacts.org/images/products/544/900/000/0996/front_es.1.200.jpg", ...o,
  });
  it("reads values per 100 and the serving size", () => {
    const p = parseOffProduct(raw())!;
    expect(p.id).toBe("off:5449000000996");
    expect(p.store).toBe("off");
    expect(p.brand).toBe("Coca-Cola");
    expect(p.unit).toBe("ml");
    expect(p.servingAmount).toBe(330);
    expect(p.per100.calories).toBe(42);
    expect(p.per100.nutrients.sugar).toBe(10.6);
  });
  it("converts kilojoules when kcal is missing", () => {
    const p = parseOffProduct(raw({ nutriments: { energy_100g: 418.4 } }))!;
    expect(p.per100.calories).toBeCloseTo(100, 1);
  });
  it("leaves out Mercadona products (they come from the Mercadona catalog)", () => {
    expect(parseOffProduct(raw({ brands: "Hacendado" }))).toBeNull();
    expect(parseOffProduct(raw({ brands: "Deliplus" }))).toBeNull();
    expect(parseOffProduct(raw({ stores: "Mercadona, Carrefour" }))).toBeNull();
    expect(parseOffProduct(raw({ stores_tags: ["carrefour", "mercadona"] }))).toBeNull();
    expect(parseOffProduct(raw({ stores: "Carrefour" }))).not.toBeNull();
  });
  it("skips discontinued products and ones without a name", () => {
    expect(parseOffProduct(raw({ obsolete: true }))).toBeNull();
    expect(parseOffProduct(raw({ product_name: "" }))).toBeNull();
  });
  it("matches results with the same rule as the database", () => {
    const g = searchGroups("chicken breast");
    expect(matchesGroups(g, "Pechuga de pollo", null)).toBe(true);
    expect(matchesGroups(g, "Chicken breast fillets", "Tesco")).toBe(true);
    expect(matchesGroups(g, "Pollo asado", null)).toBe(false);
    expect(matchesGroups(searchGroups("salt"), "Salsa de tomate", null)).toBe(false);
    expect(matchesGroups(searchGroups("salt"), "Sal fina", null)).toBe(true);
  });
  it("asks again in Spanish for English words", () => {
    expect(spanishWords("chicken breast")).toBe("pollo pechuga");
    expect(spanishWords("olive oil")).toBe("oliva aceite");
    expect(spanishWords("yogures")).toBe("yogures");
    expect(spanishWords("ice cream")).toBe("helado");
  });
});

describe("zoomImage", () => {
  it("asks for a bigger photo", () => {
    expect(zoomImage("https://prod-mercadona.imgix.net/images/abc.jpg")).toBe("https://prod-mercadona.imgix.net/images/abc.jpg?fit=crop&w=1000&h=1000");
    expect(zoomImage("https://images.openfoodfacts.org/images/products/544/900/000/0996/front_es.1.200.jpg")).toBe("https://images.openfoodfacts.org/images/products/544/900/000/0996/front_es.1.400.jpg");
    expect(zoomImage(null)).toBeNull();
  });
});
