/**
 * Cardio settings and calorie estimates.
 *
 * Walking and running use the ACSM treadmill equations, which turn speed and incline into oxygen use:
 *   walking: ml O2 per kg per minute = 0.1 x speed + 1.8 x speed x grade
 *   running: ml O2 per kg per minute = 0.2 x speed + 0.9 x speed x grade
 * (speed in metres per minute, grade as a fraction). The constant "+3.5" for resting use is left out,
 * so the result is the ACTIVE calories above rest. Your maintenance calories already include resting
 * use, so counting it again would overstate the deficit. This matches how watches report active calories.
 * Oxygen use becomes energy at about 5 kcal per litre.
 *
 * Cycling uses the Compendium of Physical Activities MET for the average speed (distance / time).
 * It ignores the resistance level, so it is rougher. Other activities are entered by hand.
 */

/** Precor TRM 833 with the P30 console: speed 0.5-25.5 km/h (16 mph), incline 0-15% in 0.5% steps. */
export const TREADMILL = { speedMin: 0.5, speedMax: 25.5, speedStep: 0.1, inclineMin: 0, inclineMax: 15, inclineStep: 0.5 } as const;

export type DistanceUnit = "km" | "m" | "floors";

type NumField = { label: string; unit: string; min: number; max: number; step: number };

export type ActivityConfig = {
  speed?: NumField;
  incline?: NumField;
  resistance?: NumField;
  distance: { label: string; unit: DistanceUnit; unitLabel: string };
  /** how calories can be worked out; null means type them in */
  estimate: "treadmill" | "cycling" | null;
};

export const ACTIVITY_CONFIG: Record<string, ActivityConfig> = {
  walking: {
    speed: { label: "Speed", unit: "km/h", min: TREADMILL.speedMin, max: TREADMILL.speedMax, step: TREADMILL.speedStep },
    incline: { label: "Incline", unit: "%", min: TREADMILL.inclineMin, max: TREADMILL.inclineMax, step: TREADMILL.inclineStep },
    distance: { label: "Distance", unit: "km", unitLabel: "km" }, estimate: "treadmill",
  },
  running: {
    speed: { label: "Speed", unit: "km/h", min: TREADMILL.speedMin, max: TREADMILL.speedMax, step: TREADMILL.speedStep },
    incline: { label: "Incline", unit: "%", min: TREADMILL.inclineMin, max: TREADMILL.inclineMax, step: TREADMILL.inclineStep },
    distance: { label: "Distance", unit: "km", unitLabel: "km" }, estimate: "treadmill",
  },
  cycling: {
    resistance: { label: "Resistance level", unit: "", min: 0, max: 100, step: 0.5 },
    distance: { label: "Distance", unit: "km", unitLabel: "km" }, estimate: "cycling",
  },
  stair_climbing: {
    speed: { label: "Speed", unit: "steps/min", min: 0, max: 300, step: 1 },
    distance: { label: "Floors climbed", unit: "floors", unitLabel: "floors" }, estimate: null,
  },
  swimming: { distance: { label: "Distance", unit: "m", unitLabel: "m" }, estimate: null },
  other_cardio: { distance: { label: "Distance", unit: "km", unitLabel: "km" }, estimate: null },
};

export const configFor = (type: string): ActivityConfig => ACTIVITY_CONFIG[type] ?? ACTIVITY_CONFIG.other_cardio;

const ok = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n > 0;
const r1 = (n: number) => Math.round(n * 10) / 10;

export const hasWeight = (weightKg: unknown): weightKg is number => ok(weightKg);

/** Which equation applies: clearly slow is walking, clearly fast is running, in between follows the activity. */
export function gaitFor(type: string, speedKmh: number): "walking" | "running" {
  if (speedKmh >= 8) return "running";
  if (speedKmh <= 6) return "walking";
  return type === "running" ? "running" : "walking";
}

/** Active kcal for a treadmill session (ACSM equations). */
export function treadmillKcal(o: { type: string; speedKmh: number; inclinePct: number; minutes: number; weightKg: number }): number | null {
  if (!ok(o.speedKmh) || !ok(o.minutes) || !ok(o.weightKg)) return null;
  const incline = Number.isFinite(o.inclinePct) ? Math.min(Math.max(o.inclinePct, 0), TREADMILL.inclineMax) : 0;
  const v = (o.speedKmh * 1000) / 60; // metres per minute
  const grade = incline / 100;
  const vo2 = gaitFor(o.type, o.speedKmh) === "running" ? 0.2 * v + 0.9 * v * grade : 0.1 * v + 1.8 * v * grade;
  return Math.round(((vo2 * o.weightKg) / 1000) * 5 * o.minutes);
}

/** Compendium MET for road or stationary cycling at an average speed (km/h). */
export function cyclingMet(speedKmh: number): number {
  if (speedKmh < 16) return 4.0;
  if (speedKmh < 19.3) return 6.8;
  if (speedKmh < 22.5) return 8.0;
  if (speedKmh < 25.7) return 10.0;
  if (speedKmh < 30.6) return 12.0;
  return 15.8;
}

/** Rough active kcal for cycling from distance and time. The resistance level is not used. */
export function cyclingKcal(o: { distanceKm: number; minutes: number; weightKg: number }): number | null {
  if (!ok(o.distanceKm) || !ok(o.minutes) || !ok(o.weightKg)) return null;
  const met = cyclingMet(o.distanceKm / (o.minutes / 60));
  return Math.round((met - 1) * o.weightKg * (o.minutes / 60));
}

export type CardioEstimate = { kcal: number; method: "treadmill" | "cycling" };

export function estimateCardio(o: { type: string; minutes: number; weightKg: number | null | undefined; speed?: number; incline?: number; distanceKm?: number }): CardioEstimate | null {
  const cfg = configFor(o.type);
  if (!hasWeight(o.weightKg)) return null;
  if (cfg.estimate === "treadmill") {
    const kcal = treadmillKcal({ type: o.type, speedKmh: o.speed ?? 0, inclinePct: o.incline ?? 0, minutes: o.minutes, weightKg: o.weightKg });
    return kcal === null ? null : { kcal, method: "treadmill" };
  }
  if (cfg.estimate === "cycling") {
    const kcal = cyclingKcal({ distanceKm: o.distanceKm ?? 0, minutes: o.minutes, weightKg: o.weightKg });
    return kcal === null ? null : { kcal, method: "cycling" };
  }
  return null;
}

/** Distance covered at a steady treadmill speed, in km. */
export const treadmillDistanceKm = (speedKmh: number, minutes: number) => (ok(speedKmh) && ok(minutes) ? Math.round(((speedKmh * minutes) / 60) * 100) / 100 : 0);

/** One-line summary of a logged activity's settings, e.g. "5.5 km/h · 7.5% incline · 2.75 km". */
export function settingsSummary(a: { activity_type: string; speed: number | null; incline_pct: number | null; resistance: number | null; distance: number | null; distance_unit: string | null }): string {
  const cfg = configFor(a.activity_type);
  const bits: string[] = [];
  if (a.speed != null && cfg.speed) bits.push(`${Number(a.speed)} ${cfg.speed.unit}`);
  if (a.incline_pct != null && cfg.incline) bits.push(`${Number(a.incline_pct)}% incline`);
  if (a.resistance != null && cfg.resistance) bits.push(`resistance ${Number(a.resistance)}`);
  if (a.distance != null) bits.push(`${Number(a.distance)} ${a.distance_unit ?? cfg.distance.unitLabel}`);
  return bits.join(" · ");
}
