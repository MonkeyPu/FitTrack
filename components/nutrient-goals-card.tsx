import Link from "next/link";
import { ProgressBar } from "@/components/progress";
import { Card } from "@/components/ui/card";
import { percent, statusOf } from "@/lib/calc";
import { NUTRIENTS, NUTRIENT_GOAL_KIND, type NutrientGoals, type Nutrients } from "@/lib/nutrition";
import { fmt } from "@/lib/utils";

/** Today's progress on the optional extra nutrient goals. Only nutrients with a goal are shown. */
export function NutrientGoalsCard({ nutrients, goals }: { nutrients: Nutrients; goals: NutrientGoals }) {
  const rows = NUTRIENTS.filter((n) => goals[n.key]);
  if (rows.length === 0) return null;
  return (
    <Card className="space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="font-semibold">Nutrient goals</p>
        <Link href="/profile/nutrient-goals" className="text-sm text-accent">Edit</Link>
      </div>
      {rows.map(({ key, label }) => {
        const goal = goals[key]!;
        const value = nutrients[key];
        const pct = percent(value, goal);
        const kind = NUTRIENT_GOAL_KIND[key];
        // Limits turn amber, then red as you reach and pass them. Targets (like fiber) just fill up.
        const status = kind === "max" ? statusOf(pct) : "ok";
        return (
          <div key={key} className="space-y-1">
            <div className="flex items-baseline justify-between text-sm">
              <span>{label}<span className="text-xs text-muted"> · {kind === "max" ? "limit" : "aim for"}</span></span>
              <span className="num text-muted"><span className="font-semibold text-fg">{fmt(value, 1)}</span> / {fmt(goal)} g</span>
            </div>
            <ProgressBar pct={pct} status={status} label={`${label} progress`} />
          </div>
        );
      })}
    </Card>
  );
}
