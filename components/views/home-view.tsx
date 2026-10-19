"use client";
import { useApp } from "@/components/app-context";
import { DayMoments } from "@/components/day-moments";
import { GoalDeficitCard } from "@/components/goal-deficit-card";
import { NutrientGoalsCard } from "@/components/nutrient-goals-card";
import { NetBar, ProgressBar, ProgressRing, statusText } from "@/components/progress";
import { PageSkeleton } from "@/components/skeleton";
import { Card } from "@/components/ui/card";
import { useDay } from "@/lib/client/hooks";
import { hasTarget, summarize, statusOf, targetsOf } from "@/lib/calc";
import { addDays, daysBetween } from "@/lib/dates";
import { parseNutrientGoals } from "@/lib/nutrition";
import { cn, fmt } from "@/lib/utils";

export function HomeView() {
  const { profile, date, today, ready } = useApp();
  const day = useDay(date);
  const yDate = addDays(today || date, -1);
  const yDay = useDay(yDate, ready && date === today);
  if (!ready || !day.data) {
    if (day.isError) return <p role="alert" className="rounded-xl bg-danger/10 px-3 py-3 text-sm text-danger">Couldn&apos;t load this day. Check your connection.</p>;
    return <PageSkeleton />;
  }

  const t = targetsOf(profile);
  const s = summarize(day.data.foods, day.data.meals, day.data.activities, t);
  const ys = yDay.data ? summarize(yDay.data.foods, yDay.data.meals, yDay.data.activities, t) : null;
  const foodStatus = statusOf(s.foodPct);
  // Staying under the net target is the same as keeping at least the target deficit.
  const deficitStatus = statusOf(s.netPct);
  const empty = day.data.foods.length + day.data.meals.length + day.data.activities.length === 0;
  const goals = parseNutrientGoals(profile.nutrient_goals);
  // Nutrients with a goal get their own progress card, so the quick totals only list the rest.
  const macros = ([["Carbs", "carbs"], ["Sugar", "sugar"], ["Fat", "fat"], ["Fiber", "fiber"]] as const)
    .filter(([, k]) => !goals[k])
    .map(([label, k]) => [label, s.nutrients[k]] as const);

  const goalDays = profile.goal_target_date ? daysBetween(today, profile.goal_target_date) : null;
  const goalTotal = profile.goal_start_date && profile.goal_target_date ? daysBetween(profile.goal_start_date, profile.goal_target_date) : null;
  const goalElapsed = goalTotal && profile.goal_start_date ? Math.min(100, Math.max(0, (daysBetween(profile.goal_start_date, today) / goalTotal) * 100)) : null;

  return (
    <>
      <DayMoments
        enabled={profile.preferences?.effects !== false}
        input={{
          date, today, food: s.foodCalories, maxFood: t.maxFood, protein: s.protein, proteinGoal: t.protein,
          yesterday: ys && yDay.data ? { date: yDate, food: ys.foodCalories, maxFood: t.maxFood, logged: yDay.data.foods.length + yDay.data.meals.length > 0 } : null,
          goalDate: profile.goal_target_date, goalText: profile.goal_description,
        }}
      />
      <div className="grid grid-cols-2 gap-3">
        <Card className="flex flex-col items-center gap-3 px-2 py-5">
          <ProgressRing pct={s.foodPct} status={foodStatus} size={132}>
            <span className={cn("num text-3xl font-bold", statusText[foodStatus])}>{s.foodRemaining === null ? fmt(s.foodCalories) : fmt(Math.abs(s.foodRemaining))}</span>
            <span className="text-xs text-muted">{s.foodRemaining === null ? "eaten" : s.foodRemaining < 0 ? "over max" : "kcal left"}</span>
          </ProgressRing>
          <div className="text-center"><p className="text-sm font-semibold">Food</p><p className="num text-xs text-muted">{fmt(s.foodCalories)}{t.maxFood ? ` / ${fmt(t.maxFood)}` : ""} kcal</p></div>
        </Card>
        <Card className="flex flex-col items-center gap-3 px-2 py-5">
          <ProgressRing pct={s.proteinPct} status="ok" size={132}>
            <span className="num text-3xl font-bold">{s.proteinRemaining === null ? fmt(s.protein, 1) : fmt(Math.abs(s.proteinRemaining), 1)}</span>
            <span className="text-xs text-muted">{s.proteinRemaining === null ? "g eaten" : s.proteinRemaining < 0 ? "g over goal" : "g left"}</span>
          </ProgressRing>
          <div className="text-center"><p className="text-sm font-semibold">Protein</p><p className="num text-xs text-muted">{fmt(s.protein, 1)}{t.protein ? ` / ${fmt(t.protein)}` : ""} g</p></div>
        </Card>
      </div>

      <Card className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-semibold">{s.deficit === null || s.deficit >= 0 ? "Deficit" : "Surplus"}</p>
          <p className="num text-muted"><span className={cn("text-lg font-semibold", statusText[deficitStatus])}>{fmt(Math.abs(s.deficit ?? s.net))}</span> kcal{s.targetDeficit !== null ? ` · target ${fmt(s.targetDeficit)}` : ""}</p>
        </div>
        <NetBar net={s.net} target={hasTarget(t.netTarget) ? t.netTarget : null} status={deficitStatus} label="Net calories against your target" />
        <p className="num text-sm text-muted">
          Net {fmt(s.net)} kcal{s.net < 0 ? " (exercise is more than food)" : ""}
          {s.netRemaining !== null && ` · ${s.netRemaining >= 0 ? `${fmt(s.netRemaining)} to target` : `${fmt(-s.netRemaining)} over target`}`}
        </p>
      </Card>

      <NutrientGoalsCard nutrients={s.nutrients} goals={goals} />

      {macros.some(([, v]) => v > 0) && (
        <Card className="flex justify-around gap-2 px-3">
          {macros.map(([k, v]) => (<div key={k} className="text-center"><p className="num text-lg font-bold">{fmt(v, 1)}<span className="text-xs font-normal text-muted"> g</span></p><p className="text-xs text-muted">{k}</p></div>))}
        </Card>
      )}

      {empty && <p className="rounded-2xl border border-dashed border-line px-4 py-5 text-center text-sm text-muted">Nothing logged {date === today ? "yet today" : "on this day"}. Tap + to add your first entry.</p>}

      {(profile.goal_description || goalDays !== null) && (
        <Card className="space-y-2">
          <p className="font-semibold">{profile.goal_description || "Your goal"}</p>
          {profile.goal_personal_target && <p className="text-sm text-muted">{profile.goal_personal_target}</p>}
          {goalDays !== null && (<>
            {goalElapsed !== null && <ProgressBar pct={goalElapsed} status="ok" label="Time elapsed toward goal date" />}
            <p className="num text-sm text-muted">
              {goalDays > 0 ? `${goalDays} ${goalDays === 1 ? "day" : "days"} remaining` : goalDays === 0 ? "Target date is today" : "Target date has passed"}
              {goalElapsed !== null && ` · ${fmt(goalElapsed)}% of your time`}
            </p>
          </>)}
        </Card>
      )}
      <GoalDeficitCard start={profile.goal_start_date} today={today} targets={t} />
      <p className="px-1 text-center text-xs text-muted">Calories and exercise are estimates. They can&apos;t measure body fat.</p>
    </>
  );
}
