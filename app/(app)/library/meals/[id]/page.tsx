import { PageHeader } from "@/components/page-header";
import { MealEditView } from "@/components/views/library-views";

export const metadata = { title: "Saved meal" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (<><PageHeader title={id === "new" ? "New meal" : "Edit meal"} back="/library/meals" /><MealEditView id={id} /></>);
}
