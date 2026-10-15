import Link from "next/link";
import { Empty, PageHeader } from "@/components/page-header";
import { MealPicker } from "@/components/meal-picker";
import { requireProfile, resolveDate } from "@/lib/data";
import type { Meal } from "@/lib/types";

export const metadata = { title: "Add a saved meal" };

export default async function Page({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const sp = await searchParams;
  const { supabase, user } = await requireProfile();
  const { date, today } = await resolveDate(sp.date);
  const { data } = await supabase.from("meals").select("id, name, meal_items(*)").eq("user_id", user.id).order("name");
  const meals = ((data ?? []) as Meal[]).filter((m) => m.meal_items.length > 0);
  return (
    <>
      <PageHeader title="Add a saved meal" back="/add" />
      {meals.length === 0 ? (
        <Empty title="No saved meals yet">Create a meal from your saved foods, then log it in one tap. <Link href="/library/meals/new" className="text-accent">Create a meal</Link></Empty>
      ) : (
        <MealPicker meals={meals} date={date} today={today} />
      )}
    </>
  );
}
