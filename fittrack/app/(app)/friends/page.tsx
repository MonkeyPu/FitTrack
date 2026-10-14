import { Users } from "lucide-react";
import { Empty, PageHeader } from "@/components/page-header";
import { requireProfile } from "@/lib/data";

export const metadata = { title: "Friends" };

export default async function Page() {
  await requireProfile();
  return (
    <>
      <PageHeader title="Friends" />
      <Empty title="Friends are coming next">
        <Users className="mx-auto mb-2 h-6 w-6" />
        The database tables, privacy defaults and security rules for friends are already in place. Friend requests and comparisons arrive in the next build phase.
      </Empty>
    </>
  );
}
