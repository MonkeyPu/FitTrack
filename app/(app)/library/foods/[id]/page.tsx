import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/delete-button";
import { FoodLibraryForm } from "@/components/food-library-form";
import { PageHeader } from "@/components/page-header";
import { deleteFood } from "@/app/actions/nutrition";
import { requireUser } from "@/lib/data";
import type { Food } from "@/lib/types";

export const metadata = { title: "Saved food" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  if (id === "new") return (<><PageHeader title="New food" back="/library/foods" /><FoodLibraryForm /></>);
  const { data } = await supabase.from("foods").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!data) notFound();
  return (
    <>
      <PageHeader title="Edit food" back="/library/foods" action={<form action={deleteFood}><input type="hidden" name="id" value={id} /><DeleteButton label="Delete food" confirmText="Delete this saved food? Past entries keep their values." /></form>} />
      <FoodLibraryForm food={data as Food} />
    </>
  );
}
