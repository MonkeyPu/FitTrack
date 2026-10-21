"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { useApp } from "@/components/app-context";
import { DateTimeFields } from "@/components/datetime-fields";
import { IngredientSheet } from "@/components/ingredient-sheet";
import { NutrientFields } from "@/components/nutrient-fields";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea, Toggle } from "@/components/ui/field";
import { useSaveEntry, type ItemInput } from "@/lib/client/mutations";
import { FormError, parseNum, parseText } from "@/lib/client/validate";
import { emptyNutrientStrings, NUTRIENT_KEYS, NUTRIENTS, readNutrients, sumItems, toNutrientStrings, type NutrientKey, type NutrientStrings } from "@/lib/nutrition";
import { fmt } from "@/lib/utils";
import type { Food } from "@/lib/types";

export type FormRow = { key: string; food_id: string | null; name: string; serving: string; cal: string; protein: string; qty: string; nutrients: NutrientStrings };

export type EntryInitial = {
  kind: "food" | "meal"; id: string; date: string; time: string; notes: string; comboName: string; rows: FormRow[];
};

/** Where the supermarket catalog page leaves a chosen product for this form to pick up. */
export const PREFILL_KEY = "fx-prefill";

const labels = Object.fromEntries(NUTRIENTS.map((n) => [n.key, n.label]));
const rowFromFood = (f: Food): FormRow => ({
  key: crypto.randomUUID(), food_id: f.id, name: f.name, serving: f.serving_description ?? "", cal: String(f.calories_per_serving),
  protein: String(f.protein_per_serving), qty: "1", nutrients: toNutrientStrings(readNutrients(f as unknown as Record<string, unknown>)),
});
const blankRow = (): FormRow => ({ key: crypto.randomUUID(), food_id: null, name: "", serving: "", cal: "", protein: "", qty: "1", nutrients: emptyNutrientStrings() });

function toItem(r: FormRow, label: string): ItemInput {
  return {
    food_id: r.food_id,
    name: parseText(r.name, `${label} name`, 100, true),
    serving_description: parseText(r.serving, "serving size", 100) || null,
    calories: parseNum(r.cal, `${label} calories`, { max: 10000, required: true }),
    protein: parseNum(r.protein, `${label} protein`, { max: 1000 }),
    nutrients: Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, parseNum(r.nutrients[k], labels[k], { max: 1000 })])) as ItemInput["nutrients"],
    qty: parseNum(r.qty, `${label} amount`, { min: 0.01, max: 100, required: true }),
  };
}

export function FoodForm({ quick, initial }: { quick?: boolean; initial?: EntryInitial }) {
  const router = useRouter();
  const { date: selected, today, setDate } = useApp();
  const save = useSaveEntry();
  const editing = Boolean(initial);

  const [main, setMain] = useState<FormRow>(initial?.rows[0] ?? { ...blankRow(), name: quick ? "Quick add" : "" });
  const [extras, setExtras] = useState<FormRow[]>(initial?.rows.slice(1) ?? []);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [comboName, setComboName] = useState(initial?.comboName ?? "");
  const [comboTouched, setComboTouched] = useState(Boolean(initial?.comboName));
  const [pickingIngredient, setPickingIngredient] = useState(false);
  const [error, setError] = useState("");
  const sent = useRef(false);

  // A product chosen on the supermarket catalog page arrives here ready to log.
  useEffect(() => {
    if (initial || quick) return;
    try {
      const raw = sessionStorage.getItem(PREFILL_KEY);
      if (!raw) return;
      sessionStorage.removeItem(PREFILL_KEY);
      const p = JSON.parse(raw) as { name: string; serving: string; calories: number; protein: number; nutrients: Record<NutrientKey, number> };
      setMain({ ...blankRow(), name: p.name, serving: p.serving, cal: String(p.calories), protein: String(p.protein), nutrients: toNutrientStrings(p.nutrients) });
    } catch { /* ignore a bad or missing value */ }
  }, [initial, quick]);

  const n = (s: string) => (Number.isFinite(Number(s)) && s !== "" ? Number(s) : 0);
  const preview = sumItems([main, ...extras].map((r) => ({ qty: n(r.qty), calories: n(r.cal), protein: n(r.protein), nutrients: Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, n(r.nutrients[k])])) as never })));
  const isCombo = extras.length > 0 || initial?.kind === "meal";
  const autoName = [main.name, ...extras.map((e) => e.name)].filter(Boolean).join(" + ").slice(0, 100);
  const shownCombo = comboTouched ? comboName : autoName;

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sent.current) return;
    setError("");
    try {
      const fd = new FormData(e.currentTarget);
      const date = String(fd.get("log_date") ?? "");
      const loggedAt = String(fd.get("logged_at") ?? "");
      if (!date || !loggedAt) throw new FormError("Choose a date and time.");
      const items = [toItem(main, "food"), ...extras.map((r, i) => toItem(r, `ingredient ${i + 1}`))];
      const name = parseText(shownCombo, "combo name", 100, isCombo);
      sent.current = true;
      save.mutate({
        existing: initial ? { kind: initial.kind, id: initial.id, date: initial.date } : undefined,
        date, loggedAt, notes: parseText(notes, "notes", 500) || null, items, comboName: name, saveToLibrary: !editing && !quick && fd.get("save_ingredient") === "on",
      });
      setDate(date);
      if (editing) (window.history.length > 1 ? router.back() : router.push("/diary"));
      else router.push("/");
    } catch (err) {
      sent.current = false;
      setError(err instanceof FormError ? err.message : "Check your entries and try again.");
    }
  }

  return (
    <>
    <form onSubmit={submit} className="space-y-5" noValidate>
      <Field label="Food name"><Input value={main.name} onChange={(e) => setMain((m) => ({ ...m, name: e.target.value, food_id: null }))} maxLength={100} placeholder="e.g. Greek yoghurt" /></Field>
      {!quick && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Serving size" hint="Optional, e.g. 200 g"><Input value={main.serving} onChange={(e) => setMain((m) => ({ ...m, serving: e.target.value }))} maxLength={100} /></Field>
          <Field label="Number of servings"><Input type="number" inputMode="decimal" step="any" min="0.01" value={main.qty} onChange={(e) => setMain((m) => ({ ...m, qty: e.target.value }))} /></Field>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label={quick ? "Calories" : "Calories per serving"}><Input type="number" inputMode="decimal" step="any" min="0" value={main.cal} onChange={(e) => setMain((m) => ({ ...m, cal: e.target.value, food_id: null }))} placeholder="kcal" /></Field>
        <Field label={quick ? "Protein" : "Protein per serving"}><Input type="number" inputMode="decimal" step="any" min="0" value={main.protein} onChange={(e) => setMain((m) => ({ ...m, protein: e.target.value, food_id: null }))} placeholder="g" /></Field>
      </div>
      {!quick && <NutrientFields values={main.nutrients} onChange={(k: NutrientKey, v) => setMain((m) => ({ ...m, nutrients: { ...m.nutrients, [k]: v } }))} />}

      {!quick && (
        <div className="space-y-3">
          {extras.length > 0 && <p className="text-sm font-medium text-muted">Ingredients</p>}
          {extras.map((r) => (
            <div key={r.key} className="flex items-center gap-2 rounded-xl border border-line bg-card p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{r.name}</p>
                <p className="num truncate text-xs text-muted">{fmt(n(r.cal) * n(r.qty))} kcal · {fmt(n(r.protein) * n(r.qty), 1)} g protein</p>
              </div>
              <span className="shrink-0 text-sm text-muted">×</span>
              <Input aria-label={`Amount of ${r.name}`} type="number" inputMode="decimal" step="any" min="0.01" value={r.qty} onChange={(e) => setExtras((l) => l.map((x) => (x.key === r.key ? { ...x, qty: e.target.value } : x)))} className="h-11 w-16 px-2 text-center" />
              <span className="w-16 shrink-0 truncate text-xs text-muted">{r.serving.replace(/^1\s+/, "") || "unit"}</span>
              <button type="button" aria-label={`Remove ${r.name}`} onClick={() => setExtras((l) => l.filter((x) => x.key !== r.key))} className="flex h-11 w-11 shrink-0 items-center justify-center text-muted hover:text-danger"><X className="h-5 w-5" /></button>
            </div>
          ))}
          <Button type="button" variant="secondary" className="w-full" onClick={() => setPickingIngredient(true)}><Plus className="h-4 w-4" />Add ingredient</Button>
        </div>
      )}

      {isCombo && <Field label="Name for this combination" hint="Shown in your diary"><Input value={shownCombo} onChange={(e) => { setComboTouched(true); setComboName(e.target.value); }} maxLength={100} /></Field>}

      <div className="rounded-2xl border border-line bg-card px-4 py-3">
        <p className="text-sm text-muted">Total</p>
        <p className="num text-3xl font-bold">{fmt(preview.calories)} <span className="text-base font-medium text-muted">kcal</span></p>
        <p className="num text-muted">{fmt(preview.protein, 1)} g protein</p>
      </div>

      <DateTimeFields date={initial?.date ?? selected} today={today} initialTime={initial?.time} />

      {!quick && (
        <details open={Boolean(initial && notes)} className="rounded-xl border border-line bg-card">
          <summary className="flex min-h-12 cursor-pointer items-center px-4 text-sm font-medium">More details <span className="ml-2 font-normal text-muted">notes</span></summary>
          <div className="space-y-3 px-4 pb-4">
            <Field label="Notes"><Textarea rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" /></Field>
          </div>
        </details>
      )}

      {!quick && !editing && (
        <div className="rounded-xl border border-line bg-card px-4">
          <Toggle name="save_ingredient" label="Save to my ingredients" hint="Reuse it later with Add ingredient" />
        </div>
      )}

      {error && <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      <Button type="submit" className="w-full">{editing ? "Save changes" : "Add to diary"}</Button>
    </form>
    {/* Outside the form: a form inside a form made "Save and add" also submit the food being logged. */}
    {pickingIngredient && <IngredientSheet onClose={() => setPickingIngredient(false)} onPick={(f) => { setExtras((l) => [...l, rowFromFood(f)]); setPickingIngredient(false); }} />}
    </>
  );
}
