"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { CalendarSheet } from "@/components/calendar-sheet";
import { addDays, formatDay } from "@/lib/dates";

export function DateNav({ basePath, date, today }: { basePath: string; date: string; today: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const href = (d: string) => (d === today ? basePath : `${basePath}?date=${d}`);
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <Link href={href(addDays(date, -1))} aria-label="Previous day" className="flex h-11 w-11 items-center justify-center rounded-xl bg-card text-muted">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label={`${formatDay(date, today)}. Open calendar`} className="min-h-11 flex-1 rounded-xl px-2 text-center transition active:bg-card">
          <span className="flex items-center justify-center gap-2 text-lg font-semibold">
            {formatDay(date, today)}
            <CalendarDays className="h-4 w-4 text-accent" />
          </span>
          {date !== today && <span className="block text-xs text-muted">{date}</span>}
        </button>
        {date !== today && (
          <Link href={href(today)} className="rounded-xl bg-card px-3 py-2.5 text-sm font-medium text-accent">Today</Link>
        )}
        <Link href={href(addDays(date, 1))} aria-label="Next day" className="flex h-11 w-11 items-center justify-center rounded-xl bg-card text-muted">
          <ChevronRight className="h-5 w-5" />
        </Link>
      </div>
      {open && (
        <CalendarSheet
          date={date} today={today}
          onClose={() => setOpen(false)}
          onSelect={(d) => { setOpen(false); if (d !== date) router.push(href(d)); }}
        />
      )}
    </>
  );
}
