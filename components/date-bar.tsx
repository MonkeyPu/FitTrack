"use client";
import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useApp } from "@/components/app-context";
import { CalendarSheet } from "@/components/calendar-sheet";
import { addDays, formatDay } from "@/lib/dates";

/** One date bar for every tab. The chosen date stays put while you switch tabs. */
export function DateBar() {
  const { date, today, ready, setDate } = useApp();
  const [open, setOpen] = useState(false);
  if (!ready) return <div className="h-11" />;
  const btn = "flex h-11 w-11 items-center justify-center rounded-xl bg-card text-muted transition active:scale-95";
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <button type="button" aria-label="Previous day" className={btn} onClick={() => setDate(addDays(date, -1))}><ChevronLeft className="h-5 w-5" /></button>
        <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label={`${formatDay(date, today)}. Open calendar`} className="min-h-11 flex-1 rounded-xl px-2 text-center transition active:bg-card">
          <span className="flex items-center justify-center gap-2 text-lg font-semibold">{formatDay(date, today)}<CalendarDays className="h-4 w-4 text-accent" /></span>
          {date !== today && <span className="block text-xs text-muted">{date}</span>}
        </button>
        {date !== today && <button type="button" onClick={() => setDate(today)} className="rounded-xl bg-card px-3 py-2.5 text-sm font-medium text-accent">Today</button>}
        <button type="button" aria-label="Next day" className={btn} onClick={() => setDate(addDays(date, 1))}><ChevronRight className="h-5 w-5" /></button>
      </div>
      {open && <CalendarSheet date={date} today={today} onClose={() => setOpen(false)} onSelect={(d) => { setOpen(false); setDate(d); }} />}
    </>
  );
}
