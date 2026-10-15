import { ProgressBar } from "@/components/progress";
import { statusOf, summarize } from "@/lib/calc";
import { fmt } from "@/lib/utils";
import type { FriendCardData } from "@/lib/types";

/** Today's progress for a friend. Uses the same summarize() as the dashboard, so numbers always agree. */
export function FriendToday({ c }: { c: FriendCardData }) {
  if (!c.share_summary) {
    return <p className="text-sm text-muted">{c.display_name} hasn&apos;t shared their daily progress.</p>;
  }
  const s = summarize(
    [{ total_calories: c.food_calories ?? 0, total_protein: c.protein ?? 0 }],
    [],
    c.share_exercise ? [{ calories_burned: c.exercise_calories ?? 0 }] : [],
    { maintenance: null, maxFood: c.max_food_calories, netTarget: c.net_calorie_target, protein: c.protein_goal },
  );
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-muted">Food</span>
          <span className="num"><span className="font-semibold">{fmt(s.foodCalories)}</span>{c.max_food_calories ? ` / ${fmt(c.max_food_calories)}` : ""} kcal</span>
        </div>
        <ProgressBar pct={s.foodPct} status={statusOf(s.foodPct)} label={`${c.display_name} food calories`} />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-muted">Protein</span>
          <span className="num"><span className="font-semibold">{fmt(s.protein, 1)}</span>{c.protein_goal ? ` / ${fmt(c.protein_goal)}` : ""} g</span>
        </div>
        <ProgressBar pct={s.proteinPct} status="ok" label={`${c.display_name} protein`} />
      </div>
      {c.share_exercise && (
        <div className="num flex justify-between text-sm">
          <span className="text-muted">Exercise (est.)</span><span>{fmt(s.exerciseCalories)} kcal</span>
        </div>
      )}
      {c.share_exercise && (
        <div className="num flex justify-between text-sm">
          <span className="text-muted">Net</span>
          <span>{fmt(s.net)}{c.net_calorie_target ? ` / ${fmt(c.net_calorie_target)}` : ""} kcal</span>
        </div>
      )}
    </div>
  );
}
