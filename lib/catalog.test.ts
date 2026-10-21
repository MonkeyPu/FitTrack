import { describe, expect, it } from "vitest";
import { displayName, imageAt, matchesWords, plainWords, priceText, productFromRow, rankProducts, scaleProduct, searchStems, type CatalogRow } from "./catalog";

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
  it("turns typed words into accent-free word starts for the database", () => {
    expect(searchStems("Yogures Naturales")).toEqual(["yogur", "natural"]);
    expect(searchStems("jamón")).toEqual(["jamon"]);
    expect(searchStems("leche")).toEqual(["leche"]);
  });
  it("matches typed words against the start of words in the name or brand", () => {
    expect(matchesWords("yogur nat", "Yogur natural", "Hacendado")).toBe(true);
    expect(matchesWords("hacendado yogur", "Yogur natural", "Hacendado")).toBe(true);
    expect(matchesWords("yogures", "Yogur natural", null)).toBe(true);
    expect(matchesWords("jamon", "Jamón cocido", null)).toBe(true);
    expect(matchesWords("leche", "Yogur natural", "Hacendado")).toBe(false);
    expect(matchesWords("ham", "Champagne", null)).toBe(false);
  });
  it("lists names that start with the first word first, then shorter names", () => {
    const list = [row({ id: "a", name: "Yogur de leche entera" }), row({ id: "b", name: "Postre de leche" }), row({ id: "c", name: "Leche entera Hacendado" }), row({ id: "d", name: "Leche" })].map(productFromRow);
    expect(rankProducts("leche", list).map((p) => p.id)).toEqual(["d", "c", "b", "a"]);
    expect(rankProducts("leche entera", list).map((p) => p.id)).toEqual(["c", "a"]);
  });
});
