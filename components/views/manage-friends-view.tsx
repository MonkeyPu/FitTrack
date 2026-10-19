"use client";
import Link from "next/link";
import { useApp } from "@/components/app-context";
import { Avatar } from "@/components/avatar";
import { Empty } from "@/components/page-header";
import { PageSkeleton } from "@/components/skeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useFriendPerms, useFriendships } from "@/lib/client/hooks";
import { useRemoveFriendship, useResetPerms, useSavePerms } from "@/lib/client/mutations";
import type { FriendPerms } from "@/lib/types";

const OPTIONS = [
  { key: "share_summary", label: "Daily nutrition", hint: "Calories, protein and targets" },
  { key: "share_exercise", label: "Exercise", hint: "Logged cardio and calories burned" },
  { key: "share_history", label: "History", hint: "Charts over past days" },
  { key: "share_goal", label: "Goal", hint: "Goal and target date" },
] as const;

function Switch({ checked, label, hint, onChange }: { checked: boolean; label: string; hint: string; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-2.5">
      <span><span className="block">{label}</span><span className="block text-xs text-muted">{hint}</span></span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span className="relative h-7 w-12 shrink-0 rounded-full bg-line transition peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent after:absolute after:left-0.5 after:top-0.5 after:h-6 after:w-6 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
    </label>
  );
}

export function ManageFriendsView() {
  const { profile } = useApp();
  const links = useFriendships();
  const perms = useFriendPerms();
  const save = useSavePerms();
  const reset = useResetPerms();
  const remove = useRemoveFriendship();
  if (!links.data || !perms.data) return <PageSkeleton />;

  const friends = links.data.filter((l) => l.status === "accepted");
  const custom = new Map(perms.data.map((p) => [p.friend_id, p]));
  const d = profile.privacy_settings;
  const defaults = { share_summary: d.share_summary, share_exercise: d.share_exercise, share_history: d.share_history, share_goal: d.share_goal };

  return (
    <>
      <p className="px-1 text-sm text-muted">Choose what each friend can see. Friends without custom settings get your <Link href="/profile/privacy" className="text-accent">default sharing settings</Link>.</p>
      {friends.length === 0 && <Empty title="No friends yet">Friends you add will appear here.</Empty>}
      {friends.map((f) => {
        const mine = custom.get(f.other_id);
        const eff: FriendPerms = { friend_id: f.other_id, ...(mine ?? defaults) };
        return (
          <Card key={f.friendship_id} className="space-y-1">
            <div className="flex items-center gap-3 pb-2">
              <Avatar name={f.display_name} url={f.avatar_url} />
              <div className="min-w-0 flex-1"><p className="truncate font-semibold">{f.display_name}</p><p className="truncate text-sm text-muted">@{f.username} · {mine ? "custom settings" : "default settings"}</p></div>
            </div>
            <div className="divide-y divide-line">
              {OPTIONS.map((o) => <Switch key={o.key} checked={eff[o.key]} label={o.label} hint={o.hint} onChange={(v) => save.mutate({ ...eff, [o.key]: v })} />)}
            </div>
            <div className="flex gap-2 pt-3">
              {mine && <Button size="sm" variant="secondary" onClick={() => reset.mutate(f.other_id)}>Use default</Button>}
              <Button size="sm" variant="danger" className="ml-auto" onClick={() => { if (confirm(`Remove ${f.display_name} from your friends? You'll stop seeing each other's progress.`)) remove.mutate(f.friendship_id); }}>Remove friend</Button>
            </div>
          </Card>
        );
      })}
    </>
  );
}
