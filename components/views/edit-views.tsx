"use client";
import Link from "next/link";
import { useApp } from "@/components/app-context";
import { ActivityForm } from "@/components/activity-form";
import { FoodForm, type FormRow } from "@/components/food-form";
import { Empty } from "@/components/page-header";
import { PageSkeleton } from "@/components/skeleton";
import { useLog } from "@/lib/client/hooks";
import { readNutrients, toNutrientStrings } from "@/lib/nutrition";
import { timeInTz } from "@/lib/dates";
import type { ActivityLog, FoodLog, MealLog } from "@/lib/types";

const Missing = () => <Empty title="Entry not found">It may have been deleted. <Link href="/diary" className="text-accent">Back to the diary</Link></Empty>;

export function EditFoodLogView({ id }: { id: string }) {
  const { tz } = useApp();
  const q = useLog("food", id);
  if (q.isPending && !q.data) return <PageSkeleton />;
  const l = q.data as FoodLog | null | undefined;
  if (!l) return <Missing />;
  const row: FormRow = {
    key: l.id, food_id: l.food_id, name: l.food_name_snapshot, serving: l.serving_description_snapshot ?? "", cal: String(l.calories_per_serving),
    protein: String(l.protein_per_serving), qty: String(l.servings), nutrients: toNutrientStrings(readNutrients(l as unknown as Record<string, unknown>)),
  };
  return <FoodForm key={l.id} initial={{ kind: "food", id: l.id, date: l.log_date, time: timeInTz(l.logged_at, tz), notes: l.notes ?? "", comboName: "", rows: [row] }} />;
}

export function EditMealLogView({ id }: { id: string }) {
  const { tz } = useApp();
  const q = useLog("meal", id);
  if (q.isPending && !q.data) return <PageSkeleton />;
  const l = q.data as MealLog | null | undefined;
  if (!l) return <Missing />;
  const items = l.meal_log_items ?? [];
  // The meal's servings are folded into each ingredient so everything is edited in one place.
  const rows: FormRow[] = items.map((i) => ({
    key: i.id, food_id: null, name: i.food_name_snapshot, serving: i.serving_description_snapshot ?? "", cal: String(i.calories_per_serving_snapshot),
    protein: String(i.protein_per_serving_snapshot), qty: String(Number(i.serving_quantity) * Number(l.servings)),
    nutrients: toNutrientStrings(readNutrients(i as unknown as Record<string, unknown>, "_per_serving_snapshot")),
  }));
  if (rows.length === 0) return <Missing />;
  return <FoodForm key={l.id} initial={{ kind: "meal", id: l.id, date: l.log_date, time: timeInTz(l.logged_at, tz), notes: l.notes ?? "", comboName: l.meal_name_snapshot, rows }} />;
}

export function EditActivityView({ id }: { id: string }) {
  const { tz } = useApp();
  const q = useLog("activity", id);
  if (q.isPending && !q.data) return <PageSkeleton />;
  const l = q.data as ActivityLog | null | undefined;
  if (!l) return <Missing />;
  return <ActivityForm key={l.id} initial={{ id: l.id, date: l.log_date, name: l.activity_name, type: l.activity_type, duration: l.duration_minutes, cal: Number(l.calories_burned), source: l.calorie_source, notes: l.notes ?? "", time: timeInTz(l.logged_at, tz) }} />;
}
