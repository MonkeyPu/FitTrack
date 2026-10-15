import Link from "next/link";
import { Pencil } from "lucide-react";
import { DeleteButton } from "@/components/delete-button";
import { deleteActivityLog } from "@/app/actions/activity";
import { deleteFoodLog, deleteMealLog } from "@/app/actions/nutrition";
import { fmt } from "@/lib/utils";
import { timeInTz } from "@/lib/dates";
import type { ActivityLog, FoodLog, MealLog } from "@/lib/types";

const Row = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-1 border-b border-line py-2 pl-4 pr-1 last:border-0">{children}</div>
);

function Actions({ editHref, del, id }: { editHref?: string; del: (fd: FormData) => Promise<void>; id: string }) {
  return (
    <div className="flex shrink-0 items-center">
      {editHref && (
        <Link href={editHref} aria-label="Edit" className="flex h-11 w-11 items-center justify-center rounded-xl text-muted hover:text-fg">
          <Pencil className="h-[18px] w-[18px]" />
        </Link>
      )}
      <form action={del}><input type="hidden" name="id" value={id} /><DeleteButton /></form>
    </div>
  );
}

export function FoodEntry({ log, tz, next }: { log: FoodLog; tz: string; next: string }) {
  const serving = log.serving_description_snapshot ? ` of ${log.serving_description_snapshot}` : "";
  return (
    <Row>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{log.food_name_snapshot}</p>
        <p className="truncate text-sm text-muted">{timeInTz(log.logged_at, tz)} · {fmt(log.servings, 2)} × serving{serving}</p>
      </div>
      <div className="num shrink-0 pr-1 text-right">
        <p className="font-semibold">{fmt(log.total_calories)} <span className="text-xs font-normal text-muted">kcal</span></p>
        <p className="text-sm text-muted">{fmt(log.total_protein, 1)} g protein</p>
      </div>
      <Actions editHref={`/edit/food/${log.id}?next=${encodeURIComponent(next)}`} del={deleteFoodLog} id={log.id} />
    </Row>
  );
}

export function MealEntry({ log, tz }: { log: MealLog; tz: string }) {
  return (
    <div className="border-b border-line last:border-0">
      <details className="group">
        <summary className="flex cursor-pointer items-center gap-1 py-2 pl-4 pr-1">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{log.meal_name_snapshot}</p>
            <p className="truncate text-sm text-muted">{timeInTz(log.logged_at, tz)} · {fmt(log.servings, 2)} × meal · tap to see foods</p>
          </div>
          <div className="num shrink-0 pr-1 text-right">
            <p className="font-semibold">{fmt(log.total_calories)} <span className="text-xs font-normal text-muted">kcal</span></p>
            <p className="text-sm text-muted">{fmt(log.total_protein, 1)} g protein</p>
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <form action={deleteMealLog}><input type="hidden" name="id" value={log.id} /><DeleteButton /></form>
          </div>
        </summary>
        <ul className="mb-2 ml-4 space-y-1 border-l border-line pl-3 text-sm text-muted">
          {log.meal_log_items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3">
              <span>{fmt(i.serving_quantity * log.servings, 2)} × {i.food_name_snapshot}</span>
              <span className="num">{fmt(i.serving_quantity * log.servings * i.calories_per_serving_snapshot)} kcal</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

export function ActivityEntry({ log, tz, next }: { log: ActivityLog; tz: string; next: string }) {
  return (
    <Row>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{log.activity_name}</p>
        <p className="truncate text-sm text-muted">{timeInTz(log.logged_at, tz)} · {log.duration_minutes} min</p>
      </div>
      <div className="num shrink-0 pr-1 text-right">
        <p className="font-semibold">{fmt(log.calories_burned)} <span className="text-xs font-normal text-muted">kcal est.</span></p>
      </div>
      <Actions editHref={`/edit/activity/${log.id}?next=${encodeURIComponent(next)}`} del={deleteActivityLog} id={log.id} />
    </Row>
  );
}
