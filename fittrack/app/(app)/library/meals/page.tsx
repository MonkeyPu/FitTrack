import Link from "next/link";
import { Plus } from "lucide-react";
import { Empty, PageHeader } from "@/components/page-header";
import { buttonClass } from "@/components/ui/button";
import { requireUser } from "@/lib/data";
import { fmt } from "@/lib/utils";
import type { Meal } from "@/lib/types";

export const metadata = { title: "Saved meals" };

export default async function Page() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("meals").select("id, name, meal_items(*)").eq("user_id", user.id).order("name");
  const meals = (data ?? []) as Meal[];
  return (
    <>
      <PageHeader title="Saved meals" back="/add" action={<Link href="/library/meals/new" aria-label="New meal" className={buttonClass({ size: "icon" })}><Plus className="h-5 w-5" /></Link>} />
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-card p-1 text-center text-sm font-medium">
        <Link href="/library/foods" className="py-2 text-muted">Foods</Link>
        <span className="rounded-lg bg-card2 py-2">Meals</span>
      </div>
      {meals.length === 0 ? (
        <Empty title="No saved meals yet">Combine saved foods into a meal like Breakfast, then log it in one action.</Empty>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-line bg-card">
          {meals.map((m) => {
            const cal = m.meal_items.reduce((a, i) => a + i.serving_quantity * i.calories_per_serving_snapshot, 0);
            const pro = m.meal_items.reduce((a, i) => a + i.serving_quantity * i.protein_per_serving_snapshot, 0);
            return (
              <li key={m.id} className="border-b border-line last:border-0">
                <Link href={`/library/meals/${m.id}`} className="flex min-h-14 items-center justify-between gap-3 px-4 py-2.5">
                  <span className="min-w-0"><span className="block truncate font-medium">{m.name}</span><span className="block text-xs text-muted">{m.meal_items.length} {m.meal_items.length === 1 ? "food" : "foods"}</span></span>
                  <span className="num shrink-0 text-sm text-muted">{fmt(cal)} kcal · {fmt(pro, 1)} g</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
