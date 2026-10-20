"use client";
import { useRouter } from "next/navigation";
import { CatalogPicker } from "@/components/catalog-picker";
import { PREFILL_KEY } from "@/components/food-form";
import type { PickedFood } from "@/lib/catalog";

/** Pick a supermarket product, then continue to Log food with its values filled in. */
export function CatalogScreen() {
  const router = useRouter();
  function pick(p: PickedFood) {
    try { sessionStorage.setItem(PREFILL_KEY, JSON.stringify({ name: p.name, serving: p.serving, calories: p.calories, protein: p.protein, nutrients: p.nutrients })); } catch { /* the form will just open empty */ }
    router.push("/add/food");
  }
  return <CatalogPicker inline onPick={pick} />;
}
