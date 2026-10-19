"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/app-context";
import { Avatar } from "@/components/avatar";
import { CompareChart, type ChartPoint } from "@/components/compare-chart-lazy";
import { FriendToday } from "@/components/friend-today";
import { ProgressBar } from "@/components/progress";
import { PageSkeleton } from "@/components/skeleton";
import { Button } from "@/components/ui/button";
import { Card, Section } from "@/components/ui/card";
import { useFriendCards, useFriendHistory, useHistory } from "@/lib/client/hooks";
import { useRemoveFriendship } from "@/lib/client/mutations";
import { daysBetween, formatDay } from "@/lib/dates";
import { average, rangeDates } from "@/lib/history";
import { cn, fmt } from "@/lib/utils";

const label = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export function FriendProfileView({ id }: { id: string }) {
  const router = useRouter();
  const { date, today, ready } = useApp();
  const cards = useFriendCards(date);
  const card = cards.data?.find((c) => c.friend_id === id);
  const [range, setRange] = useState<7 | 30>(7);
  const dates = rangeDates(date || today || "2000-01-01", range);
  const mine = useHistory(dates[0], date);
  const theirs = useFriendHistory(id, dates[0], date, Boolean(card?.share_history));
  const remove = useRemoveFriendship();

  if (!ready || !cards.data) return <PageSkeleton />;
  if (!card) return <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">This person isn&apos;t in your friends list. <Link href="/friends" className="text-accent">Back to friends</Link></p>;

  const myMap = new Map((mine.data ?? []).map((d) => [d.date, d]));
  const theirMap = new Map((theirs.data ?? []).map((d) => [d.date, d]));
  const points = (pick: "food" | "protein"): ChartPoint[] => dates.map((d) => ({ label: label(d), me: myMap.get(d)?.[pick] ?? null, friend: theirMap.get(d)?.[pick] ?? null }));
  const avg = {
    meFood: average(dates.map((d) => myMap.get(d)?.food)), friendFood: average(dates.map((d) => theirMap.get(d)?.food)),
    meProtein: average(dates.map((d) => myMap.get(d)?.protein)), friendProtein: average(dates.map((d) => theirMap.get(d)?.protein)),
    meEx: average(dates.map((d) => myMap.get(d)?.exercise)), friendEx: average(dates.map((d) => theirMap.get(d)?.exercise)),
  };
  const show = (v: number | null, unit: string) => (v === null ? "—" : `${fmt(v)} ${unit}`);

  const goalDays = card.share_goal && card.goal_target_date ? daysBetween(today, card.goal_target_date) : null;
  const goalTotal = card.goal_start_date && card.goal_target_date ? daysBetween(card.goal_start_date, card.goal_target_date) : null;
  const goalPct = goalTotal && card.goal_start_date ? Math.min(100, Math.max(0, (daysBetween(card.goal_start_date, today) / goalTotal) * 100)) : null;
  const recent = [...theirMap.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);
  const sharesAnything = card.share_summary || card.share_exercise || card.share_goal || card.share_history;

  return (
    <>
      <div className="flex items-center gap-3 px-1">
        <Avatar name={card.display_name} url={card.avatar_url} size={56} />
        <div><p className="text-xl font-bold">{card.display_name}</p><p className="text-muted">@{card.username}</p></div>
      </div>

      {!sharesAnything && <p className="rounded-2xl border border-dashed border-line px-4 py-5 text-center text-sm text-muted">{card.display_name} hasn&apos;t chosen to share anything with you yet.</p>}

      {card.share_goal && (card.goal_description || goalDays !== null) && (
        <Section title="Goal">
          <Card className="space-y-2">
            {card.goal_description && <p className="font-semibold">{card.goal_description}</p>}
            {card.goal_personal_target && <p className="text-sm text-muted">{card.goal_personal_target}</p>}
            {goalDays !== null && (<>
              {goalPct !== null && <ProgressBar pct={goalPct} status="ok" label="Time elapsed toward their goal date" />}
              <p className="num text-sm text-muted">{card.goal_target_date && `Target ${label(card.goal_target_date)} · `}{goalDays > 0 ? `${goalDays} ${goalDays === 1 ? "day" : "days"} remaining` : goalDays === 0 ? "target date is today" : "target date has passed"}</p>
            </>)}
          </Card>
        </Section>
      )}

      {(card.share_summary || card.share_exercise) && <Section title={formatDay(date, today)}><Card><FriendToday c={card} /></Card></Section>}

      {card.share_history ? (
        <Section title="Compare">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-card p-1 text-center text-sm font-medium">
            {([7, 30] as const).map((r) => <button key={r} type="button" onClick={() => setRange(r)} className={cn("rounded-lg py-2", range === r ? "bg-card2" : "text-muted")}>{r} days</button>)}
          </div>
          <Card className="space-y-5">
            <div><p className="mb-2 text-sm font-semibold">Calories eaten per day</p><CompareChart data={points("food")} unit="kcal" friendName={card.display_name} /></div>
            <div><p className="mb-2 text-sm font-semibold">Protein per day</p><CompareChart data={points("protein")} unit="g" friendName={card.display_name} /></div>
          </Card>
          <Card className="px-0 py-1">
            <div className="grid grid-cols-3 border-b border-line px-4 py-2 text-xs text-muted"><span>Average per day logged</span><span className="text-right">You</span><span className="text-right">{card.display_name}</span></div>
            {([["Calories", avg.meFood, avg.friendFood, "kcal"], ["Protein", avg.meProtein, avg.friendProtein, "g"]] as const).map(([k, a, b, u]) => (
              <div key={k} className="num grid grid-cols-3 px-4 py-2.5 text-sm"><span className="text-muted">{k}</span><span className="text-right">{show(a, u)}</span><span className="text-right">{show(b, u)}</span></div>
            ))}
            {card.share_exercise && <div className="num grid grid-cols-3 px-4 py-2.5 text-sm"><span className="text-muted">Exercise (est.)</span><span className="text-right">{show(avg.meEx, "kcal")}</span><span className="text-right">{show(avg.friendEx, "kcal")}</span></div>}
          </Card>
          <p className="px-1 text-xs text-muted">Both of you over the same {range} days ending {formatDay(date, today).toLowerCase()}. Days with nothing logged are left out of averages.</p>
          <Section title="Recent days">
            <Card className="divide-y divide-line px-4 py-1">
              {recent.length === 0 && <p className="py-3 text-sm text-muted">Nothing logged in this period.</p>}
              {recent.map((d) => (
                <div key={d.date} className="num flex items-center justify-between py-2.5 text-sm">
                  <span className="text-muted">{formatDay(d.date, today)}</span>
                  <span>{fmt(d.food)} kcal · {fmt(d.protein, 1)} g{d.exercise !== null && <span className="text-muted"> · {fmt(d.exercise)} burned</span>}</span>
                </div>
              ))}
            </Card>
          </Section>
        </Section>
      ) : (sharesAnything && <p className="px-1 text-sm text-muted">{card.display_name} hasn&apos;t shared their history, so there&apos;s nothing to compare yet.</p>)}

      <Button variant="danger" className="w-full" onClick={() => { if (confirm(`Remove ${card.display_name} from your friends? You'll stop seeing each other's progress.`)) remove.mutate(card.friendship_id, { onSuccess: () => router.push("/friends") }); }}>Remove friend</Button>
    </>
  );
}
