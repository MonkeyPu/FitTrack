"use client";
import { useActionState, useState } from "react";
import { logMeal } from "@/app/actions/nutrition";
import { DateTimeFields } from "@/components/datetime-fields";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input } from "@/components/ui/field";
import { cn, fmt } from "@/lib/utils";
import type { Meal } from "@/lib/types";

export function MealPicker({ meals, date, today, next }: { meals: Meal[]; date: string; today: string; next?: string }) {
  const [state, action] = useActionState(logMeal, {});
  const [mealId, setMealId] = useState("");
  const [servings, setServings] = useState("1");

  const totals = (m: Meal) => ({
    cal: m.meal_items.reduce((a, i) => a + i.serving_quantity * i.calories_per_serving_snapshot, 0),
    pro: m.meal_items.reduce((a, i) => a + i.serving_quantity * i.protein_per_serving_snapshot, 0),
  });
  const chosen = meals.find((m) => m.id === mealId);
  const s = Number(servings) > 0 ? Number(servings) : 0;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="meal_id" value={mealId} />
      {next && <input type="hidden" name="next" value={next} />}
      <div role="radiogroup" aria-label="Saved meals" className="space-y-2">
        {meals.map((m) => {
          const t = totals(m);
          const on = m.id === mealId;
          return (
            <button key={m.id} type="button" role="radio" aria-checked={on} onClick={() => setMealId(m.id)}
              className={cn("flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition", on ? "border-accent bg-accent/10" : "border-line bg-card")}>
              <span className="min-w-0">
                <span className="block truncate font-medium">{m.name}</span>
                <span className="block text-xs text-muted">{m.meal_items.length} {m.meal_items.length === 1 ? "food" : "foods"}</span>
              </span>
              <span className="num shrink-0 text-right text-sm text-muted">{fmt(t.cal)} kcal<br />{fmt(t.pro, 1)} g protein</span>
            </button>
          );
        })}
      </div>

      {chosen && (
        <>
          <Field label="Number of servings"><Input name="servings" type="number" inputMode="decimal" step="any" min="0.01" value={servings} onChange={(e) => setServings(e.target.value)} required /></Field>
          <div className="rounded-2xl border border-line bg-card px-4 py-3">
            <p className="text-sm text-muted">Total</p>
            <p className="num text-3xl font-bold">{fmt(totals(chosen).cal * s)} <span className="text-base font-medium text-muted">kcal</span></p>
            <p className="num text-muted">{fmt(totals(chosen).pro * s, 1)} g protein</p>
          </div>
          <DateTimeFields date={date} today={today} />
        </>
      )}
      <FormMessage state={state} />
      <SubmitButton className="w-full" disabled={!chosen}>Add to diary</SubmitButton>
    </form>
  );
}
