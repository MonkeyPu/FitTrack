import Link from "next/link";
import { Plus } from "lucide-react";
import { Empty, PageHeader } from "@/components/page-header";
import { buttonClass } from "@/components/ui/button";
import { requireUser } from "@/lib/data";
import { fmt } from "@/lib/utils";
import type { Food } from "@/lib/types";

export const metadata = { title: "Saved foods" };

export default async function Page() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("foods").select("*").eq("user_id", user.id).order("name");
  const foods = (data ?? []) as Food[];
  return (
    <>
      <PageHeader title="Saved foods" back="/add" action={<Link href="/library/foods/new" aria-label="New food" className={buttonClass({ size: "icon" })}><Plus className="h-5 w-5" /></Link>} />
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-card p-1 text-center text-sm font-medium">
        <span className="rounded-lg bg-card2 py-2">Foods</span>
        <Link href="/library/meals" className="py-2 text-muted">Meals</Link>
      </div>
      {foods.length === 0 ? (
        <Empty title="No saved foods yet">Save the foods you eat often to log them in a couple of taps.</Empty>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-line bg-card">
          {foods.map((f) => (
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
