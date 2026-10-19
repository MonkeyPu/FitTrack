"use client";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { isTmp, useDeleteEntry, type DeleteInput } from "@/lib/client/mutations";
import { fmt } from "@/lib/utils";
import { timeInTz } from "@/lib/dates";
import type { ActivityLog, FoodLog, MealLog } from "@/lib/types";

const Row = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-1 border-b border-line py-2 pl-4 pr-1 last:border-0">{children}</div>
);

function Actions({ editHref, del, pendingSync }: { editHref?: string; del: DeleteInput; pendingSync: boolean }) {
  const remove = useDeleteEntry();
  if (pendingSync) return <span className="px-3 text-xs text-muted">Saving…</span>;
  return (
    <div className="flex shrink-0 items-center">
      {editHref && (
        <Link href={editHref} aria-label="Edit" className="flex h-11 w-11 items-center justify-center rounded-xl text-muted hover:text-fg"><Pencil className="h-[18px] w-[18px]" /></Link>
      )}
      <button type="button" aria-label="Delete" onClick={() => { if (confirm("Delete this entry?")) remove.mutate(del); }} className="flex h-11 w-11 items-center justify-center rounded-xl text-muted transition hover:text-danger">
        <Trash2 className="h-[18px] w-[18px]" />
      </button>
    </div>
  );
}

export function FoodEntry({ log, tz }: { log: FoodLog; tz: string }) {
  const serving = log.serving_description_snapshot ? ` of ${log.serving_description_snapshot}` : "";
  return (
    <Row>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{log.food_name_snapshot}</p>
        <p className="truncate text-sm text-muted">{timeInTz(log.logged_at, tz)} · {fmt(log.servings, 2)} × serving{serving}</p>
      </div>
      <div className="num shrink-0 pr-1 text-right">
        <p className="font-semibold">{fmt(Number(log.total_calories))} <span className="text-xs font-normal text-muted">kcal</span></p>
        <p className="text-sm text-muted">{fmt(Number(log.total_protein), 1)} g protein</p>
      </div>
      <Actions pendingSync={isTmp(log.id)} editHref={`/edit/food/${log.id}`} del={{ kind: "food", id: log.id, date: log.log_date }} />
    </Row>
  );
}

export function MealEntry({ log, tz }: { log: MealLog; tz: string }) {
  const items = log.meal_log_items ?? [];
  return (
    <div className="border-b border-line last:border-0">
      <details>
        <summary className="flex cursor-pointer items-center gap-1 py-2 pl-4 pr-1">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{log.meal_name_snapshot}</p>
            <p className="truncate text-sm text-muted">{timeInTz(log.logged_at, tz)} · {items.length} {items.length === 1 ? "item" : "items"} · tap to see</p>
          </div>
          <div className="num shrink-0 pr-1 text-right">
            <p className="font-semibold">{fmt(Number(log.total_calories))} <span className="text-xs font-normal text-muted">kcal</span></p>
            <p className="text-sm text-muted">{fmt(Number(log.total_protein), 1)} g protein</p>
          </div>
        </summary>
        <ul className="mb-1 ml-4 space-y-1 border-l border-line pl-3 text-sm text-muted">
          {items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3">
              <span>{fmt(Number(i.serving_quantity) * Number(log.servings), 2)} × {i.food_name_snapshot}</span>
              <span className="num">{fmt(Number(i.serving_quantity) * Number(log.servings) * Number(i.calories_per_serving_snapshot))} kcal</span>
            </li>
          ))}
        </ul>
        <div className="flex justify-end pb-1 pr-1">
          <Actions pendingSync={isTmp(log.id)} editHref={`/edit/meal/${log.id}`} del={{ kind: "meal", id: log.id, date: log.log_date }} />
        </div>
      </details>
    </div>
  );
}

export function ActivityEntry({ log, tz }: { log: ActivityLog; tz: string }) {
  return (
    <Row>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{log.activity_name}</p>
        <p className="truncate text-sm text-muted">{timeInTz(log.logged_at, tz)} · {log.duration_minutes} min</p>
      </div>
      <div className="num shrink-0 pr-1 text-right"><p className="font-semibold">{fmt(Number(log.calories_burned))} <span className="text-xs font-normal text-muted">kcal est.</span></p></div>
      <Actions pendingSync={isTmp(log.id)} editHref={`/edit/activity/${log.id}`} del={{ kind: "activity", id: log.id, date: log.log_date }} />
    </Row>
  );
}
