"use client";
import { Card } from "@/components/ui/card";
import { useGoalTotals } from "@/lib/client/hooks";
import { goalDeficit, isBulking, type Targets } from "@/lib/calc";
import { addDays } from "@/lib/dates";
import { cn, fmt } from "@/lib/utils";

const longDate = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/** Total deficit, food and exercise from the goal start date up to yesterday. */
export function GoalDeficitCard({ start, today, targets }: { start: string | null; today: string; targets: Targets }) {
  const to = addDays(today, -1);
  const q = useGoalTotals(start, to);
  if (!start || !targets.maintenance) return null;

  const g = goalDeficit(q.data ?? [], targets, today);
  const loading = start <= to && q.isPending && !q.data;
  const surplus = g.deficit !== null && g.deficit < 0;
  // When bulking a surplus is the aim, so it isn't shown as a warning and falling below maintenance is.
  const bulking = isBulking(targets);
  const avg = g.deficit !== null && g.loggedDays > 0 ? g.deficit / g.loggedDays : null;

  return (
    <Card className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-semibold">Since {longDate(start)}</p>
        <p className="num text-sm text-muted">{g.loggedDays} {g.loggedDays === 1 ? "day" : "days"} logged</p>
      </div>
      {q.isError ? (
        <p className="text-sm text-danger">Couldn&apos;t load your totals. Check your connection.</p>
      ) : loading ? (
        <div className="h-12 animate-pulse rounded-xl bg-card2" />
      ) : g.loggedDays === 0 ? (
        <p className="text-sm text-muted">Log a full day and it will be counted here. Today is added once it&apos;s over.</p>
      ) : (
        <>
          <div>
            <p className={cn("num text-3xl font-bold", bulking ? g.deficit !== null && g.deficit > 0 && "text-warn" : surplus && "text-danger")}>
              {fmt(Math.abs(g.deficit ?? g.net))}<span className="text-base font-normal text-muted"> kcal {g.deficit === null ? "net" : surplus ? "surplus" : "deficit"}</span>
            </p>
            {avg !== null && <p className="num text-sm text-muted">{fmt(Math.abs(avg))} kcal per day on average{g.targetDeficit !== null ? ` · target pace ${fmt(g.targetDeficit)}` : g.targetSurplus !== null ? ` · target pace ${fmt(g.targetSurplus)} surplus` : ""}</p>}
          </div>
          <div className="grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
            <Stat label="Eaten" value={g.food} />
            <Stat label="Exercise" value={g.exercise} />
            <Stat label="Net" value={g.net} />
          </div>
        </>
      )}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="num text-lg font-bold">{fmt(value)}<span className="text-xs font-normal text-muted"> kcal</span></p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
