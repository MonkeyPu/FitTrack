import { PageHeader } from "@/components/page-header";
import { RecipeEditView } from "@/components/views/recipe-views";

export const metadata = { title: "Edit recipe" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (<><PageHeader title="Edit recipe" back={`/add/recipes/${id}`} /><RecipeEditView id={id} /></>);
}
