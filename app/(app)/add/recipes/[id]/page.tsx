import { PageHeader } from "@/components/page-header";
import { RecipeLogView } from "@/components/views/recipe-views";

export const metadata = { title: "Log recipe" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (<><PageHeader title="Log recipe" back="/add/recipes" /><RecipeLogView id={id} /></>);
}
