"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import { saveMeal } from "@/app/actions/nutrition";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Select } from "@/components/ui/field";
import { fmt } from "@/lib/utils";
import type { Food, Meal } from "@/lib/types";

type Row = { key: string; food_id: string | null; name: string; serving_description: string | null; calories_per_serving: number; protein_per_serving: number; serving_quantity: string };

export function MealBuilder({ foods, meal }: { foods: Food[]; meal?: Meal }) {
  const [state, action] = useActionState(saveMeal, {});
  const [name, setName] = useState(meal?.name ?? "");
  const [rows, setRows] = useState<Row[]>(
    meal?.meal_items.map((i) => ({
      key: i.id, food_id: i.food_id, name: i.food_name_snapshot, serving_description: i.serving_description_snapshot,
      calories_per_serving: i.calories_per_serving_snapshot, protein_per_serving: i.protein_per_serving_snapshot, serving_quantity: String(i.serving_quantity),
    })) ?? [],
  );

  const add = (id: string) => {
    const f = foods.find((x) => x.id === id);
    if (!f) return;
    setRows((r) => [...r, { key: crypto.randomUUID(), food_id: f.id, name: f.name, serving_description: f.serving_description, calories_per_serving: f.calories_per_serving, protein_per_serving: f.protein_per_serving, serving_quantity: "1" }]);
  };
  const qty = (r: Row) => (Number(r.serving_quantity) > 0 ? Number(r.serving_quantity) : 0);
  const cal = rows.reduce((a, r) => a + qty(r) * r.calories_per_serving, 0);
  const pro = rows.reduce((a, r) => a + qty(r) * r.protein_per_serving, 0);
  const payload = JSON.stringify(rows.map((r) => ({
    food_id: r.food_id, name: r.name, serving_description: r.serving_description,
    calories_per_serving: r.calories_per_serving, protein_per_serving: r.protein_per_serving, serving_quantity: Number(r.serving_quantity),
  })));

  return (
    <form action={action} className="space-y-4">
      {meal && <input type="hidden" name="id" value={meal.id} />}
      <input type="hidden" name="items" value={payload} />
      <Field label="Meal name"><Input name="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="e.g. Breakfast" required /></Field>

      <div className="space-y-2">
        <p className="text-sm font-medium text-muted">Foods in this meal</p>
        {rows.length === 0 && <p className="rounded-xl border border-dashed border-line px-4 py-4 text-center text-sm text-muted">No foods yet. Add one below.</p>}
        {rows.map((r) => (
          <div key={r.key} className="flex items-center gap-2 rounded-xl border border-line bg-card p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{r.name}</p>
              <p className="num text-xs text-muted">{fmt(r.calories_per_serving)} kcal · {fmt(r.protein_per_serving, 1)} g per {r.serving_description || "serving"}</p>
            </div>
            <Input aria-label={`Servings of ${r.name}`} type="number" inputMode="decimal" step="any" min="0.01" value={r.serving_quantity}
              onChange={(e) => setRows((all) => all.map((x) => (x.key === r.key ? { ...x, serving_quantity: e.target.value } : x)))} className="h-11 w-20 px-2 text-center" />
            <button type="button" aria-label={`Remove ${r.name}`} onClick={() => setRows((all) => all.filter((x) => x.key !== r.key))} className="flex h-11 w-11 items-center justify-center text-muted hover:text-danger"><X className="h-5 w-5" /></button>
          </div>
        ))}
      </div>

      {foods.length > 0 ? (
        <Field label="Add a saved food">
          <Select value="" onChange={(e) => add(e.target.value)}>
            <option value="">Choose a food…</option>
            {foods.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </Select>
        </Field>
      ) : (
        <p className="flex items-center gap-2 rounded-xl bg-card px-4 py-3 text-sm text-muted"><Plus className="h-4 w-4" /> <span>You need saved foods first. <Link href="/library/foods/new" className="text-accent">Save a food</Link></span></p>
      )}

      <div className="rounded-2xl border border-line bg-card px-4 py-3">
        <p className="text-sm text-muted">Meal total</p>
        <p className="num text-3xl font-bold">{fmt(cal)} <span className="text-base font-medium text-muted">kcal</span></p>
        <p className="num text-muted">{fmt(pro, 1)} g protein</p>
      </div>
      <p className="text-sm text-muted">Values are copied into the meal when you save it. Logged meals keep their own copy too.</p>
      <FormMessage state={state} />
      <SubmitButton className="w-full">{meal ? "Save changes" : "Save meal"}</SubmitButton>
    </form>
  );
}
