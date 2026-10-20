import { describe, expect, it } from "vitest";
import { displayName, imageOf, matchesStore, matchesWords, parseOffProduct, plainWords, scaleProduct } from "./catalog";

const yoghurt = {
  code: "8480000123456", product_name: "Yogur natural", brands: "Hacendado,Mercadona", quantity: "4 x 125 g", serving_size: "125 g", serving_quantity: 125,
  nutriments: { "energy-kcal_100g": 63, proteins_100g: 4.1, carbohydrates_100g: 5, sugars_100g: 5, fat_100g: 3, "saturated-fat_100g": 2, fiber_100g: 0, "added-sugars_100g": 1.5 },
};

describe("parseOffProduct", () => {
  it("reads a Mercadona-style product", () => {
    const p = parseOffProduct(yoghurt)!;
    expect(p.name).toBe("Yogur natural");
    expect(p.brand).toBe("Hacendado");
    expect(p.hasNutrition).toBe(true);
    expect(p.per100.calories).toBe(63);
    expect(p.per100.nutrients.sat_fat).toBe(2);
    expect(p.servingAmount).toBe(125);
    expect(p.unit).toBe("g");
    expect(p.warnings).toEqual([]);
  });
  it("prefers the Spanish name and converts kJ when kcal is missing", () => {
    const p = parseOffProduct({ code: "1", product_name: "Milk", product_name_es: "Leche entera", nutriments: { energy_100g: 272 } })!;
    expect(p.name).toBe("Leche entera");
    expect(p.per100.calories).toBeCloseTo(65, 0);
  });
  it("detects liquids", () => {
    expect(parseOffProduct({ code: "2", product_name: "Zumo", quantity: "1 l", nutriments: { "energy-kcal_100g": 45 } })!.unit).toBe("ml");
    expect(parseOffProduct({ code: "3", product_name: "Arroz", quantity: "1 kg", nutriments: { "energy-kcal_100g": 350 } })!.unit).toBe("g");
  });
  it("flags missing nutrition and suspicious values", () => {
    expect(parseOffProduct({ code: "4", product_name: "Mystery" })!.hasNutrition).toBe(false);
    const bad = parseOffProduct({ code: "5", product_name: "Odd", nutriments: { "energy-kcal_100g": 1200, proteins_100g: 60, carbohydrates_100g: 60, fat_100g: 30 } })!;
    expect(bad.warnings.length).toBe(2);
  });
  it("skips products without a name or barcode", () => {
    expect(parseOffProduct({ code: "6" })).toBeNull();
    expect(parseOffProduct({ product_name: "No code" })).toBeNull();
  });
});

describe("scaleProduct", () => {
  it("scales per-100 values to the chosen amount", () => {
    const s = scaleProduct(parseOffProduct(yoghurt)!, 125);
    expect(s.calories).toBeCloseTo(78.75, 2);
    expect(s.protein).toBeCloseTo(5.13, 2);
    expect(s.nutrients.sugar).toBeCloseTo(6.25, 2);
  });
  it("adds the brand to the name only when it isn't already there", () => {
    expect(displayName(parseOffProduct(yoghurt)!)).toBe("Yogur natural (Hacendado)");
    expect(displayName(parseOffProduct({ code: "7", product_name: "Hacendado Atún", brands: "Hacendado" })!)).toBe("Hacendado Atún");
  });
});

describe("typed text", () => {
  it("reduces typed text to plain words", () => {
    expect(plainWords("  Yogur  NATURAL!! ")).toBe("yogur natural");
    expect(plainWords("stores_tags:mercadona OR x")).toBe("stores tags mercadona or x");
    expect(plainWords("mac & cheese")).toBe("mac and cheese");
    expect(plainWords("*?")).toBe("");
  });
  it("matches typed words against the start of words in the name or brand", () => {
    expect(matchesWords("yogur nat", "Yogur natural", "Hacendado")).toBe(true);
    expect(matchesWords("hacendado yogur", "Yogur natural", "Hacendado")).toBe(true);
    expect(matchesWords("yogures", "Yogur natural", null)).toBe(true);
    expect(matchesWords("leche", "Yogur natural", "Hacendado")).toBe(false);
    expect(matchesWords("ham", "Champagne", null)).toBe(false);
    expect(matchesWords("cookies", "Cooking chocolate", null)).toBe(false);
    expect(matchesWords("pure", "Puré de patata", null)).toBe(true);
  });
});

describe("images and stores", () => {
  const base = { code: "8480000123456", product_name: "Yogur", nutriments: { "energy-kcal_100g": 60 } };
  it("uses a ready-made image address when there is one", () => {
    expect(parseOffProduct({ ...base, image_front_small_url: "https://images.openfoodfacts.org/images/products/848/000/012/3456/front_es.4.200.jpg" })!.image).toContain("front_es.4.200.jpg");
  });
  it("reads selected_images and builds an address from image data", () => {
    expect(imageOf({ selected_images: { front: { small: { es: "https://x.test/a.jpg" } } } }, "1")).toBe("https://x.test/a.jpg");
    expect(imageOf({ images: { front_es: { rev: "7" }, "1": { uploaded_t: 1 } } }, "8480000123456")).toBe("https://images.openfoodfacts.org/images/products/848/000/012/3456/front_es.7.200.jpg");
    expect(imageOf({}, "8480000123456")).toBeNull();
    expect(imageOf({ image_url: "http://insecure.test/a.jpg" }, "1")).toBeNull();
  });
  it("accepts brand lists, language objects and drops obsolete products", () => {
    const p = parseOffProduct({ ...base, product_name: { es: "Yogur griego", en: "Greek yogurt" }, brands: ["Hacendado", "Mercadona"] })!;
    expect(p.name).toBe("Yogur griego");
    expect(p.brand).toBe("Hacendado");
    expect(parseOffProduct({ ...base, obsolete: true })).toBeNull();
    expect(parseOffProduct({ ...base, obsolete: "on" })).toBeNull();
  });
  it("knows which products belong to a store", () => {
    const hacendado = parseOffProduct({ ...base, brands: "Hacendado" })!;
    const tagged = parseOffProduct({ ...base, stores_tags: ["lidl", "dia"], countries_tags: ["en:spain"] })!;
    expect(matchesStore(hacendado, "mercadona")).toBe(true);
    expect(matchesStore(hacendado, "lidl")).toBe(false);
    expect(matchesStore(tagged, "dia")).toBe(true);
    expect(matchesStore(tagged, "mercadona")).toBe(false);
    expect(matchesStore(tagged, "spain")).toBe(true);
  });
});
