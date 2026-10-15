import { addDays } from "./dates";
import type { DayTotals } from "./types";

/** The n dates ending at `end`, oldest first. */
export function rangeDates(end: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addDays(end, i - (n - 1)));
}

type FoodRow = { log_date: string; total_calories: number; total_protein: number };
type ActivityRow = { log_date: string; calories_burned: number };

/** Daily totals from raw log rows. Days with no entries are simply absent. */
export function groupDaily(foods: FoodRow[], meals: FoodRow[], activities: ActivityRow[]): Map<string, DayTotals> {
  const out = new Map<string, DayTotals>();
  const day = (date: string) => {
    let d = out.get(date);
    if (!d) out.set(date, (d = { date, food: 0, protein: 0, exercise: 0 }));
    return d;
  };
  for (const r of [...foods, ...meals]) {
    const d = day(r.log_date);
    d.food += Number(r.total_calories);
    d.protein += Number(r.total_protein);
  }
  for (const a of activities) day(a.log_date).exercise! += Number(a.calories_burned);
  return out;
}

/** Average over the days that have a value. Null when there are none. */
export function average(xs: (number | null | undefined)[]): number | null {
  const v = xs.filter((x): x is number => typeof x === "number");
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}
