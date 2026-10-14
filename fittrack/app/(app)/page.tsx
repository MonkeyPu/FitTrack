import Link from "next/link";
import { BookOpen, BookmarkPlus, Dumbbell, PenLine, Utensils } from "lucide-react";
import { DateNav } from "@/components/date-nav";
import { ProgressBar, ProgressRing, statusText } from "@/components/progress";
import { Card, Section } from "@/components/ui/card";
import { getDay, requireProfile, resolveDate } from "@/lib/data";
import { summarize, statusOf, targetsOf } from "@/lib/calc";
import { daysBetween } from "@/lib/dates";
import { cn, fmt } from "@/lib/utils";

export const metadata = { title: "Home" };

export default async function Home({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const sp = await searchParams;
  const { supabase, user, profile } = await requireProfile();
  const { date, today } = await resolveDate(sp.date);
  const day = await getDay(supabase, user.id, date);
  const t = targetsOf(profile);
  const s = summarize(day.foods, day.meals, day.activities, t);
  const q = date === today ? "" : `?date=${date}`;

  const foodStatus = statusOf(s.foodPct);
  const netStatus = statusOf(s.netPct);
  const empty = day.foods.length + day.meals.length + day.activities.length === 0;

  const goalDays = profile.goal_target_date ? daysBetween(today, profile.goal_target_date) : null;
  const goalTotal = profile.goal_start_date && profile.goal_target_date ? daysBetween(profile.goal_start_date, profile.goal_target_date) : null;
  const goalElapsed = goalTotal && profile.goal_start_date ? Math.min(100, Math.max(0, (daysBetween(profile.goal_start_date, today) / goalTotal) * 100)) : null;

  const rows: [string, string, string?][] = [
    ["Maintenance", t.maintenance ? `${fmt(t.maintenance)} kcal` : "Not set"],
    ["Maximum food calories", t.maxFood ? `${fmt(t.maxFood)} kcal` : "Not set"],
    ["Consumed", `${fmt(s.foodCalories)} kcal`],
    ["Exercise burned (estimate)", `${fmt(s.exerciseCalories)} kcal`],
    ["Net calories", `${fmt(s.net)} kcal`],
    ["Net calorie target", t.netTarget ? `${fmt(t.netTarget)} kcal` : "Not set"],
    ["Net remaining to target", s.netRemaining === null ? "Not set" : `${fmt(s.netRemaining)} kcal`, s.netRemaining !== null && s.netRemaining < 0 ? "text-danger" : undefined],
  ];

  return (
    <>
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
          <ProgressRing pct={s.netPct} status={netStatus} size={132}>
            <span className={cn("num text-3xl font-bold", statusText[netStatus])}>{s.netRemaining === null ? fmt(s.net) : fmt(Math.abs(s.netRemaining))}</span>
            <span className="text-xs text-muted">{s.netRemaining === null ? "net" : s.netRemaining < 0 ? "over target" : "to target"}</span>
          </ProgressRing>
          <div className="text-center">
            <p className="text-sm font-semibold">Net</p>
            <p className="num text-xs text-muted">{fmt(s.net)}{t.netTarget ? ` / ${fmt(t.netTarget)}` : ""} kcal</p>
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

      <Card className="divide-y divide-line py-1">
        {rows.map(([k, val, cls]) => (
          <div key={k} className="flex items-center justify-between py-2.5 text-[15px]">
            <span className="text-muted">{k}</span>
            <span className={cn("num font-medium", cls)}>{val}</span>
          </div>
        ))}
      </Card>

      <Section title="Quick actions">
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: `/add/food${q}`, label: "Log food", icon: Utensils },
            { href: `/add/meal${q}`, label: "Add saved meal", icon: BookmarkPlus },
            { href: `/add/cardio${q}`, label: "Log cardio", icon: Dumbbell },
            { href: `/add/food?quick=1${q ? `&date=${date}` : ""}`, label: "Add calories", icon: PenLine },
          ].map(({ href, label, icon: Icon }) => (
            <Link key={label} href={href} className="flex min-h-14 items-center gap-3 rounded-2xl border border-line bg-card px-4 font-medium transition active:scale-[0.98]">
              <Icon className="h-5 w-5 text-accent" />{label}
            </Link>
          ))}
          <Link href={`/diary${q}`} className="col-span-2 flex min-h-14 items-center gap-3 rounded-2xl border border-line bg-card px-4 font-medium transition active:scale-[0.98]">
            <BookOpen className="h-5 w-5 text-accent" />View today&apos;s diary
          </Link>
        </div>
      </Section>

      {empty && (
        <p className="rounded-2xl border border-dashed border-line px-4 py-5 text-center text-sm text-muted">
          Nothing logged {date === today ? "yet today" : "on this day"}. Tap Log food to add your first entry.
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
