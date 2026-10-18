import { DateNav } from "@/components/date-nav";
import { DayMoments } from "@/components/day-moments";
import { ProgressBar, ProgressRing, statusText } from "@/components/progress";
import { Card } from "@/components/ui/card";
import { getDay, requireProfile, requireUser, resolveDate } from "@/lib/data";
import { summarize, statusOf, targetsOf } from "@/lib/calc";
import { addDays, daysBetween } from "@/lib/dates";
import { cn, fmt } from "@/lib/utils";

export const metadata = { title: "Home" };

export default async function Home({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const sp = await searchParams;
  const [{ supabase, user }, { date, today }] = await Promise.all([requireUser(), resolveDate(sp.date)]);
  const yDate = addDays(today, -1);
  // Profile and both days load at the same time instead of one after another.
  const [{ profile }, day, yDay] = await Promise.all([
    requireProfile(),
    getDay(supabase, user.id, date),
    date === today ? getDay(supabase, user.id, yDate) : Promise.resolve(null),
  ]);
  const t = targetsOf(profile);
  const s = summarize(day.foods, day.meals, day.activities, t);
  const ys = yDay ? summarize(yDay.foods, yDay.meals, yDay.activities, t) : null;

  const foodStatus = statusOf(s.foodPct);
  // Staying under the net target is the same as keeping at least the target deficit.
  const deficitStatus = statusOf(s.netPct);
  const empty = day.foods.length + day.meals.length + day.activities.length === 0;

  const goalDays = profile.goal_target_date ? daysBetween(today, profile.goal_target_date) : null;
  const goalTotal = profile.goal_start_date && profile.goal_target_date ? daysBetween(profile.goal_start_date, profile.goal_target_date) : null;
  const goalElapsed = goalTotal && profile.goal_start_date ? Math.min(100, Math.max(0, (daysBetween(profile.goal_start_date, today) / goalTotal) * 100)) : null;

  return (
    <>
      <DayMoments
        enabled={profile.preferences?.effects !== false}
        input={{
          date, today, food: s.foodCalories, maxFood: t.maxFood, protein: s.protein, proteinGoal: t.protein,
          yesterday: ys && yDay ? { date: yDate, food: ys.foodCalories, maxFood: t.maxFood, logged: yDay.foods.length + yDay.meals.length > 0 } : null,
          goalDate: profile.goal_target_date, goalText: profile.goal_description,
        }}
      />
      <DateNav basePath="/" date={date} today={today} />
      {day.error && <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{day.error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <Card className="flex flex-col items-center gap-3 px-2 py-5">
          <ProgressRing pct={s.foodPct} status={foodStatus} size={132}>
            <span className={cn("num text-3xl font-bold", statusText[foodStatus])}>{s.foodRemaining === null ? fmt(s.foodCalories) : fmt(Math.abs(s.foodRemaining))}</span>
            <span className="text-xs text-muted">{s.foodRemaining === null ? "eaten" : s.foodRemaining < 0 ? "over max" : "kcal left"}</span>
          </ProgressRing>
          <div className="text-center">
            <p className="text-sm font-semibold">Food</p>
            <p className="num text-xs text-muted">{fmt(s.foodCalories)}{t.maxFood ? ` / ${fmt(t.maxFood)}` : ""} kcal</p>
          </div>
        </Card>
        <Card className="flex flex-col items-center gap-3 px-2 py-5">
          <ProgressRing pct={s.netPct} status={deficitStatus} size={132}>
            <span className={cn("num text-3xl font-bold", statusText[deficitStatus])}>{s.deficit === null ? fmt(s.net) : fmt(Math.abs(s.deficit))}</span>
            <span className="text-xs text-muted">{s.deficit === null ? "net" : s.deficit >= 0 ? "deficit" : "surplus"}</span>
          </ProgressRing>
          <div className="text-center">
            <p className="text-sm font-semibold">Deficit</p>
            <p className="num text-xs text-muted">
              {fmt(s.deficit ?? s.net)} kcal{s.targetDeficit !== null ? ` · target ${fmt(s.targetDeficit)}` : ""}
            </p>
          </div>
        </Card>
      </div>

      <Card className="space-y-2">
        <div className="flex items-baseline justify-between">
          <p className="font-semibold">Protein</p>
          <p className="num text-muted"><span className="text-lg font-semibold text-fg">{fmt(s.protein, 1)}</span>{t.protein ? ` / ${fmt(t.protein)}` : ""} g</p>
        </div>
        <ProgressBar pct={s.proteinPct} status="ok" label="Protein progress" />
        <p className="num text-sm text-muted">
          {s.proteinRemaining === null ? "No protein goal set" : s.proteinRemaining >= 0 ? `Remaining: ${fmt(s.proteinRemaining, 1)} g` : `${fmt(-s.proteinRemaining, 1)} g over your goal`}
          {s.proteinPct !== null && ` · ${fmt(s.proteinPct)}%`}
        </p>
      </Card>

      {empty && (
        <p className="rounded-2xl border border-dashed border-line px-4 py-5 text-center text-sm text-muted">
          Nothing logged {date === today ? "yet today" : "on this day"}. Tap + to add your first entry.
        </p>
      )}

      {(profile.goal_description || goalDays !== null) && (
        <Card className="space-y-2">
          <p className="font-semibold">{profile.goal_description || "Your goal"}</p>
          {profile.goal_personal_target && <p className="text-sm text-muted">{profile.goal_personal_target}</p>}
          {goalDays !== null && (
            <>
              {goalElapsed !== null && <ProgressBar pct={goalElapsed} status="ok" label="Time elapsed toward goal date" />}
              <p className="num text-sm text-muted">
                {goalDays > 0 ? `${goalDays} ${goalDays === 1 ? "day" : "days"} remaining` : goalDays === 0 ? "Target date is today" : "Target date has passed"}
                {goalElapsed !== null && ` · ${fmt(goalElapsed)}% of your time`}
              </p>
            </>
          )}
        </Card>
      )}
      <p className="px-1 text-center text-xs text-muted">Calories and exercise are estimates. They can&apos;t measure body fat.</p>
    </>
  );
}
