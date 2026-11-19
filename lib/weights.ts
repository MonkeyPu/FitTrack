/**
 * Calories burned lifting weights, from sets, reps per set and how hard the lifting is.
 *
 * Time: about 3 seconds per rep, plus a rest between sets that gets longer as the weights get heavier.
 * Energy: the Compendium of Physical Activities gives resistance training about 3.5 METs when it is light to
 * moderate and 6 METs when it is vigorous, so light, medium and heavy use 3, 4.5 and 6.
 * Like the cardio estimates, only the calories ABOVE resting are counted: (MET - 1) x weight x hours.
 * Your maintenance calories already include resting use, so counting it again would overstate the deficit.
 * It is a rough figure: it ignores the exercise you do, how much weight you lift and the extra burn after a workout.
 */
export const INTENSITIES = [
  { value: "light", label: "Light", met: 3, restSeconds: 45, hint: "Easy weights, lots of reps left in you" },
  { value: "medium", label: "Medium", met: 4.5, restSeconds: 75, hint: "Hard work, a few reps left at the end" },
  { value: "heavy", label: "Heavy", met: 6, restSeconds: 120, hint: "Close to your limit, with long rests" },
] as const;
export type Intensity = (typeof INTENSITIES)[number]["value"];

export const SECONDS_PER_REP = 3;
export const intensityOf = (v: unknown) => INTENSITIES.find((i) => i.value === v);

const whole = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n > 0;

/** Whole minutes for the session: the reps themselves plus the rests between sets (none after the last set). */
export function weightsMinutes(sets: number, reps: number, intensity: string): number | null {
  const i = intensityOf(intensity);
  if (!i || !whole(sets) || !whole(reps)) return null;
  const seconds = sets * reps * SECONDS_PER_REP + (sets - 1) * i.restSeconds;
  return Math.max(1, Math.ceil(seconds / 60));
}

/** Active kcal for a weights session. `minutes` overrides the worked-out time (for example, if the session ran long). */
export function weightsKcal(o: { sets: number; reps: number; intensity: string; weightKg: number | null | undefined; minutes?: number }): { kcal: number; minutes: number } | null {
  const i = intensityOf(o.intensity);
  const worked = weightsMinutes(o.sets, o.reps, o.intensity);
  if (!i || worked === null) return null;
  if (typeof o.weightKg !== "number" || !Number.isFinite(o.weightKg) || o.weightKg <= 0) return null;
  const minutes = typeof o.minutes === "number" && Number.isFinite(o.minutes) && o.minutes > 0 ? o.minutes : worked;
  return { kcal: Math.round((i.met - 1) * o.weightKg * (minutes / 60)), minutes };
}

/** "3 sets × 10 reps · medium" for the diary. */
export function weightsSummary(a: { sets?: number | null; reps_per_set?: number | null; intensity?: string | null }): string {
  const bits: string[] = [];
  if (a.sets != null && a.reps_per_set != null) bits.push(`${a.sets} ${a.sets === 1 ? "set" : "sets"} × ${a.reps_per_set} ${a.reps_per_set === 1 ? "rep" : "reps"}`);
  if (a.intensity) bits.push(a.intensity);
  return bits.join(" · ");
}
