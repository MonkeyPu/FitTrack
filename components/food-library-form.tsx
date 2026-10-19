"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { NutrientFields } from "@/components/nutrient-fields";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useSaveFood } from "@/lib/client/mutations";
import { FormError, parseNum, parseText } from "@/lib/client/validate";
import { emptyNutrientStrings, NUTRIENT_KEYS, NUTRIENTS, readNutrients, toNutrientStrings, type NutrientKey } from "@/lib/nutrition";
import type { Food } from "@/lib/types";

const labels = Object.fromEntries(NUTRIENTS.map((n) => [n.key, n.label]));

export function FoodLibraryForm({ food }: { food?: Food }) {
  const router = useRouter();
  const save = useSaveFood();
  const [name, setName] = useState(food?.name ?? "");
  const [serving, setServing] = useState(food?.serving_description ?? "");
  const [cal, setCal] = useState(food ? String(food.calories_per_serving) : "");
  const [protein, setProtein] = useState(food ? String(food.protein_per_serving) : "");
  const [nutrients, setNutrients] = useState(food ? toNutrientStrings(readNutrients(food as unknown as Record<string, unknown>)) : emptyNutrientStrings());
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      save.mutate(
        {
          id: food?.id, name: parseText(name, "food name", 100, true), serving: parseText(serving, "serving size", 100) || null,
          calories: parseNum(cal, "calories", { max: 10000, required: true }), protein: parseNum(protein, "protein", { max: 1000 }),
          nutrients: Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, parseNum(nutrients[k], labels[k], { max: 1000 })])) as never,
        },
        { onSuccess: () => router.push("/library/foods"), onError: () => setError("Couldn't save that. Check your connection and try again.") },
      );
    } catch (err) {
      setError(err instanceof FormError ? err.message : "Check your entries and try again.");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="Food name"><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} /></Field>
      <Field label="Serving size" hint="Optional, e.g. 1 slice or 250 ml"><Input value={serving} onChange={(e) => setServing(e.target.value)} maxLength={100} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Calories per serving"><Input type="number" inputMode="decimal" step="any" min="0" value={cal} onChange={(e) => setCal(e.target.value)} placeholder="kcal" /></Field>
        <Field label="Protein per serving"><Input type="number" inputMode="decimal" step="any" min="0" value={protein} onChange={(e) => setProtein(e.target.value)} placeholder="g" /></Field>
      </div>
      <NutrientFields values={nutrients} onChange={(k: NutrientKey, v) => setNutrients((o) => ({ ...o, [k]: v }))} />
      <p className="text-sm text-muted">Changing a saved food won&apos;t change entries you&apos;ve already logged.</p>
      {error && <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      <Button type="submit" className="w-full" disabled={save.isPending}>{food ? "Save changes" : "Save food"}</Button>
    </form>
  );
}
