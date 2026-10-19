"use client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Store, X } from "lucide-react";
import { useApp } from "@/components/app-context";
import { CatalogPicker } from "@/components/catalog-picker";
import { DateTimeFields } from "@/components/datetime-fields";
import { NutrientFields } from "@/components/nutrient-fields";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useFoods } from "@/lib/client/hooks";
import { useSaveEntry, type ItemInput } from "@/lib/client/mutations";
import { FormError, parseNum, parseText } from "@/lib/client/validate";
import { emptyNutrientStrings, NUTRIENT_KEYS, NUTRIENTS, readNutrients, sumItems, toNutrientStrings, type NutrientKey, type NutrientStrings } from "@/lib/nutrition";
import { fmt } from "@/lib/utils";
import type { PickedFood } from "@/lib/catalog";
import type { Food } from "@/lib/types";

export type FormRow = { key: string; food_id: string | null; name: string; serving: string; cal: string; protein: string; qty: string; nutrients: NutrientStrings };

export type EntryInitial = {
  kind: "food" | "meal"; id: string; date: string; time: string; notes: string; comboName: string; rows: FormRow[];
};

const labels = Object.fromEntries(NUTRIENTS.map((n) => [n.key, n.label]));
const rowFromFood = (f: Food): FormRow => ({
  key: crypto.randomUUID(), food_id: f.id, name: f.name, serving: f.serving_description ?? "", cal: String(f.calories_per_serving),
  protein: String(f.protein_per_serving), qty: "1", nutrients: toNutrientStrings(readNutrients(f as unknown as Record<string, unknown>)),
});
const rowFromPicked = (p: PickedFood): FormRow => ({
  key: crypto.randomUUID(), food_id: null, name: p.name, serving: p.serving, cal: String(p.calories), protein: String(p.protein), qty: "1", nutrients: toNutrientStrings(p.nutrients),
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
    qty: parseNum(r.qty, `${label} servings`, { min: 0.01, max: 100, required: true }),
  };
}

export function FoodForm({ quick, initial }: { quick?: boolean; initial?: EntryInitial }) {
  const router = useRouter();
  const { date: selected, today, setDate } = useApp();
  const foods = useFoods().data ?? [];
  const save = useSaveEntry();
  const editing = Boolean(initial);

  const [main, setMain] = useState<FormRow>(initial?.rows[0] ?? { ...blankRow(), name: quick ? "Quick add" : "" });
  const [extras, setExtras] = useState<FormRow[]>(initial?.rows.slice(1) ?? []);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [comboName, setComboName] = useState(initial?.comboName ?? "");
  const [comboTouched, setComboTouched] = useState(Boolean(initial?.comboName));
  const [saveToLibrary, setSaveToLibrary] = useState(false);
  const [query, setQuery] = useState("");
  const [catalogFor, setCatalogFor] = useState<"main" | "extra" | null>(null);
  const [error, setError] = useState("");
  const sent = useRef(false);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return foods.filter((f) => !q || f.name.toLowerCase().includes(q)).slice(0, 6);
  }, [query, foods]);

  const setM = (patch: Partial<FormRow>) => setMain((m) => ({ ...m, ...patch, ...(editing ? {} : "name" in patch || "cal" in patch || "protein" in patch || "serving" in patch ? { food_id: null } : {}) }));
  const patchExtra = (key: string, patch: Partial<FormRow>) => setExtras((l) => l.map((r) => (r.key === key ? { ...r, ...patch } : r)));

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
        date, loggedAt, notes: parseText(notes, "notes", 500) || null, items, comboName: name,
        saveToLibrary: saveToLibrary && !editing && !main.food_id,
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
    <form onSubmit={submit} className="space-y-4" noValidate>
      {!editing && !quick && foods.length > 0 && (
        <div className="space-y-2">
          <Field label="Search your saved foods">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. yoghurt" className="pl-10" />
            </div>
          </Field>
          {query.trim() !== "" && (
            <ul className="overflow-hidden rounded-xl border border-line">
              {matches.length === 0 && <li className="px-4 py-3 text-sm text-muted">No saved food matches. Fill in the details below.</li>}
              {matches.map((f) => (
                <li key={f.id} className="border-b border-line last:border-0">
                  <button type="button" onClick={() => { setMain(rowFromFood(f)); setQuery(""); }} className="flex min-h-12 w-full items-center justify-between gap-3 bg-card px-4 py-2 text-left">
                    <span className="min-w-0"><span className="block truncate">{f.name}</span>{f.serving_description && <span className="block truncate text-xs text-muted">{f.serving_description}</span>}</span>
                    <span className="num shrink-0 text-sm text-muted">{fmt(f.calories_per_serving)} kcal · {fmt(f.protein_per_serving, 1)} g</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!quick && (
        <Button type="button" variant="secondary" className="w-full" onClick={() => setCatalogFor("main")}><Store className="h-4 w-4" />Search supermarket catalog</Button>
      )}

      <Field label="Food name"><Input value={main.name} onChange={(e) => setM({ name: e.target.value })} maxLength={100} /></Field>
      {!quick && <Field label="Serving size" hint="Optional, e.g. 1 pot (125 g)"><Input value={main.serving} onChange={(e) => setM({ serving: e.target.value })} maxLength={100} /></Field>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Calories per serving"><Input type="number" inputMode="decimal" step="any" min="0" value={main.cal} onChange={(e) => setM({ cal: e.target.value })} placeholder="kcal" /></Field>
        <Field label="Protein per serving"><Input type="number" inputMode="decimal" step="any" min="0" value={main.protein} onChange={(e) => setM({ protein: e.target.value })} placeholder="g" /></Field>
      </div>
      {!quick && <NutrientFields values={main.nutrients} onChange={(k: NutrientKey, v) => setMain((m) => ({ ...m, nutrients: { ...m.nutrients, [k]: v } }))} />}
      {!quick && <Field label="Number of servings"><Input type="number" inputMode="decimal" step="any" min="0.01" value={main.qty} onChange={(e) => setMain((m) => ({ ...m, qty: e.target.value }))} /></Field>}

      {!quick && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted">Ingredients <span className="font-normal">(add protein powder to yoghurt, for example)</span></p>
          {extras.map((r) => (
            <div key={r.key} className="space-y-3 rounded-xl border border-line bg-card p-3">
              <div className="flex items-center gap-2">
                <Input aria-label="Ingredient name" value={r.name} onChange={(e) => patchExtra(r.key, { name: e.target.value, food_id: null })} placeholder="Ingredient name" maxLength={100} />
                <button type="button" aria-label="Remove ingredient" onClick={() => setExtras((l) => l.filter((x) => x.key !== r.key))} className="flex h-11 w-11 shrink-0 items-center justify-center text-muted hover:text-danger"><X className="h-5 w-5" /></button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Field label="kcal"><Input aria-label="Ingredient calories" type="number" inputMode="decimal" step="any" min="0" value={r.cal} onChange={(e) => patchExtra(r.key, { cal: e.target.value, food_id: null })} /></Field>
                <Field label="Protein g"><Input aria-label="Ingredient protein" type="number" inputMode="decimal" step="any" min="0" value={r.protein} onChange={(e) => patchExtra(r.key, { protein: e.target.value, food_id: null })} /></Field>
                <Field label="Servings"><Input aria-label="Ingredient servings" type="number" inputMode="decimal" step="any" min="0.01" value={r.qty} onChange={(e) => patchExtra(r.key, { qty: e.target.value })} /></Field>
              </div>
            </div>
          ))}
          <div className="grid grid-cols-2 gap-2">
            {foods.length > 0 && (
              <Select aria-label="Add a saved food as an ingredient" value="" onChange={(e) => { const f = foods.find((x) => x.id === e.target.value); if (f) setExtras((l) => [...l, rowFromFood(f)]); }}>
                <option value="">Add saved food…</option>
                {foods.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </Select>
            )}
            <Button type="button" variant="secondary" className={foods.length === 0 ? "col-span-2" : ""} onClick={() => setExtras((l) => [...l, blankRow()])}><Plus className="h-4 w-4" />Custom ingredient</Button>
          </div>
          <Button type="button" variant="secondary" className="w-full" onClick={() => setCatalogFor("extra")}><Store className="h-4 w-4" />Ingredient from supermarket catalog</Button>
        </div>
      )}

      {isCombo && <Field label="Name for this combination" hint="Shown in your diary"><Input value={shownCombo} onChange={(e) => { setComboTouched(true); setComboName(e.target.value); }} maxLength={100} /></Field>}

      <div className="rounded-2xl border border-line bg-card px-4 py-3">
        <p className="text-sm text-muted">Total</p>
        <p className="num text-3xl font-bold">{fmt(preview.calories)} <span className="text-base font-medium text-muted">kcal</span></p>
        <p className="num text-muted">{fmt(preview.protein, 1)} g protein</p>
      </div>

      <DateTimeFields date={initial?.date ?? selected} today={today} initialTime={initial?.time} />
      {!quick && <Field label="Notes"><Textarea rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" /></Field>}

      {!editing && !quick && !main.food_id && extras.length === 0 && (
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" checked={saveToLibrary} onChange={(e) => setSaveToLibrary(e.target.checked)} className="h-5 w-5 accent-[rgb(var(--accent))]" />
          <span>Save to my foods for next time</span>
        </label>
      )}

      {error && <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      <Button type="submit" className="w-full">{editing ? "Save changes" : "Add to diary"}</Button>

      {catalogFor && (
        <CatalogPicker
          onClose={() => setCatalogFor(null)}
          onPick={(p) => {
            if (catalogFor === "main") setMain((m) => ({ ...rowFromPicked(p), key: m.key, qty: m.qty }));
            else setExtras((l) => [...l, rowFromPicked(p)]);
            setCatalogFor(null);
          }}
        />
      )}
    </form>
  );
}
