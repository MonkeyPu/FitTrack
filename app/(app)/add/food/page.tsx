import { FoodForm } from "@/components/food-form";
import { PageHeader } from "@/components/page-header";
import { requireUser, resolveDate } from "@/lib/data";
import type { Food } from "@/lib/types";

export const metadata = { title: "Log food" };

export default async function Page({ searchParams }: { searchParams: Promise<{ date?: string; quick?: string }> }) {
  const sp = await searchParams;
  const [{ supabase, user }, { date, today }] = await Promise.all([requireUser(), resolveDate(sp.date)]);
  const { data } = await supabase.from("foods").select("*").eq("user_id", user.id).order("name");
  const quick = sp.quick === "1";
  return (
    <>
      <PageHeader title={quick ? "Add calories" : "Log food"} back="/add" />
      <FoodForm savedFoods={(data ?? []) as Food[]} date={date} today={today} quick={quick} />
    </>
  );
}
