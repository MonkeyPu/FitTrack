"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Settings2, UserPlus } from "lucide-react";
import { useApp } from "@/components/app-context";
import { Avatar } from "@/components/avatar";
import { FriendToday } from "@/components/friend-today";
import { Empty } from "@/components/page-header";
import { PageSkeleton } from "@/components/skeleton";
import { Button, buttonClass } from "@/components/ui/button";
import { Card, Section } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { useFriendCards, useFriendOrder, useFriendSearch, useFriendships } from "@/lib/client/hooks";
import { useRemoveFriendship, useRespondToRequest, useSendRequest } from "@/lib/client/mutations";
import { daysBetween } from "@/lib/dates";
import { sortByOrder } from "@/lib/friend-order";

export function FriendsView() {
  const { date, today, ready, profile } = useApp();
  const cards = useFriendCards(date);
  const order = useFriendOrder();
  const links = useFriendships();
  const respond = useRespondToRequest();
  const remove = useRemoveFriendship();
  if (!ready || (!cards.data && !cards.isError) || !links.data) return <PageSkeleton />;

  const incoming = links.data.filter((l) => l.status === "pending" && l.incoming);
  const outgoing = links.data.filter((l) => l.status === "pending" && !l.incoming);
  const list = sortByOrder(cards.data ?? [], (c) => c.friend_id, (c) => c.display_name, order.data);
  const sharing = profile.privacy_settings;
  const allShared = sharing.share_summary && sharing.share_exercise && sharing.share_history && sharing.share_goal;

  return (
    <>
      <div className="flex justify-end gap-2">
        <Link href="/friends/manage" className={buttonClass({ variant: "secondary", size: "sm" })}><Settings2 className="h-4 w-4" />Manage friends</Link>
        <Link href="/friends/add" className={buttonClass({ size: "sm" })}><UserPlus className="h-4 w-4" />Add friend</Link>
      </div>

      {incoming.length > 0 && (
        <Section title="Requests">
          <Card className="divide-y divide-line py-1">
            {incoming.map((r) => (
              <div key={r.friendship_id} className="flex items-center gap-3 py-3">
                <Avatar name={r.display_name} url={r.avatar_url} />
                <div className="min-w-0 flex-1"><p className="truncate font-medium">{r.display_name}</p><p className="truncate text-sm text-muted">@{r.username}</p></div>
                <Button size="sm" onClick={() => respond.mutate({ id: r.friendship_id, decision: "accept" })}>Accept</Button>
                <Button size="sm" variant="secondary" onClick={() => respond.mutate({ id: r.friendship_id, decision: "reject" })}>Decline</Button>
              </div>
            ))}
          </Card>
        </Section>
      )}

      {list.length === 0 && incoming.length === 0 && outgoing.length === 0 && (
        <Empty title="No friends yet">Search for a friend by username and send a request. You&apos;ll see each other&apos;s progress once they accept and share it.</Empty>
      )}
      {list.length === 0 && (incoming.length > 0 || outgoing.length > 0) && <p className="px-1 text-sm text-muted">Your friends will show up here once a request is accepted.</p>}

      {list.map((c) => {
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
                <Button size="sm" variant="secondary" onClick={() => remove.mutate(r.friendship_id)}>Cancel</Button>
              </div>
            ))}
          </Card>
        </Section>
      )}

      <p className="px-1 pb-2 text-center text-xs text-muted">
        {allShared ? "All sharing is on, so friends can see your nutrition, exercise, history and goal. " : "Some of your sharing is turned off. "}
        You can change this any time in <Link href="/profile/privacy" className="text-accent">Settings › Privacy</Link>, or for one friend in <Link href="/friends/manage" className="text-accent">Manage friends</Link>.
      </p>
    </>
  );
}

function useDebounced(v: string, ms = 300) {
  const [d, setD] = useState(v);
  useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]);
  return d;
}

export function FriendAddView() {
  const [text, setText] = useState("");
  const q = useDebounced(text.trim().replace(/^@/, "").slice(0, 20));
  const search = useFriendSearch(q);
  const links = useFriendships();
  const send = useSendRequest();
  const respond = useRespondToRequest();
  const rel = new Map((links.data ?? []).map((l) => [l.other_id, l]));
  const results = search.data ?? [];

  return (
    <>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search by username" autoCapitalize="none" autoCorrect="off" className="pl-10" aria-label="Username" />
      </div>
      {q.length < 2 && <p className="px-1 text-sm text-muted">Enter at least 2 characters of their username.</p>}
      {q.length >= 2 && !search.isPending && results.length === 0 && <Empty title="No one found">Check the spelling. Usernames use letters, numbers and underscores.</Empty>}
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
                  : l?.status === "pending" && l.incoming ? <Button size="sm" onClick={() => respond.mutate({ id: l.friendship_id, decision: "accept" })}>Accept</Button>
                  : <Button size="sm" disabled={send.isPending && send.variables === r.id} onClick={() => send.mutate(r.id)}>Add</Button>}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
