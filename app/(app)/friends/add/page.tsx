import Link from "next/link";
import { Search } from "lucide-react";
import { respondToRequest, sendFriendRequest } from "@/app/actions/friends";
import { Avatar } from "@/components/avatar";
import { FriendAction } from "@/components/friend-action";
import { Empty, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { requireProfile } from "@/lib/data";
import { getFriendships } from "@/lib/friends";

export const metadata = { title: "Add a friend" };

type Result = { id: string; username: string; display_name: string; avatar_url: string | null };

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireProfile();
  const q = (sp.q ?? "").trim().replace(/^@/, "").slice(0, 20);
  let results: Result[] = [];
  const links = await getFriendships(supabase);
  if (q.length >= 2) {
    const { data } = await supabase.rpc("search_profiles", { q });
    results = (data ?? []) as Result[];
  }
  const rel = new Map(links.map((l) => [l.other_id, l]));

  return (
    <>
      <PageHeader title="Add a friend" back="/friends" />
      <form method="get" className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input name="q" defaultValue={q} placeholder="Search by username" autoCapitalize="none" autoCorrect="off" className="pl-10" aria-label="Username" />
        </div>
        <Button type="submit">Search</Button>
      </form>

      {q.length < 2 && <p className="px-1 text-sm text-muted">Enter at least 2 characters of their username.</p>}
      {q.length >= 2 && results.length === 0 && <Empty title="No one found">Check the spelling. Usernames use letters, numbers and underscores.</Empty>}

      {results.length > 0 && (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-card px-4">
          {results.map((r) => {
            const l = rel.get(r.id);
            return (
              <li key={r.id} className="flex items-center gap-3 py-3">
                <Avatar name={r.display_name} url={r.avatar_url} />
                <div className="min-w-0 flex-1"><p className="truncate font-medium">{r.display_name}</p><p className="truncate text-sm text-muted">@{r.username}</p></div>
                {l?.status === "accepted" ? <Link href={`/friends/${r.id}`} className="text-sm font-medium text-accent">Friends</Link>
                  : l?.status === "pending" && !l.incoming ? <span className="text-sm text-muted">Request sent</span>
                  : l?.status === "pending" && l.incoming ? <FriendAction action={respondToRequest} fields={{ id: l.friendship_id, decision: "accept" }} label="Accept" />
                  : <FriendAction action={sendFriendRequest} fields={{ id: r.id }} label="Add" />}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
