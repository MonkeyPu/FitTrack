"use client";
import Link from "next/link";
import { useApp } from "@/components/app-context";
import { ActivityEntry, FoodEntry, MealEntry } from "@/components/entries";
import { PageSkeleton } from "@/components/skeleton";
import { Card, Section } from "@/components/ui/card";
import { useDay } from "@/lib/client/hooks";
import { summarize, targetsOf } from "@/lib/calc";
import { NUTRIENTS } from "@/lib/nutrition";
import { fmt } from "@/lib/utils";

const add = (href: string, label: string) => <Link href={href} className="flex h-9 items-center text-sm font-medium text-accent">{label}</Link>;

export function DiaryView() {
  const { profile, date, ready, tz } = useApp();
  const day = useDay(date);
  if (!ready || !day.data) {
    if (day.isError) return <p role="alert" className="rounded-xl bg-danger/10 px-3 py-3 text-sm text-danger">Couldn&apos;t load this day. Check your connection.</p>;
    return <PageSkeleton />;
  }
  const s = summarize(day.data.foods, day.data.meals, day.data.activities, targetsOf(profile));
  const stats: [string, string, string][] = [
    ["Eaten", fmt(s.foodCalories), "kcal"], ["Protein", fmt(s.protein, 1), "g"],
    ["Exercise (est.)", fmt(s.exerciseCalories), "kcal"], ["Deficit", s.deficit === null ? "—" : fmt(s.deficit), "kcal"],
  ];
  const hasNutrients = NUTRIENTS.some((n) => s.nutrients[n.key] > 0);

  return (
    <>
      <Card className="grid grid-cols-4 gap-2 px-3">
        {stats.map(([k, v, u]) => (<div key={k} className="text-center"><p className="num text-xl font-bold">{v}</p><p className="text-[11px] leading-tight text-muted">{k}<br />{u}</p></div>))}
      </Card>
      {hasNutrients && (
        <Card className="grid grid-cols-3 gap-x-2 gap-y-3 px-3">
          {NUTRIENTS.map((n) => (<div key={n.key} className="text-center"><p className="num text-lg font-bold">{fmt(s.nutrients[n.key], 1)}<span className="text-xs font-normal text-muted"> g</span></p><p className="text-xs text-muted">{n.label}</p></div>))}
        </Card>
      )}
      <Section title="Food" action={add("/add/food", "Add food")}>
        <Card className="px-0 py-1">{day.data.foods.length === 0 ? <p className="px-4 py-4 text-sm text-muted">No food logged.</p> : day.data.foods.map((l) => <FoodEntry key={l.id} log={l} tz={tz} />)}</Card>
      </Section>
      <Section title="Meals" action={add("/add/meal", "Add meal")}>
        <Card className="px-0 py-1">{day.data.meals.length === 0 ? <p className="px-4 py-4 text-sm text-muted">No meals or combinations logged.</p> : day.data.meals.map((l) => <MealEntry key={l.id} log={l} tz={tz} />)}</Card>
      </Section>
      <Section title="Exercise" action={add("/add/cardio", "Add cardio")}>
        <Card className="px-0 py-1">{day.data.activities.length === 0 ? <p className="px-4 py-4 text-sm text-muted">No exercise logged. Calories burned are estimates.</p> : day.data.activities.map((l) => <ActivityEntry key={l.id} log={l} tz={tz} />)}</Card>
      </Section>
    </>
  );
}
