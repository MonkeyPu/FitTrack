import Link from "next/link";
import { ProgressRing, statusText } from "@/components/progress";
import { Card } from "@/components/ui/card";
import { percent, statusOf } from "@/lib/calc";
import { NUTRIENTS, NUTRIENT_GOAL_KIND, type NutrientGoals, type Nutrients } from "@/lib/nutrition";
import { cn, fmt } from "@/lib/utils";

const SHORT: Record<string, string> = { carbs: "Carbs", sugar: "Sugar", added_sugar: "Added sugar", fat: "Fat", sat_fat: "Sat. fat", fiber: "Fiber" };

/**
 * Today's carbs, sugar, added sugar, fat, saturated fat and fiber as six small rings.
 * A ring fills toward the goal when one is set (limits turn amber, then red; fiber just fills).
 * Without a goal the ring stays empty and only shows the amount.
 */
export function NutrientGoalsCard({ nutrients, goals }: { nutrients: Nutrients; goals: NutrientGoals }) {
  return (
    <Link href="/profile/targets" aria-label="Today's nutrients. Tap to set goals" className="block">
      <Card className="px-2 py-4">
        <div className="grid grid-cols-6 gap-1">
          {NUTRIENTS.map(({ key }) => {
            const goal = goals[key];
            const value = nutrients[key];
            const pct = goal ? percent(value, goal) : null;
            const status = goal && NUTRIENT_GOAL_KIND[key] === "max" ? statusOf(pct) : "ok";
            return (
              <div key={key} className="flex min-w-0 flex-col items-center gap-1.5 text-center">
                <ProgressRing pct={pct} status={pct === null ? "none" : status} size={44} thickness={5}>
                  <span className={cn("num text-[11px] font-bold leading-none", pct === null ? "text-fg" : statusText[status])}>{fmt(value, value < 10 ? 1 : 0)}</span>
                </ProgressRing>
                <span className="text-[10px] leading-tight text-muted">{SHORT[key]}</span>
                <span className="num -mt-1 h-3 text-[10px] leading-none text-muted">{goal ? `/ ${fmt(goal)}` : ""}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </Link>
  );
}
