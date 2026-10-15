import { hasTarget } from "./calc";
import { fmt } from "./utils";

export type MomentInput = {
  /** date being viewed and today's date, YYYY-MM-DD in the user's timezone */
  date: string;
  today: string;
  /** current local hour, 0-23 */
  hour: number;
  food: number;
  maxFood: number | null;
  protein: number;
  proteinGoal: number | null;
  yesterday: { date: string; food: number; maxFood: number | null; logged: boolean } | null;
  goalDate: string | null;
  goalText: string | null;
};

export type Moment = { id: string; kind: "over" | "win"; title: string; sub: string };

/**
 * Which full-screen moments to show. Only ever for today's view. Each id is shown once per
 * device (the caller remembers seen ids), so reloading the page doesn't replay them.
 */
export function buildMoments(i: MomentInput): Moment[] {
  if (i.date !== i.today) return [];
  const out: Moment[] = [];

  if (hasTarget(i.maxFood) && i.food > i.maxFood) {
    out.push({ id: `over:${i.date}`, kind: "over", title: "chud", sub: `${fmt(i.food - i.maxFood)} kcal over your limit` });
  }

  const y = i.yesterday;
  if (y && y.logged && hasTarget(y.maxFood) && y.food <= y.maxFood) {
    out.push({ id: `within:${y.date}`, kind: "win", title: "You stayed within your limit", sub: `Yesterday: ${fmt(y.food)} of ${fmt(y.maxFood)} kcal` });
  }

  if (hasTarget(i.proteinGoal) && i.protein >= i.proteinGoal) {
    out.push({ id: `protein:${i.date}`, kind: "win", title: "Protein goal hit", sub: `${fmt(i.protein, 1)} g today` });
  }

  // From 9pm, a day still inside the limit counts as a win.
  if (i.hour >= 21 && i.food > 0 && hasTarget(i.maxFood) && i.food <= i.maxFood) {
    out.push({ id: `within:${i.date}`, kind: "win", title: "You stayed within your limit", sub: `${fmt(i.food)} of ${fmt(i.maxFood)} kcal today` });
  }

  if (i.goalDate && i.goalDate <= i.today) {
    out.push({ id: `goal:${i.goalDate}`, kind: "win", title: "You reached your goal date", sub: i.goalText || "You made it to your target date." });
  }
  return out;
}
