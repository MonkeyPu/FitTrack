import Link from "next/link";
import { DateNav } from "@/components/date-nav";
import { ActivityEntry, FoodEntry, MealEntry } from "@/components/entries";
import { Card, Section } from "@/components/ui/card";
import { getDay, requireProfile, requireUser, resolveDate } from "@/lib/data";
import { summarize, targetsOf } from "@/lib/calc";
import { fmt } from "@/lib/utils";

export const metadata = { title: "Diary" };

export default async function Diary({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const sp = await searchParams;
  const [{ supabase, user }, { date, today, tz }] = await Promise.all([requireUser(), resolveDate(sp.date)]);
  const [{ profile }, day] = await Promise.all([requireProfile(), getDay(supabase, user.id, date)]);
  const s = summarize(day.foods, day.meals, day.activities, targetsOf(profile));
  const q = date === today ? "" : `?date=${date}`;
  const next = `/diary${q}`;
  const addLink = (href: string, label: string) => <Link href={`${href}${q}`} className="flex h-9 items-center text-sm font-medium text-accent">{label}</Link>;

  const stats: [string, string, string][] = [
    ["Eaten", fmt(s.foodCalories), "kcal"],
    ["Protein", fmt(s.protein, 1), "g"],
    ["Exercise (est.)", fmt(s.exerciseCalories), "kcal"],
    ["Deficit", s.deficit === null ? "—" : fmt(s.deficit), "kcal"],
  ];

  return (
    <>
      <DateNav basePath="/diary" date={date} today={today} />
      {day.error && <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{day.error}</p>}
      <Card className="grid grid-cols-4 gap-2 px-3">
        {stats.map(([k, v, u]) => (
          <div key={k} className="text-center">
            <p className="num text-xl font-bold">{v}</p>
            <p className="text-[11px] leading-tight text-muted">{k}<br />{u}</p>
          </div>
        ))}
      </Card>

      <Section title="Food" action={addLink("/add/food", "Add food")}>
        <Card className="px-0 py-1">
          {day.foods.length === 0 ? <p className="px-4 py-4 text-sm text-muted">No food logged.</p> : day.foods.map((l) => <FoodEntry key={l.id} log={l} tz={tz} next={next} />)}
        </Card>
      </Section>
      <Section title="Meals" action={addLink("/add/meal", "Add meal")}>
        <Card className="px-0 py-1">
          {day.meals.length === 0 ? <p className="px-4 py-4 text-sm text-muted">No saved meals logged.</p> : day.meals.map((l) => <MealEntry key={l.id} log={l} tz={tz} />)}
        </Card>
      </Section>
      <Section title="Exercise" action={addLink("/add/cardio", "Add cardio")}>
        <Card className="px-0 py-1">
          {day.activities.length === 0 ? <p className="px-4 py-4 text-sm text-muted">No exercise logged. Calories burned are estimates.</p> : day.activities.map((l) => <ActivityEntry key={l.id} log={l} tz={tz} next={next} />)}
        </Card>
      </Section>
    </>
  );
}
