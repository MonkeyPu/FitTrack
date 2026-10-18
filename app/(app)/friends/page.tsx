import Link from "next/link";
import { UserPlus } from "lucide-react";
import { removeFriendship, respondToRequest } from "@/app/actions/friends";
import { Avatar } from "@/components/avatar";
import { FriendAction } from "@/components/friend-action";
import { FriendToday } from "@/components/friend-today";
import { Empty } from "@/components/page-header";
import { buttonClass } from "@/components/ui/button";
import { Card, Section } from "@/components/ui/card";
import { requireUser, resolveDate } from "@/lib/data";
import { getFriendCards, getFriendships } from "@/lib/friends";
import { daysBetween } from "@/lib/dates";

export const metadata = { title: "Friends" };

export default async function Page() {
  const [{ supabase }, { today }] = await Promise.all([requireUser(), resolveDate(undefined)]);
  const [cards, links] = await Promise.all([getFriendCards(supabase, today), getFriendships(supabase)]);
  const incoming = links.filter((l) => l.status === "pending" && l.incoming);
  const outgoing = links.filter((l) => l.status === "pending" && !l.incoming);

  return (
    <>
      <div className="flex justify-end">
        <Link href="/friends/add" className={buttonClass({ size: "sm" })}><UserPlus className="h-4 w-4" />Add friend</Link>
      </div>

      {incoming.length > 0 && (
        <Section title="Requests">
          <Card className="divide-y divide-line py-1">
            {incoming.map((r) => (
              <div key={r.friendship_id} className="flex items-center gap-3 py-3">
                <Avatar name={r.display_name} url={r.avatar_url} />
                <div className="min-w-0 flex-1"><p className="truncate font-medium">{r.display_name}</p><p className="truncate text-sm text-muted">@{r.username}</p></div>
                <FriendAction action={respondToRequest} fields={{ id: r.friendship_id, decision: "accept" }} label="Accept" />
                <FriendAction action={respondToRequest} fields={{ id: r.friendship_id, decision: "reject" }} label="Decline" variant="secondary" />
              </div>
            ))}
          </Card>
        </Section>
      )}

      {cards.length === 0 && incoming.length === 0 && outgoing.length === 0 && (
        <Empty title="No friends yet">Search for a friend by username and send a request. You&apos;ll see each other&apos;s progress once they accept and share it.</Empty>
      )}
      {cards.length === 0 && (incoming.length > 0 || outgoing.length > 0) && (
        <p className="px-1 text-sm text-muted">Your friends will show up here once a request is accepted.</p>
      )}

      {cards.map((c) => {
        const daysLeft = c.share_goal && c.goal_target_date ? daysBetween(today, c.goal_target_date) : null;
        return (
          <Card key={c.friend_id} className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar name={c.display_name} url={c.avatar_url} />
              <div className="min-w-0 flex-1"><p className="truncate font-semibold">{c.display_name}</p><p className="truncate text-sm text-muted">@{c.username}</p></div>
              <Link href={`/friends/${c.friend_id}`} className={buttonClass({ variant: "secondary", size: "sm" })}>View profile</Link>
            </div>
            <FriendToday c={c} />
            {c.share_goal && (c.goal_description || daysLeft !== null) && (
              <p className="border-t border-line pt-3 text-sm text-muted">
                {c.goal_description}
                {daysLeft !== null && <span className="num"> {c.goal_description ? "· " : ""}{daysLeft > 0 ? `${daysLeft} ${daysLeft === 1 ? "day" : "days"} left` : daysLeft === 0 ? "target date is today" : "target date passed"}</span>}
              </p>
            )}
          </Card>
        );
      })}

      {outgoing.length > 0 && (
        <Section title="Sent requests">
          <Card className="divide-y divide-line py-1">
            {outgoing.map((r) => (
              <div key={r.friendship_id} className="flex items-center gap-3 py-3">
                <Avatar name={r.display_name} url={r.avatar_url} />
                <div className="min-w-0 flex-1"><p className="truncate font-medium">{r.display_name}</p><p className="truncate text-sm text-muted">@{r.username} · waiting</p></div>
                <FriendAction action={removeFriendship} fields={{ id: r.friendship_id }} label="Cancel" variant="secondary" />
              </div>
            ))}
          </Card>
        </Section>
      )}
    </>
  );
}
