"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, X } from "lucide-react";
import { NutrientFields } from "@/components/nutrient-fields";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useFoods } from "@/lib/client/hooks";
import { useSaveFood } from "@/lib/client/mutations";
import { FormError, parseNum, parseText } from "@/lib/client/validate";
import { emptyNutrientStrings, NUTRIENT_KEYS, NUTRIENTS, nutrientColumns, type NutrientKey } from "@/lib/nutrition";
import { fmt } from "@/lib/utils";
import type { Food } from "@/lib/types";

const labels = Object.fromEntries(NUTRIENTS.map((n) => [n.key, n.label]));

/**
 * Your saved ingredients (1 scoop of protein powder, 1 big spoon of yoghurt...). Tap one to add it,
 * or create a new one. Values are for ONE unit, so you never have to weigh it again.
 */
export function IngredientSheet({ onPick, onClose }: { onPick: (f: Food) => void; onClose: () => void }) {
  const foods = useFoods();
  const save = useSaveFood();
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [cal, setCal] = useState("");
  const [protein, setProtein] = useState("");
  const [nutrients, setNutrients] = useState(emptyNutrientStrings());
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (foods.data ?? []).filter((f) => !q || f.name.toLowerCase().includes(q));
  }, [foods.data, query]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    setError("");
    try {
      const input = {
        name: parseText(name, "ingredient name", 100, true),
        serving: parseText(unit, "unit", 100, true),
        calories: parseNum(cal, "calories", { max: 10000, required: true }),
        protein: parseNum(protein, "protein", { max: 1000 }),
        nutrients: Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, parseNum(nutrients[k], labels[k], { max: 1000 })])) as never,
      };
      const id = await save.mutateAsync(input);
      onPick({ id, name: input.name, serving_description: input.serving, calories_per_serving: input.calories, protein_per_serving: input.protein, ...nutrientColumns(input.nutrients) } as unknown as Food);
    } catch (err) {
      setError(err instanceof FormError ? err.message : "Couldn't save that. Check your connection and try again.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 md:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Add ingredient" onClick={(e) => e.stopPropagation()} className="flex max-h-[88dvh] w-full max-w-md flex-col rounded-t-3xl border border-line bg-card md:rounded-3xl">
        <div className="flex items-center gap-2 px-4 pb-2 pt-4">
          <h2 className="flex-1 text-lg font-semibold">{creating ? "New ingredient" : "Add ingredient"}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-xl text-muted"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {!creating ? (<>
            {(foods.data?.length ?? 0) > 5 && (
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your ingredients" className="pl-10" aria-label="Search your ingredients" />
              </div>
            )}
            {foods.data && foods.data.length === 0 && <p className="rounded-xl border border-dashed border-line px-4 py-5 text-center text-sm text-muted">No ingredients yet. Create one, like &ldquo;1 scoop of protein powder&rdquo;, and it will be here next time.</p>}
            {list.length > 0 && (
              <ul className="overflow-hidden rounded-xl border border-line">
                {list.map((f) => (
                  <li key={f.id} className="border-b border-line last:border-0">
                    <button type="button" onClick={() => onPick(f)} className="flex min-h-14 w-full items-center justify-between gap-3 bg-card px-4 py-2 text-left">
                      <span className="min-w-0"><span className="block truncate font-medium">{f.name}</span><span className="block truncate text-xs text-muted">{f.serving_description || "1 unit"}</span></span>
                      <span className="num shrink-0 text-right text-xs text-muted">{fmt(f.calories_per_serving)} kcal<br />{fmt(f.protein_per_serving, 1)} g protein</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Button type="button" className="w-full" onClick={() => setCreating(true)}><Plus className="h-4 w-4" />Create new ingredient</Button>
            <Link href="/library/foods" className="block text-center text-sm text-accent">Edit or delete my ingredients</Link>
          </>) : (
            <form onSubmit={create} className="space-y-4" noValidate>
              <Field label="Ingredient name"><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="e.g. Protein powder" autoFocus /></Field>
              <Field label="One unit is" hint="The amount you measure, e.g. 1 scoop, 1 big spoon, 1 slice"><Input value={unit} onChange={(e) => setUnit(e.target.value)} maxLength={100} placeholder="e.g. 1 scoop" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Calories per unit"><Input type="number" inputMode="decimal" step="any" min="0" value={cal} onChange={(e) => setCal(e.target.value)} placeholder="kcal" /></Field>
                <Field label="Protein per unit"><Input type="number" inputMode="decimal" step="any" min="0" value={protein} onChange={(e) => setProtein(e.target.value)} placeholder="g" /></Field>
              </div>
              <NutrientFields values={nutrients} onChange={(k: NutrientKey, v) => setNutrients((o) => ({ ...o, [k]: v }))} />
              {error && <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
              <div className="grid grid-cols-2 gap-3">
                <Button type="button" variant="secondary" onClick={() => setCreating(false)}>Back</Button>
                <Button type="submit" disabled={save.isPending}>Save and add</Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
