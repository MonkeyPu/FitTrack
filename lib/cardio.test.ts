import { describe, expect, it } from "vitest";
import { estimateCardioCalories, hasBodyStats, restingKcalPerDay } from "./cardio";

const man = { weightKg: 70, heightCm: 175, age: 30, sex: "male" as const };

describe("restingKcalPerDay", () => {
  it("matches Mifflin-St Jeor for a 70 kg, 175 cm, 30 year old man", () => {
    expect(restingKcalPerDay(man)).toBeCloseTo(1648.75, 2);
  });
  it("needs height and weight", () => {
    expect(restingKcalPerDay({ weightKg: 70 })).toBeNull();
    expect(hasBodyStats({ heightCm: 175 })).toBe(false);
    expect(hasBodyStats(man)).toBe(true);
  });
  it("uses a neutral constant when sex and age are missing", () => {
    expect(restingKcalPerDay({ weightKg: 70, heightCm: 175 })).toBeCloseTo(700 + 1093.75 - 150 - 78, 2);
  });
});

describe("estimateCardioCalories", () => {
  it("30 minutes of steady running", () => {
    // (9.8 - 1) x 1648.75 / 24 x 0.5
    expect(estimateCardioCalories({ type: "running", intensity: "moderate", minutes: 30, body: man })).toBe(302);
  });
  it("scales with time and intensity", () => {
    const a = estimateCardioCalories({ type: "cycling", intensity: "light", minutes: 30, body: man })!;
    const b = estimateCardioCalories({ type: "cycling", intensity: "light", minutes: 60, body: man })!;
    const c = estimateCardioCalories({ type: "cycling", intensity: "vigorous", minutes: 30, body: man })!;
    expect(b).toBeCloseTo(a * 2, -1);
    expect(c).toBeGreaterThan(a);
  });
  it("heavier people burn more", () => {
    const light = estimateCardioCalories({ type: "walking", intensity: "moderate", minutes: 45, body: { ...man, weightKg: 60 } })!;
    const heavy = estimateCardioCalories({ type: "walking", intensity: "moderate", minutes: 45, body: { ...man, weightKg: 95 } })!;
    expect(heavy).toBeGreaterThan(light);
  });
  it("returns null without body stats or time", () => {
    expect(estimateCardioCalories({ type: "running", intensity: "moderate", minutes: 30, body: {} })).toBeNull();
    expect(estimateCardioCalories({ type: "running", intensity: "moderate", minutes: 0, body: man })).toBeNull();
  });
  it("falls back to general cardio for unknown types", () => {
    expect(estimateCardioCalories({ type: "rowing", intensity: "moderate", minutes: 30, body: man })).toBe(
      estimateCardioCalories({ type: "other_cardio", intensity: "moderate", minutes: 30, body: man }),
    );
  });
});
