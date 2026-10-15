"use client";
import { useActionState, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { saveFoodLog } from "@/app/actions/nutrition";
import { DateTimeFields } from "@/components/datetime-fields";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { fmt } from "@/lib/utils";
import type { Food } from "@/lib/types";

type Initial = { id?: string; food_id?: string | null; name?: string; serving?: string; cal?: number; protein?: number; servings?: number; notes?: string; time?: string };

export function FoodForm({ savedFoods, date, today, next, initial, quick }: {
  savedFoods: Food[]; date: string; today: string; next?: string; initial?: Initial; quick?: boolean;
}) {
  const [state, action] = useActionState(saveFoodLog, {});
  const editing = Boolean(initial?.id);
  const [foodId, setFoodId] = useState(initial?.food_id ?? "");
  const [name, setName] = useState(initial?.name ?? (quick ? "Quick add" : ""));
  const [serving, setServing] = useState(initial?.serving ?? "");
  const [cal, setCal] = useState(initial?.cal !== undefined ? String(initial.cal) : "");
  const [protein, setProtein] = useState(initial?.protein !== undefined ? String(initial.protein) : "");
  const [servings, setServings] = useState(String(initial?.servings ?? 1));
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return savedFoods.filter((f) => !q || f.name.toLowerCase().includes(q)).slice(0, 6);
  }, [query, savedFoods]);

  const pick = (f: Food) => {
    setFoodId(f.id); setName(f.name); setServing(f.serving_description ?? "");
    setCal(String(f.calories_per_serving)); setProtein(String(f.protein_per_serving)); setServings("1"); setQuery("");
  };
  // Typing over a picked food's values makes it a different, one-off entry.
  const edit = (fn: () => void) => { fn(); if (!editing) setFoodId(""); };

  const n = (s: string) => (Number.isFinite(Number(s)) && s !== "" ? Number(s) : 0);
  const totalCal = n(cal) * n(servings);
  const totalPro = n(protein) * n(servings);

  return (
    <form action={action} className="space-y-4">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="food_id" value={foodId} />
      {next && <input type="hidden" name="next" value={next} />}

      {!editing && !quick && savedFoods.length > 0 && (
        <div className="space-y-2">
          <Field label="Search your saved foods">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. chicken" className="pl-10" />
            </div>
          </Field>
          <ul className="overflow-hidden rounded-xl border border-line">
            {matches.length === 0 && <li className="px-4 py-3 text-sm text-muted">No saved food matches. Fill in the details below.</li>}
            {matches.map((f) => (
              <li key={f.id} className="border-b border-line last:border-0">
                <button type="button" onClick={() => pick(f)} className="flex min-h-12 w-full items-center justify-between gap-3 bg-card px-4 py-2 text-left">
                  <span className="min-w-0">
                    <span className="block truncate">{f.name}</span>
                    {f.serving_description && <span className="block truncate text-xs text-muted">{f.serving_description}</span>}
                  </span>
                  <span className="num shrink-0 text-sm text-muted">{fmt(f.calories_per_serving)} kcal · {fmt(f.protein_per_serving, 1)} g</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Field label="Food name"><Input name="name" value={name} onChange={(e) => edit(() => setName(e.target.value))} maxLength={100} required /></Field>
      {!quick && <Field label="Serving size" hint="Optional, e.g. 1 breast (150 g)"><Input name="serving_description" value={serving} onChange={(e) => edit(() => setServing(e.target.value))} maxLength={100} /></Field>}
      {quick && <input type="hidden" name="serving_description" value="" />}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Calories per serving"><Input name="calories_per_serving" type="number" inputMode="decimal" step="any" min="0" value={cal} onChange={(e) => edit(() => setCal(e.target.value))} placeholder="kcal" required /></Field>
        <Field label="Protein per serving"><Input name="protein_per_serving" type="number" inputMode="decimal" step="any" min="0" value={protein} onChange={(e) => edit(() => setProtein(e.target.value))} placeholder="g" /></Field>
      </div>
      {quick ? <input type="hidden" name="servings" value="1" /> : (
        <Field label="Number of servings"><Input name="servings" type="number" inputMode="decimal" step="any" min="0.01" value={servings} onChange={(e) => setServings(e.target.value)} required /></Field>
      )}

      <div className="rounded-2xl border border-line bg-card px-4 py-3">
        <p className="text-sm text-muted">Total</p>
        <p className="num text-3xl font-bold">{fmt(totalCal)} <span className="text-base font-medium text-muted">kcal</span></p>
        <p className="num text-muted">{fmt(totalPro, 1)} g protein</p>
      </div>

      <DateTimeFields date={date} today={today} initialTime={initial?.time} />
      {!quick && <Field label="Notes"><Textarea name="notes" rows={2} maxLength={500} defaultValue={initial?.notes ?? ""} placeholder="Optional" /></Field>}

      {!editing && !foodId && (
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" name="save_to_library" className="h-5 w-5 accent-[rgb(var(--accent))]" />
          <span>Save to my foods for next time</span>
        </label>
      )}

      <FormMessage state={state} />
      <SubmitButton className="w-full">{editing ? "Save changes" : "Add to diary"}</SubmitButton>
    </form>
  );
}
