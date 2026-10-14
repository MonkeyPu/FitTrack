"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, formatDay } from "@/lib/dates";

export function DateNav({ basePath, date, today }: { basePath: string; date: string; today: string }) {
  const router = useRouter();
  const href = (d: string) => (d === today ? basePath : `${basePath}?date=${d}`);
  return (
    <div className="flex items-center justify-between gap-2">
      <Link href={href(addDays(date, -1))} aria-label="Previous day" className="flex h-11 w-11 items-center justify-center rounded-xl bg-card text-muted">
        <ChevronLeft className="h-5 w-5" />
      </Link>
      <label className="relative flex-1 text-center">
        <span className="block text-lg font-semibold">{formatDay(date, today)}</span>
        {date !== today && <span className="block text-xs text-muted">{date}</span>}
        <input
          type="date"
          value={date}
          max={addDays(today, 365)}
          aria-label="Choose a date"
          onChange={(e) => e.target.value && router.push(href(e.target.value))}
          className="absolute inset-0 h-full w-full opacity-0"
        />
      </label>
      {date !== today && (
        <Link href={href(today)} className="rounded-xl bg-card px-3 py-2.5 text-sm font-medium text-accent">Today</Link>
      )}
      <Link href={href(addDays(date, 1))} aria-label="Next day" className="flex h-11 w-11 items-center justify-center rounded-xl bg-card text-muted">
        <ChevronRight className="h-5 w-5" />
      </Link>
    </div>
  );
}
