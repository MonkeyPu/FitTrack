"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { FoodLibraryForm } from "@/components/food-library-form";
import { Empty } from "@/components/page-header";
import { PageSkeleton } from "@/components/skeleton";
import { useFoods } from "@/lib/client/hooks";
import { useDeleteFood } from "@/lib/client/mutations";
import { fmt } from "@/lib/utils";

export function FoodsView() {
  const foods = useFoods();
  if (!foods.data) return <PageSkeleton />;
  return foods.data.length === 0 ? (
    <Empty title="No ingredients yet">Save things you measure the same way every time, like 1 scoop of protein powder or 1 big spoon of yoghurt. You can also create them while logging food with Add ingredient.</Empty>
  ) : (
    <ul className="overflow-hidden rounded-2xl border border-line bg-card">
      {foods.data.map((f) => (
        <li key={f.id} className="border-b border-line last:border-0">
          <Link href={`/library/foods/${f.id}`} className="flex min-h-14 items-center justify-between gap-3 px-4 py-2.5">
            <span className="min-w-0"><span className="block truncate font-medium">{f.name}</span><span className="block truncate text-xs text-muted">{f.serving_description || "1 unit"}</span></span>
            <span className="num shrink-0 text-sm text-muted">{fmt(f.calories_per_serving)} kcal · {fmt(f.protein_per_serving, 1)} g</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function FoodEditView({ id }: { id: string }) {
  const router = useRouter();
  const foods = useFoods();
  const del = useDeleteFood();
  if (id === "new") return <FoodLibraryForm />;
  if (!foods.data) return <PageSkeleton />;
  const food = foods.data.find((f) => f.id === id);
  if (!food) return <Empty title="Ingredient not found">It may have been deleted. <Link href="/library/foods" className="text-accent">Back to my ingredients</Link></Empty>;
  return (
    <>
      <FoodLibraryForm food={food} />
      <button type="button" onClick={() => { if (confirm("Delete this ingredient? Past entries keep their values.")) { del.mutate(food.id); router.push("/library/foods"); } }} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-danger/30 bg-danger/10 font-semibold text-danger"><Trash2 className="h-4 w-4" />Delete ingredient</button>
    </>
  );
}
