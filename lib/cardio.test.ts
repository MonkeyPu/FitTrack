import { describe, expect, it } from "vitest";
import { ACTIVITY_CONFIG, TREADMILL, cyclingKcal, cyclingMet, estimateCardio, gaitFor, settingsSummary, treadmillDistanceKm, treadmillKcal } from "./cardio";

describe("treadmill ranges (Precor TRM 833, P30 console)", () => {
  it("matches the machine", () => {
    expect(TREADMILL).toMatchObject({ speedMin: 0.5, speedMax: 25.5, inclineMin: 0, inclineMax: 15, inclineStep: 0.5 });
    expect(ACTIVITY_CONFIG.walking.incline?.max).toBe(15);
    expect(ACTIVITY_CONFIG.running.speed?.max).toBe(25.5);
  });
});

describe("treadmillKcal (ACSM, active calories above rest)", () => {
  it("running 10 km/h flat for 30 min at 70 kg is about 1 kcal per kg per km", () => {
    const kcal = treadmillKcal({ type: "running", speedKmh: 10, inclinePct: 0, minutes: 30, weightKg: 70 })!;
    expect(kcal).toBe(350);
    expect(kcal / (5 * 70)).toBeCloseTo(1, 1);
  });
  it("walking 5.5 km/h at 5% incline for 30 min at 70 kg", () => {
    expect(treadmillKcal({ type: "walking", speedKmh: 5.5, inclinePct: 5, minutes: 30, weightKg: 70 })).toBe(183);
  });
  it("incline raises the burn, and heavier people burn more", () => {
    const base = { type: "walking", speedKmh: 5, minutes: 30, weightKg: 70 };
    expect(treadmillKcal({ ...base, inclinePct: 10 })!).toBeGreaterThan(treadmillKcal({ ...base, inclinePct: 0 })!);
    expect(treadmillKcal({ ...base, inclinePct: 0, weightKg: 90 })!).toBeGreaterThan(treadmillKcal({ ...base, inclinePct: 0 })!);
  });
  it("picks the equation by speed, and follows the activity in between", () => {
    expect(gaitFor("walking", 9)).toBe("running");
    expect(gaitFor("running", 4)).toBe("walking");
    expect(gaitFor("running", 7)).toBe("running");
    expect(gaitFor("walking", 7)).toBe("walking");
  });
  it("needs speed, time and weight, and clamps incline to the machine's range", () => {
    expect(treadmillKcal({ type: "walking", speedKmh: 0, inclinePct: 0, minutes: 30, weightKg: 70 })).toBeNull();
    expect(treadmillKcal({ type: "walking", speedKmh: 5, inclinePct: 0, minutes: 0, weightKg: 70 })).toBeNull();
    expect(treadmillKcal({ type: "walking", speedKmh: 5, inclinePct: 0, minutes: 30, weightKg: 0 })).toBeNull();
    const at15 = treadmillKcal({ type: "walking", speedKmh: 5, inclinePct: 15, minutes: 30, weightKg: 70 });
    expect(treadmillKcal({ type: "walking", speedKmh: 5, inclinePct: 40, minutes: 30, weightKg: 70 })).toBe(at15);
  });
});

describe("cycling", () => {
  it("uses the MET for the average speed and ignores resistance", () => {
    expect(cyclingMet(12)).toBe(4);
    expect(cyclingMet(20)).toBe(8);
    expect(cyclingKcal({ distanceKm: 10, minutes: 30, weightKg: 70 })).toBe(Math.round((8 - 1) * 70 * 0.5)); // 20 km/h
  });
});

describe("estimateCardio", () => {
  it("only estimates walking, running and cycling, and only with a weight", () => {
    expect(estimateCardio({ type: "running", minutes: 30, weightKg: 70, speed: 10, incline: 0 })).toEqual({ kcal: 350, method: "treadmill" });
    expect(estimateCardio({ type: "cycling", minutes: 30, weightKg: 70, distanceKm: 10 })?.method).toBe("cycling");
    expect(estimateCardio({ type: "swimming", minutes: 30, weightKg: 70 })).toBeNull();
    expect(estimateCardio({ type: "running", minutes: 30, weightKg: null, speed: 10 })).toBeNull();
  });
});

describe("helpers", () => {
  it("works out distance from speed and time", () => {
    expect(treadmillDistanceKm(5.5, 30)).toBe(2.75);
    expect(treadmillDistanceKm(0, 30)).toBe(0);
  });
  it("summarises the settings of a logged activity", () => {
    expect(settingsSummary({ activity_type: "walking", speed: 5.5, incline_pct: 7.5, resistance: null, distance: 2.75, distance_unit: "km" })).toBe("5.5 km/h · 7.5% incline · 2.75 km");
    expect(settingsSummary({ activity_type: "cycling", speed: null, incline_pct: null, resistance: 12, distance: 8, distance_unit: "km" })).toBe("resistance 12 · 8 km");
    expect(settingsSummary({ activity_type: "stair_climbing", speed: 60, incline_pct: null, resistance: null, distance: 20, distance_unit: "floors" })).toBe("60 steps/min · 20 floors");
    expect(settingsSummary({ activity_type: "swimming", speed: null, incline_pct: null, resistance: null, distance: null, distance_unit: null })).toBe("");
  });
});
