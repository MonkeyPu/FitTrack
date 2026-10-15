import { notFound } from "next/navigation";
import { FoodForm } from "@/components/food-form";
import { PageHeader } from "@/components/page-header";
import { requireProfile, resolveDate } from "@/lib/data";
import { safeNext } from "@/lib/action-helpers";
import { timeInTz } from "@/lib/dates";
import type { FoodLog } from "@/lib/types";

export const metadata = { title: "Edit food entry" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ next?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { supabase, user } = await requireProfile();
  const { today, tz } = await resolveDate(undefined);
  const { data } = await supabase.from("food_logs").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!data) notFound();
  const l = data as FoodLog;
  const next = safeNext(sp.next, "/diary");
  return (
    <>
      <PageHeader title="Edit entry" back={next} />
      <FoodForm
        savedFoods={[]} date={l.log_date} today={today} next={next}
        initial={{ id: l.id, food_id: l.food_id, name: l.food_name_snapshot, serving: l.serving_description_snapshot ?? "", cal: l.calories_per_serving, protein: l.protein_per_serving, servings: l.servings, notes: l.notes ?? "", time: timeInTz(l.logged_at, tz) }}
      />
    </>
  );
}
