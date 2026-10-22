/**
 * Single source of truth for every calorie / protein calculation.
 * Dashboard, diary and (later) charts and friend cards all call these functions.
 * Raw values are never rounded here; round only when displaying.
 */

export type Targets = {
  maintenance: number | null;
  maxFood: number | null;
  netTarget: number | null;
  protein: number | null;
};

export type TargetSource = {
  maintenance_calories: number | null;
  max_food_calories: number | null;
  net_calorie_target: number | null;
  protein_goal: number | null;
};

export const targetsOf = (p: TargetSource): Targets => ({
  maintenance: p.maintenance_calories,
  maxFood: p.max_food_calories,
  netTarget: p.net_calorie_target,
  protein: p.protein_goal,
});

import { addNutrients, readTotals, zeroNutrients, type Nutrients } from "./nutrition";

export type FoodLike = { total_calories: number; total_protein: number } & Partial<Record<`total_${keyof Nutrients}`, number>>;
export type ActivityLike = { calories_burned: number };

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export const lineTotal = (servings: number, perServing: number) => servings * perServing;

/** A target of 0, negative or missing is treated as "not set". */
export const hasTarget = (t: number | null | undefined): t is number =>
  typeof t === "number" && Number.isFinite(t) && t > 0;

export const percent = (value: number, target: number | null | undefined): number | null =>
  hasTarget(target) ? (value / target) * 100 : null;

/** target - value. Negative when the target is exceeded. */
export const remaining = (target: number | null | undefined, value: number): number | null =>
  hasTarget(target) ? target - value : null;

/** A net calorie target above maintenance means bulking: the aim is a surplus instead of a deficit. */
export const isBulking = (t: Pick<Targets, "maintenance" | "netTarget">): boolean =>
  hasTarget(t.maintenance) && hasTarget(t.netTarget) && t.netTarget > t.maintenance;

export type Status = "none" | "ok" | "near" | "over";

export function statusOf(pct: number | null): Status {
  if (pct === null) return "none";
  if (pct > 100) return "over";
  if (pct >= 90) return "near";
  return "ok";
}

/**
 * Colour for the net calorie bar. When cutting, going over the target is the warning. When bulking the target is
 * a minimum to reach, so reaching it is fine and only going far past it gets a soft warning.
 */
export function netStatusOf(pct: number | null, bulking: boolean): Status {
  if (!bulking) return statusOf(pct);
  if (pct === null) return "none";
  return pct > 125 ? "near" : "ok";
}

export type DaySummary = {
  foodCalories: number;
  protein: number;
  /** carbs, sugar, added sugar, fat, saturated fat, fiber (grams) */
  nutrients: Nutrients;
  exerciseCalories: number;
  /** food calories minus logged exercise calories */
  net: number;
  /** maintenance minus net calories. Negative means a surplus. Null without a maintenance value. */
  deficit: number | null;
  /** maintenance minus the net calorie target, only when that is a real deficit */
  targetDeficit: number | null;
  /** net calorie target minus maintenance, only when bulking */
  targetSurplus: number | null;
  foodRemaining: number | null;
  netRemaining: number | null;
  proteinRemaining: number | null;
  foodPct: number | null;
  netPct: number | null;
  proteinPct: number | null;
};

export function summarize(
  foodLogs: FoodLike[],
  mealLogs: FoodLike[],
  activityLogs: ActivityLike[],
  targets: Targets,
): DaySummary {
  const entries = [...foodLogs, ...mealLogs];
  const foodCalories = sum(entries.map((e) => e.total_calories));
  const protein = sum(entries.map((e) => e.total_protein));
  const nutrients = entries.reduce((acc, e) => addNutrients(acc, readTotals(e)), zeroNutrients());
  const exerciseCalories = sum(activityLogs.map((a) => a.calories_burned));
  // Exercise is subtracted exactly once, here. It never raises the food maximum.
  const net = foodCalories - exerciseCalories;

  return {
    foodCalories,
    protein,
    nutrients,
    exerciseCalories,
    net,
    deficit: hasTarget(targets.maintenance) ? targets.maintenance - net : null,
    targetDeficit:
      hasTarget(targets.maintenance) && hasTarget(targets.netTarget) && targets.maintenance > targets.netTarget
        ? targets.maintenance - targets.netTarget
        : null,
    targetSurplus: isBulking(targets) ? targets.netTarget! - targets.maintenance! : null,
    foodRemaining: remaining(targets.maxFood, foodCalories),
    netRemaining: remaining(targets.netTarget, net),
    proteinRemaining: remaining(targets.protein, protein),
    foodPct: percent(foodCalories, targets.maxFood),
    netPct: percent(net, targets.netTarget),
    proteinPct: percent(protein, targets.protein),
  };
}

/* ───────────── net calorie bar ───────────── */

/** Room kept left of zero for days when logged exercise is bigger than food (net below 0). */
export const NET_BAR_FLOOR = 500;
/** Where zero sits along the bar, in percent from the left. */
export const NET_BAR_ZERO = 30;

/**
 * Geometry for the net calorie bar. Zero sits NET_BAR_ZERO percent in. Net calories above zero fill
 * to the right, reaching the end at the net target. Net below zero fills left, reaching the edge at -floor.
 */
export function netBar(net: number, target: number | null | undefined, floor = NET_BAR_FLOOR, zero = NET_BAR_ZERO) {
  if (net >= 0) {
    const frac = hasTarget(target) ? Math.min(net / target, 1) : 0;
    return { zero, left: zero, width: frac * (100 - zero), below: false };
  }
  const width = Math.min(-net / floor, 1) * zero;
  return { zero, left: zero - width, width, below: true };
}

/* ───────────── deficit since the goal started ───────────── */

export type GoalDay = { date: string; food: number; exercise: number };

export type GoalDeficit = {
  /** completed days with at least one food entry */
  loggedDays: number;
  food: number;
  exercise: number;
  net: number;
  /** maintenance x loggedDays minus net. Negative means a surplus overall. Null without maintenance. */
  deficit: number | null;
  /** what the daily target deficit adds up to over the same days */
  targetDeficit: number | null;
  /** what the daily target surplus adds up to over the same days, when bulking */
  targetSurplus: number | null;
};

/**
 * Adds up the deficit over past days. Today is left out until it is over, because a half-logged
 * day would look like a huge deficit. Days with no food logged are skipped, not counted as fasting.
 * Uses the current maintenance value for every day.
 */
export function goalDeficit(days: GoalDay[], t: Pick<Targets, "maintenance" | "netTarget">, today: string): GoalDeficit {
  const counted = days.filter((d) => d.date < today && d.food > 0);
  const food = sum(counted.map((d) => d.food));
  const exercise = sum(counted.map((d) => d.exercise));
  const net = food - exercise;
  const loggedDays = counted.length;
  const hasM = hasTarget(t.maintenance);
  return {
    loggedDays,
    food,
    exercise,
    net,
    deficit: hasM ? t.maintenance! * loggedDays - net : null,
    targetDeficit: hasM && hasTarget(t.netTarget) && t.maintenance! > t.netTarget! ? (t.maintenance! - t.netTarget!) * loggedDays : null,
    targetSurplus: isBulking(t) ? (t.netTarget! - t.maintenance!) * loggedDays : null,
  };
}
