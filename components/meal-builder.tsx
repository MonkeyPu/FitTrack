"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { useFoods } from "@/lib/client/hooks";
import { mealToItems, useSaveMeal, type ItemInput } from "@/lib/client/mutations";
import { FormError, parseNum, parseText } from "@/lib/client/validate";
import { readNutrients, sumItems } from "@/lib/nutrition";
import { fmt } from "@/lib/utils";
import type { Meal } from "@/lib/types";

type Row = ItemInput & { key: string; qtyText: string };

export function MealBuilder({ meal }: { meal?: Meal }) {
  const router = useRouter();
  const foods = useFoods().data ?? [];
  const save = useSaveMeal();
  const [name, setName] = useState(meal?.name ?? "");
  const [rows, setRows] = useState<Row[]>(() => (meal ? mealToItems(meal).map((i) => ({ ...i, key: crypto.randomUUID(), qtyText: String(i.qty) })) : []));
  const [error, setError] = useState("");

  const add = (id: string) => {
    const f = foods.find((x) => x.id === id);
    if (!f) return;
    setRows((r) => [...r, {
      key: crypto.randomUUID(), food_id: f.id, name: f.name, serving_description: f.serving_description, calories: Number(f.calories_per_serving),
      protein: Number(f.protein_per_serving), nutrients: readNutrients(f as unknown as Record<string, unknown>), qty: 1, qtyText: "1",
    }]);
  };
  const qty = (r: Row) => (Number(r.qtyText) > 0 ? Number(r.qtyText) : 0);
  const total = sumItems(rows.map((r) => ({ qty: qty(r), calories: r.calories, protein: r.protein, nutrients: r.nutrients })));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const title = parseText(name, "meal name", 100, true);
      if (rows.length === 0) throw new FormError("Add at least one food.");
      const items = rows.map((r) => ({ ...r, qty: parseNum(r.qtyText, `servings of ${r.name}`, { min: 0.01, max: 100, required: true }) }));
      save.mutate({ id: meal?.id, name: title, items }, { onSuccess: () => router.push("/library/meals"), onError: () => setError("Couldn't save that. Check your connection and try again.") });
    } catch (err) {
      setError(err instanceof FormError ? err.message : "Check your entries and try again.");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="Meal name"><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder="e.g. Breakfast" /></Field>
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted">Foods in this meal</p>
        {rows.length === 0 && <p className="rounded-xl border border-dashed border-line px-4 py-4 text-center text-sm text-muted">No foods yet. Add one below.</p>}
        {rows.map((r) => (
          <div key={r.key} className="flex items-center gap-2 rounded-xl border border-line bg-card p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{r.name}</p>
              <p className="num text-xs text-muted">{fmt(r.calories)} kcal · {fmt(r.protein, 1)} g per {r.serving_description || "serving"}</p>
            </div>
            <Input aria-label={`Servings of ${r.name}`} type="number" inputMode="decimal" step="any" min="0.01" value={r.qtyText}
              onChange={(e) => setRows((all) => all.map((x) => (x.key === r.key ? { ...x, qtyText: e.target.value } : x)))} className="h-11 w-20 px-2 text-center" />
            <button type="button" aria-label={`Remove ${r.name}`} onClick={() => setRows((all) => all.filter((x) => x.key !== r.key))} className="flex h-11 w-11 items-center justify-center text-muted hover:text-danger"><X className="h-5 w-5" /></button>
          </div>
        ))}
      </div>
      {foods.length > 0 ? (
        <Field label="Add a saved food">
          <Select value="" onChange={(e) => add(e.target.value)}><option value="">Choose a food…</option>{foods.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</Select>
        </Field>
      ) : (
        <p className="flex items-center gap-2 rounded-xl bg-card px-4 py-3 text-sm text-muted"><Plus className="h-4 w-4" /><span>You need saved foods first. <Link href="/library/foods/new" className="text-accent">Save a food</Link></span></p>
      )}
      <div className="rounded-2xl border border-line bg-card px-4 py-3">
        <p className="text-sm text-muted">Meal total</p>
        <p className="num text-3xl font-bold">{fmt(total.calories)} <span className="text-base font-medium text-muted">kcal</span></p>
        <p className="num text-muted">{fmt(total.protein, 1)} g protein</p>
      </div>
      <p className="text-sm text-muted">Values are copied into the meal when you save it. Logged meals keep their own copy too.</p>
      {error && <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      <Button type="submit" className="w-full" disabled={save.isPending}>{meal ? "Save changes" : "Save meal"}</Button>
    </form>
  );
}
