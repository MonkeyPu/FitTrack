"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { FoodLibraryForm } from "@/components/food-library-form";
import { MealBuilder } from "@/components/meal-builder";
import { Empty } from "@/components/page-header";
import { PageSkeleton } from "@/components/skeleton";
import { useFoods, useMeals } from "@/lib/client/hooks";
import { mealToItems, useDeleteFood, useDeleteMeal } from "@/lib/client/mutations";
import { sumItems } from "@/lib/nutrition";
import { fmt } from "@/lib/utils";

const Tabs = ({ active }: { active: "foods" | "meals" }) => (
  <div className="grid grid-cols-2 gap-2 rounded-xl bg-card p-1 text-center text-sm font-medium">
    {active === "foods" ? <span className="rounded-lg bg-card2 py-2">Foods</span> : <Link href="/library/foods" className="py-2 text-muted">Foods</Link>}
    {active === "meals" ? <span className="rounded-lg bg-card2 py-2">Meals</span> : <Link href="/library/meals" className="py-2 text-muted">Meals</Link>}
  </div>
);

export function FoodsView() {
  const foods = useFoods();
  if (!foods.data) return <PageSkeleton />;
  return (
    <>
      <Tabs active="foods" />
      {foods.data.length === 0 ? <Empty title="No saved foods yet">Save the foods you eat often to log them in a couple of taps.</Empty> : (
        <ul className="overflow-hidden rounded-2xl border border-line bg-card">
          {foods.data.map((f) => (
            <li key={f.id} className="border-b border-line last:border-0">
              <Link href={`/library/foods/${f.id}`} className="flex min-h-14 items-center justify-between gap-3 px-4 py-2.5">
                <span className="min-w-0"><span className="block truncate font-medium">{f.name}</span>{f.serving_description && <span className="block truncate text-xs text-muted">{f.serving_description}</span>}</span>
                <span className="num shrink-0 text-sm text-muted">{fmt(f.calories_per_serving)} kcal · {fmt(f.protein_per_serving, 1)} g</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function FoodEditView({ id }: { id: string }) {
  const router = useRouter();
  const foods = useFoods();
  const del = useDeleteFood();
  if (id === "new") return <FoodLibraryForm />;
  if (!foods.data) return <PageSkeleton />;
  const food = foods.data.find((f) => f.id === id);
  if (!food) return <Empty title="Food not found">It may have been deleted. <Link href="/library/foods" className="text-accent">Back to saved foods</Link></Empty>;
  return (
    <>
      <FoodLibraryForm food={food} />
      <button type="button" onClick={() => { if (confirm("Delete this saved food? Past entries keep their values.")) { del.mutate(food.id); router.push("/library/foods"); } }} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-danger/30 bg-danger/10 font-semibold text-danger"><Trash2 className="h-4 w-4" />Delete food</button>
    </>
  );
}

export function MealsView() {
  const meals = useMeals();
  if (!meals.data) return <PageSkeleton />;
  return (
    <>
      <Tabs active="meals" />
      {meals.data.length === 0 ? <Empty title="No saved meals yet">Combine saved foods into a meal like Breakfast, then log it in one action.</Empty> : (
        <ul className="overflow-hidden rounded-2xl border border-line bg-card">
          {meals.data.map((m) => {
            const t = sumItems(mealToItems(m).map((i) => ({ qty: i.qty, calories: i.calories, protein: i.protein, nutrients: i.nutrients })));
            return (
              <li key={m.id} className="border-b border-line last:border-0">
                <Link href={`/library/meals/${m.id}`} className="flex min-h-14 items-center justify-between gap-3 px-4 py-2.5">
                  <span className="min-w-0"><span className="block truncate font-medium">{m.name}</span><span className="block text-xs text-muted">{m.meal_items.length} {m.meal_items.length === 1 ? "food" : "foods"}</span></span>
                  <span className="num shrink-0 text-sm text-muted">{fmt(t.calories)} kcal · {fmt(t.protein, 1)} g</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

export function MealEditView({ id }: { id: string }) {
  const router = useRouter();
  const meals = useMeals();
  const del = useDeleteMeal();
  if (id === "new") return <MealBuilder />;
  if (!meals.data) return <PageSkeleton />;
  const meal = meals.data.find((m) => m.id === id);
  if (!meal) return <Empty title="Meal not found">It may have been deleted. <Link href="/library/meals" className="text-accent">Back to saved meals</Link></Empty>;
  return (
    <>
      <MealBuilder key={meal.id} meal={meal} />
      <button type="button" onClick={() => { if (confirm("Delete this saved meal? Past entries keep their values.")) { del.mutate(meal.id); router.push("/library/meals"); } }} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-danger/30 bg-danger/10 font-semibold text-danger"><Trash2 className="h-4 w-4" />Delete meal</button>
    </>
  );
}
