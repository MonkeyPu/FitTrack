"use client";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useApp } from "@/components/app-context";
import { DateTimeFields } from "@/components/datetime-fields";
import { Empty } from "@/components/page-header";
import { RecipeForm } from "@/components/recipe-form";
import { PageSkeleton } from "@/components/skeleton";
import { Button, buttonClass } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { useRecipes } from "@/lib/client/hooks";
import { useDeleteRecipe, useSaveEntry } from "@/lib/client/mutations";
import { FormError, parseText } from "@/lib/client/validate";
import { parseDecimal } from "@/lib/number";
import { amountAt, factorFor, formatAmount, itemsFromMeal, recipeTotals, scaledItems, servingUnit } from "@/lib/recipe";
import type { Meal } from "@/lib/types";
import { cn, fmt } from "@/lib/utils";

const NotFound = () => <Empty title="Recipe not found">It may have been deleted. <Link href="/add/recipes" className="text-accent">Back to recipes</Link></Empty>;

export function RecipesView() {
  const recipes = useRecipes();
  if (!recipes.data) return <PageSkeleton />;
  if (recipes.data.length === 0) {
    return (
      <div className="space-y-4">
        <Empty title="No recipes yet">A recipe is a big food made of your ingredients, like a rice bowl. Set how much of each one it uses, then when you log it change any amount and the rest scale with it.</Empty>
        <Link href="/add/recipes/new" className={cn(buttonClass(), "w-full")}><Plus className="h-4 w-4" />Create a recipe</Link>
      </div>
    );
  }
  return (
    <ul className="overflow-hidden rounded-2xl border border-line bg-card">
      {recipes.data.map((m) => {
        const t = recipeTotals(itemsFromMeal(m), 1);
        const n = m.meal_items?.length ?? 0;
        return (
          <li key={m.id} className="border-b border-line last:border-0">
            <Link href={`/add/recipes/${m.id}`} className="flex min-h-16 items-center gap-3 px-4 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{m.name}</span>
                <span className="block truncate text-xs text-muted">{n} {n === 1 ? "ingredient" : "ingredients"}</span>
              </span>
              <span className="num shrink-0 text-right text-sm text-muted">{fmt(t.calories)} kcal<br />{fmt(t.protein, 1)} g protein</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function RecipeEditView({ id }: { id: string }) {
  const router = useRouter();
  const recipes = useRecipes();
  const del = useDeleteRecipe();
  if (id === "new") return <RecipeForm />;
  if (!recipes.data) return <PageSkeleton />;
  const recipe = recipes.data.find((m) => m.id === id);
  if (!recipe) return <NotFound />;
  return (
    <>
      <RecipeForm key={recipe.id} recipe={recipe} />
      <button type="button" onClick={() => { if (confirm("Delete this recipe? Entries you already logged keep their values.")) { del.mutate(recipe.id); router.push("/add/recipes"); } }}
        className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-danger/30 bg-danger/10 font-semibold text-danger"><Trash2 className="h-4 w-4" />Delete recipe</button>
    </>
  );
}

export function RecipeLogView({ id }: { id: string }) {
  const recipes = useRecipes();
  if (!recipes.data) return <PageSkeleton />;
  const recipe = recipes.data.find((m) => m.id === id);
  return recipe ? <RecipeLog key={recipe.id} recipe={recipe} /> : <NotFound />;
}

const QUICK = [{ label: "½×", f: 0.5 }, { label: "1×", f: 1 }, { label: "2×", f: 2 }, { label: "3×", f: 3 }];

/**
 * Log a recipe. Every ingredient shows how much to use. Change any one amount and the others change in the same
 * proportion, so doubling the chicken doubles the rice too.
 */
function RecipeLog({ recipe }: { recipe: Meal }) {
  const router = useRouter();
  const { date: selected, today, setDate } = useApp();
  const save = useSaveEntry();
  const items = useMemo(() => itemsFromMeal(recipe), [recipe]);
  const [factor, setFactor] = useState(1);
  const [active, setActive] = useState<{ index: number; text: string } | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const sent = useRef(false);

  const totals = recipeTotals(items, factor);
  const shown = (i: number) => (active?.index === i ? active.text : formatAmount(amountAt(items[i], factor)));
  const change = (i: number, text: string) => {
    setActive({ index: i, text });
    const f = factorFor(items, i, parseDecimal(text));
    if (f !== null) setFactor(f);
  };
  const setQuick = (f: number) => { setActive(null); setFactor(f); };
  const same = Math.abs(factor - 1) < 1e-9;

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sent.current) return;
    setError("");
    try {
      const fd = new FormData(e.currentTarget);
      const date = String(fd.get("log_date") ?? "");
      const loggedAt = String(fd.get("logged_at") ?? "");
      if (!date || !loggedAt) throw new FormError("Choose a date and time.");
      const list = scaledItems(items, factor).map((i) => {
        if (!(i.qty > 0)) throw new FormError(`The amount of ${i.name} is too small. Raise it a little.`);
        if (i.qty > 9999) throw new FormError(`The amount of ${i.name} is too large.`);
        return { food_id: null, name: i.name, serving_description: i.serving, calories: i.calories, protein: i.protein, nutrients: i.nutrients, qty: i.qty };
      });
      sent.current = true;
      save.mutate({ date, loggedAt, notes: parseText(notes, "notes", 500) || null, items: list, comboName: recipe.name, saveToLibrary: false, fromMealId: recipe.id });
      setDate(date);
      router.push("/");
    } catch (err) {
      sent.current = false;
      setError(err instanceof FormError ? err.message : "Check your entries and try again.");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1"><p className="text-xl font-semibold">{recipe.name}</p><p className="text-sm text-muted">Change any amount and the rest follow.</p></div>
        <Link href={`/add/recipes/${recipe.id}/edit`} className={buttonClass({ variant: "secondary", size: "sm" })}><Pencil className="h-4 w-4" />Edit</Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {QUICK.map((q) => (
          <button key={q.label} type="button" onClick={() => setQuick(q.f)} aria-pressed={Math.abs(factor - q.f) < 1e-9}
            className={cn("h-9 rounded-full border px-3 text-sm font-medium transition", Math.abs(factor - q.f) < 1e-9 ? "border-accent bg-accent/15 text-accent" : "border-line bg-card2 text-muted")}>{q.label}</button>
        ))}
        <span className="num text-sm text-muted">{same ? "As written" : `${fmt(factor, 2)}× the recipe`}</span>
      </div>

      <ul className="space-y-2">
        {items.map((it, i) => {
          const { unit } = servingUnit(it.serving);
          const q = it.qty * factor;
          return (
            <li key={`${it.name}-${i}`} className="rounded-xl border border-line bg-card p-3">
              <p className="truncate font-medium">{it.name}</p>
              <div className="mt-1 flex items-center gap-2">
                <Input type="number" inputMode="decimal" value={shown(i)} onChange={(e) => change(i, e.target.value)} onBlur={() => setActive(null)} className="h-11 w-28" aria-label={`Amount of ${it.name} in ${unit}`} />
                <span className="text-sm text-muted">{unit}</span>
                <span className="num ml-auto text-right text-xs text-muted">{fmt(q * it.calories)} kcal · {fmt(q * it.protein, 1)} g protein</span>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="rounded-2xl border border-line bg-card2 px-4 py-3">
        <p className="num text-3xl font-bold">{fmt(totals.calories)} <span className="text-base font-medium text-muted">kcal</span></p>
        <p className="num text-muted">{fmt(totals.protein, 1)} g protein</p>
        <p className="num mt-1 text-sm text-muted">Carbs {fmt(totals.nutrients.carbs, 1)} · Sugar {fmt(totals.nutrients.sugar, 1)} · Fat {fmt(totals.nutrients.fat, 1)} g</p>
      </div>

      <DateTimeFields date={selected} today={today} />
      <Field label="Notes"><Textarea rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" /></Field>
      {error && <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      <Button type="submit" className="w-full">Add to diary</Button>
    </form>
  );
}
