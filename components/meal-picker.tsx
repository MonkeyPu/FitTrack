"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/app-context";
import { DateTimeFields } from "@/components/datetime-fields";
import { Empty } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useMeals } from "@/lib/client/hooks";
import { mealToItems, useSaveEntry } from "@/lib/client/mutations";
import { FormError, parseNum } from "@/lib/client/validate";
import { sumItems } from "@/lib/nutrition";
import { cn, fmt } from "@/lib/utils";
import type { Meal } from "@/lib/types";

const totalsOf = (m: Meal) => sumItems(mealToItems(m).map((i) => ({ qty: i.qty, calories: i.calories, protein: i.protein, nutrients: i.nutrients })));

export function MealPicker() {
  const router = useRouter();
  const { date: selected, today, setDate } = useApp();
  const meals = (useMeals().data ?? []).filter((m) => m.meal_items.length > 0);
  const loading = useMeals().isPending;
  const save = useSaveEntry();
  const [mealId, setMealId] = useState("");
  const [servings, setServings] = useState("1");
  const [error, setError] = useState("");
  const sent = useRef(false);
  const chosen = meals.find((m) => m.id === mealId);
  const s = Number(servings) > 0 ? Number(servings) : 0;

  if (!loading && meals.length === 0) {
    return <Empty title="No saved meals yet">Create a meal from your saved foods, then log it in one tap. <Link href="/library/meals/new" className="text-accent">Create a meal</Link></Empty>;
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!chosen || sent.current) return;
    try {
      const fd = new FormData(e.currentTarget);
      const date = String(fd.get("log_date") ?? "");
      const loggedAt = String(fd.get("logged_at") ?? "");
      if (!date || !loggedAt) throw new FormError("Choose a date and time.");
      const mealServings = parseNum(servings, "servings", { min: 0.01, max: 100, required: true });
      sent.current = true;
      save.mutate({ date, loggedAt, notes: null, items: mealToItems(chosen), comboName: chosen.name, saveToLibrary: false, fromMealId: chosen.id, mealServings });
      setDate(date);
      router.push("/");
    } catch (err) {
      setError(err instanceof FormError ? err.message : "Check your entries and try again.");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div role="radiogroup" aria-label="Saved meals" className="space-y-2">
        {meals.map((m) => {
          const t = totalsOf(m);
          const on = m.id === mealId;
          return (
            <button key={m.id} type="button" role="radio" aria-checked={on} onClick={() => setMealId(m.id)}
              className={cn("flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition", on ? "border-accent bg-accent/10" : "border-line bg-card")}>
              <span className="min-w-0"><span className="block truncate font-medium">{m.name}</span><span className="block text-xs text-muted">{m.meal_items.length} {m.meal_items.length === 1 ? "food" : "foods"}</span></span>
              <span className="num shrink-0 text-right text-sm text-muted">{fmt(t.calories)} kcal<br />{fmt(t.protein, 1)} g protein</span>
            </button>
          );
        })}
      </div>
      {chosen && (<>
        <Field label="Number of servings"><Input type="number" inputMode="decimal" step="any" min="0.01" value={servings} onChange={(e) => setServings(e.target.value)} /></Field>
        <div className="rounded-2xl border border-line bg-card px-4 py-3">
          <p className="text-sm text-muted">Total</p>
          <p className="num text-3xl font-bold">{fmt(totalsOf(chosen).calories * s)} <span className="text-base font-medium text-muted">kcal</span></p>
          <p className="num text-muted">{fmt(totalsOf(chosen).protein * s, 1)} g protein</p>
        </div>
        <DateTimeFields date={selected} today={today} />
      </>)}
      {error && <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      <Button type="submit" className="w-full" disabled={!chosen}>Add to diary</Button>
    </form>
  );
}
