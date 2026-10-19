import { PageHeader } from "@/components/page-header";
import { FriendAddView } from "@/components/views/friends-view";

export const metadata = { title: "Add a friend" };
export default function Page() { return (<><PageHeader title="Add a friend" back="/friends" /><FriendAddView /></>); }
