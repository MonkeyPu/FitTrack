"use client";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const pad = (n: number) => String(n).padStart(2, "0");

export function CalendarSheet({ date, today, onSelect, onClose }: { date: string; today: string; onSelect: (d: string) => void; onClose: () => void }) {
  const [y0, m0] = date.split("-").map(Number);
  const [view, setView] = useState({ y: y0, m: m0 - 1 });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const shift = (months: number) =>
    setView((v) => {
      const t = new Date(Date.UTC(v.y, v.m + months, 1));
      return { y: t.getUTCFullYear(), m: t.getUTCMonth() };
    });

  const lead = (new Date(Date.UTC(view.y, view.m, 1)).getUTCDay() + 6) % 7; // weeks start on Monday
  const count = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [...Array<null>(lead).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
  const ymd = (d: number) => `${view.y}-${pad(view.m + 1)}-${pad(d)}`;
  const navBtn = "flex h-11 w-11 items-center justify-center rounded-xl text-muted active:bg-card2";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 md:items-center" onClick={onClose}>
      <div
        role="dialog" aria-modal="true" aria-label="Choose a date"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-t-3xl border border-line bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:rounded-3xl"
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="flex">
            <button type="button" className={navBtn} aria-label="Previous year" onClick={() => shift(-12)}><ChevronsLeft className="h-5 w-5" /></button>
            <button type="button" className={navBtn} aria-label="Previous month" onClick={() => shift(-1)}><ChevronLeft className="h-5 w-5" /></button>
          </div>
          <p className="text-base font-semibold" aria-live="polite">{MONTHS[view.m]} {view.y}</p>
          <div className="flex">
            <button type="button" className={navBtn} aria-label="Next month" onClick={() => shift(1)}><ChevronRight className="h-5 w-5" /></button>
            <button type="button" className={navBtn} aria-label="Next year" onClick={() => shift(12)}><ChevronsRight className="h-5 w-5" /></button>
          </div>
        </div>

        <div className="grid grid-cols-7 text-center text-xs text-muted">
          {WEEK.map((w) => <span key={w} className="py-1.5">{w}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((d, i) =>
            d === null ? <span key={`b${i}`} /> : (
              <button
                key={d} type="button" autoFocus={ymd(d) === date}
                aria-label={new Date(`${ymd(d)}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}
                aria-current={ymd(d) === today ? "date" : undefined}
                onClick={() => onSelect(ymd(d))}
                className={cn(
                  "num mx-auto flex h-11 w-11 items-center justify-center rounded-full text-[15px] transition active:scale-95",
                  ymd(d) === date ? "bg-accent font-bold text-accentfg" : ymd(d) === today ? "border border-accent text-accent" : "text-fg",
                )}
              >{d}</button>
            ),
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <button type="button" onClick={() => onSelect(today)} className="h-12 rounded-xl border border-line bg-card2 font-semibold">Today</button>
          <button type="button" onClick={onClose} className="h-12 rounded-xl text-muted">Close</button>
        </div>
      </div>
    </div>
  );
}
