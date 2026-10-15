import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/delete-button";
import { MealBuilder } from "@/components/meal-builder";
import { PageHeader } from "@/components/page-header";
import { deleteMeal } from "@/app/actions/nutrition";
import { requireProfile } from "@/lib/data";
import type { Food, Meal } from "@/lib/types";

export const metadata = { title: "Saved meal" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireProfile();
  const { data: foods } = await supabase.from("foods").select("*").eq("user_id", user.id).order("name");
  if (id === "new") return (<><PageHeader title="New meal" back="/library/meals" /><MealBuilder foods={(foods ?? []) as Food[]} /></>);
  const { data } = await supabase.from("meals").select("id, name, meal_items(*)").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!data) notFound();
  return (
    <>
      <PageHeader title="Edit meal" back="/library/meals" action={<form action={deleteMeal}><input type="hidden" name="id" value={id} /><DeleteButton label="Delete meal" confirmText="Delete this saved meal? Past entries keep their values." /></form>} />
      <MealBuilder foods={(foods ?? []) as Food[]} meal={data as Meal} />
    </>
  );
}
