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

export type FoodLike = { total_calories: number; total_protein: number };
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

export type Status = "none" | "ok" | "near" | "over";

export function statusOf(pct: number | null): Status {
  if (pct === null) return "none";
  if (pct > 100) return "over";
  if (pct >= 90) return "near";
  return "ok";
}

export type DaySummary = {
  foodCalories: number;
  protein: number;
  exerciseCalories: number;
  /** food calories minus logged exercise calories */
  net: number;
  /** maintenance minus net calories. Negative means a surplus. Null without a maintenance value. */
  deficit: number | null;
  /** maintenance minus the net calorie target, only when that is a real deficit */
  targetDeficit: number | null;
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
  const exerciseCalories = sum(activityLogs.map((a) => a.calories_burned));
  // Exercise is subtracted exactly once, here. It never raises the food maximum.
  const net = foodCalories - exerciseCalories;

  return {
    foodCalories,
    protein,
    exerciseCalories,
    net,
    deficit: hasTarget(targets.maintenance) ? targets.maintenance - net : null,
    targetDeficit:
      hasTarget(targets.maintenance) && hasTarget(targets.netTarget) && targets.maintenance > targets.netTarget
        ? targets.maintenance - targets.netTarget
        : null,
    foodRemaining: remaining(targets.maxFood, foodCalories),
    netRemaining: remaining(targets.netTarget, net),
    proteinRemaining: remaining(targets.protein, protein),
    foodPct: percent(foodCalories, targets.maxFood),
    netPct: percent(net, targets.netTarget),
    proteinPct: percent(protein, targets.protein),
  };
}
