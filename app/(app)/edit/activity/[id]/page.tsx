import { PageHeader } from "@/components/page-header";
import { EditActivityView } from "@/components/views/edit-views";

export const metadata = { title: "Edit entry" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (<><PageHeader title="Edit entry" back="/diary" /><EditActivityView id={id} /></>);
}
