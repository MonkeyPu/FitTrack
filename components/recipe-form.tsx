"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { IngredientSheet } from "@/components/ingredient-sheet";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useSaveRecipe } from "@/lib/client/mutations";
import { FormError, parseText } from "@/lib/client/validate";
import { parseDecimal } from "@/lib/number";
import { readNutrients, sumItems } from "@/lib/nutrition";
import { baseAmount, formatAmount, itemsFromMeal, servingUnit, type RecipeItem } from "@/lib/recipe";
import type { Food, Meal } from "@/lib/types";
import { fmt } from "@/lib/utils";

type Row = { key: string; item: RecipeItem; amount: string };

let counter = 0;
const newKey = () => `r${++counter}`;

/** Create or edit a recipe: a name and ingredients, each with the amount the recipe uses. */
export function RecipeForm({ recipe }: { recipe?: Meal }) {
  const router = useRouter();
  const save = useSaveRecipe();
  const [name, setName] = useState(recipe?.name ?? "");
  const [rows, setRows] = useState<Row[]>(() => (recipe ? itemsFromMeal(recipe).map((item) => ({ key: newKey(), item, amount: formatAmount(baseAmount(item)) })) : []));
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState("");

  const add = (f: Food) => {
    const item: RecipeItem = {
      food_id: f.id, name: f.name, serving: f.serving_description, qty: 1, calories: Number(f.calories_per_serving), protein: Number(f.protein_per_serving),
      nutrients: readNutrients(f as unknown as Record<string, unknown>),
    };
    setRows((l) => [...l, { key: newKey(), item, amount: formatAmount(servingUnit(f.serving_description).per) }]);
    setPicking(false);
  };

  /** One serving of the ingredient times how many servings the typed amount is. */
  const qtyOf = (r: Row) => {
    const a = parseDecimal(r.amount);
    return r.amount.trim() !== "" && Number.isFinite(a) && a > 0 ? a / servingUnit(r.item.serving).per : 0;
  };
  const totals = sumItems(rows.map((r) => ({ ...r.item, qty: qtyOf(r) })));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (save.isPending) return;
    setError("");
    try {
      const title = parseText(name, "recipe name", 100, true);
      if (rows.length === 0) throw new FormError("Add at least one ingredient.");
      const items = rows.map((r) => {
        const { per, unit } = servingUnit(r.item.serving);
        const qty = Math.round(qtyOf(r) * 100) / 100;
        if (qty < 0.01 || qty > 100) throw new FormError(`Amount for ${r.item.name} must be between ${fmt(0.01 * per, 2)} and ${fmt(100 * per)} ${unit}.`);
        return { ...r.item, qty };
      });
      await save.mutateAsync({ id: recipe?.id, name: title, items });
      router.push("/add/recipes");
    } catch (err) {
      setError(err instanceof FormError ? err.message : "Couldn't save the recipe. Check your connection and try again.");
    }
  }

  return (
    <>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Recipe name"><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="e.g. Chicken rice bowl" /></Field>

        <div className="space-y-2">
          <p className="text-sm font-medium text-muted">Ingredients and amounts</p>
          {rows.length === 0 && <p className="rounded-xl border border-dashed border-line px-4 py-5 text-center text-sm text-muted">Add the ingredients, then set how much of each the recipe uses. When you log it you can change any one of them and the rest follow.</p>}
          <ul className="space-y-2">
            {rows.map((r) => {
              const { unit } = servingUnit(r.item.serving);
              const q = qtyOf(r);
              return (
                <li key={r.key} className="rounded-xl border border-line bg-card p-3">
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate font-medium">{r.item.name}</p>
                    <button type="button" aria-label={`Remove ${r.item.name}`} onClick={() => setRows((l) => l.filter((x) => x.key !== r.key))} className="-mr-2 flex h-10 w-10 items-center justify-center rounded-xl text-muted"><X className="h-5 w-5" /></button>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <Input type="number" inputMode="decimal" value={r.amount} onChange={(e) => setRows((l) => l.map((x) => (x.key === r.key ? { ...x, amount: e.target.value } : x)))} className="h-11 w-28" aria-label={`Amount of ${r.item.name} in ${unit}`} />
                    <span className="text-sm text-muted">{unit}</span>
                    <span className="num ml-auto text-right text-xs text-muted">{fmt(q * r.item.calories)} kcal · {fmt(q * r.item.protein, 1)} g protein</span>
                  </div>
                </li>
              );
            })}
          </ul>
          <Button type="button" variant="secondary" className="w-full" onClick={() => setPicking(true)}><Plus className="h-4 w-4" />Add ingredient</Button>
        </div>

        {rows.length > 0 && (
          <div className="rounded-2xl border border-line bg-card2 px-4 py-3">
            <p className="text-sm text-muted">Whole recipe</p>
            <p className="num text-2xl font-bold">{fmt(totals.calories)} <span className="text-base font-medium text-muted">kcal</span></p>
            <p className="num text-muted">{fmt(totals.protein, 1)} g protein</p>
          </div>
        )}

        {error && <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        <Button type="submit" className="w-full" disabled={save.isPending}>{save.isPending ? "Saving…" : recipe ? "Save changes" : "Save recipe"}</Button>
      </form>
      {/* Outside the form: the sheet has a form of its own for creating a new ingredient. */}
      {picking && <IngredientSheet onPick={add} onClose={() => setPicking(false)} />}
    </>
  );
                                                                                            }
