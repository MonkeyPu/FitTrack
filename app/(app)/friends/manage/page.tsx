import { PageHeader } from "@/components/page-header";
import { ManageFriendsView } from "@/components/views/manage-friends-view";

export const metadata = { title: "Manage friends" };
export default function Page() { return (<><PageHeader title="Manage friends" back="/friends" /><ManageFriendsView /></>); }
