import { PageHeader } from "@/components/page-header";
import { FoodEditView } from "@/components/views/library-views";

export const metadata = { title: "Ingredient" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (<><PageHeader title={id === "new" ? "New ingredient" : "Edit ingredient"} back="/library/foods" /><FoodEditView id={id} /></>);
}
