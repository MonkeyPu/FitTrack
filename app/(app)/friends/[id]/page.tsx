import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { FriendProfileView } from "@/components/views/friend-profile-view";

export const metadata = { title: "Friend" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  return (<><PageHeader title="Friend" back="/friends" /><FriendProfileView id={id} /></>);
}
