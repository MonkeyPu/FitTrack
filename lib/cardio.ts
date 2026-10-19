/**
 * Cardio calorie estimate from the user's body, the activity, how hard it was and for how long.
 *
 * kcal = (MET - 1) x resting kcal per hour x hours
 *
 * - MET values come from the Compendium of Physical Activities (rounded).
 * - Resting kcal per hour is the Mifflin-St Jeor equation (height, weight, age, sex) / 24,
 *   so taller / heavier / younger people burn more, and a 60 kg person burns less than a 90 kg one.
 * - Subtracting 1 MET leaves out the calories you would have burned anyway. Your maintenance
 *   calories already include them, so counting them twice would overstate the deficit.
 *   This matches how watches report "active calories".
 *
 * It is an estimate. Heart-rate watches and machines can be more accurate, so manual entry stays.
 */

export const INTENSITIES = [
  { value: "light", label: "Easy" },
  { value: "moderate", label: "Moderate" },
  { value: "vigorous", label: "Hard" },
] as const;
export type Intensity = (typeof INTENSITIES)[number]["value"];
export const isIntensity = (v: unknown): v is Intensity => INTENSITIES.some((i) => i.value === v);

type Row = Record<Intensity, number>;

/** MET per activity type and intensity. */
export const ACTIVITY_METS: Record<string, Row> = {
  running: { light: 8.3, moderate: 9.8, vigorous: 11.8 },
  walking: { light: 2.8, moderate: 3.5, vigorous: 5.0 },
  cycling: { light: 4.0, moderate: 8.0, vigorous: 12.0 },
  swimming: { light: 5.8, moderate: 7.0, vigorous: 9.8 },
  stair_climbing: { light: 4.0, moderate: 6.0, vigorous: 8.8 },
  other_cardio: { light: 4.0, moderate: 6.0, vigorous: 8.0 },
};

/** Plain-language pace shown under the intensity buttons. */
export const INTENSITY_HINTS: Record<string, Record<Intensity, string>> = {
  running: { light: "Jog, about 8 km/h", moderate: "Steady run, about 10 km/h", vigorous: "Fast run, 12 km/h or more" },
  walking: { light: "Stroll, about 3 km/h", moderate: "Normal walk, about 5 km/h", vigorous: "Brisk or uphill, 6.5 km/h or more" },
  cycling: { light: "Leisurely, under 16 km/h", moderate: "Steady, about 20 km/h", vigorous: "Hard effort, 25 km/h or more" },
  swimming: { light: "Easy lengths", moderate: "Steady laps", vigorous: "Fast laps, hard effort" },
  stair_climbing: { light: "Slow, easy pace", moderate: "Steady pace", vigorous: "Fast, out of breath" },
  other_cardio: { light: "Easy, can chat", moderate: "Steady, breathing hard", vigorous: "Hard, can't chat" },
};

export type BodyStats = {
  weightKg?: number | null;
  heightCm?: number | null;
  age?: number | null;
  sex?: "male" | "female" | string | null;
};

const ok = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n > 0;

export const hasBodyStats = (b: BodyStats) => ok(b.weightKg) && ok(b.heightCm);

/** Resting energy use in kcal per day (Mifflin-St Jeor). Age and sex are optional. */
export function restingKcalPerDay(b: BodyStats): number | null {
  if (!ok(b.weightKg) || !ok(b.heightCm)) return null;
  const age = ok(b.age) ? Math.min(Math.max(b.age, 10), 100) : 30;
  // Without a sex, use the midpoint of the male (+5) and female (-161) constants.
  const s = b.sex === "male" ? 5 : b.sex === "female" ? -161 : -78;
  return 10 * b.weightKg + 6.25 * b.heightCm - 5 * age + s;
}

export function estimateCardioCalories(o: { type: string; intensity: Intensity; minutes: number; body: BodyStats }): number | null {
  const rmr = restingKcalPerDay(o.body);
  if (rmr === null || !Number.isFinite(o.minutes) || o.minutes <= 0) return null;
  const met = (ACTIVITY_METS[o.type] ?? ACTIVITY_METS.other_cardio)[o.intensity];
  return Math.round((met - 1) * (rmr / 24) * (o.minutes / 60));
}
