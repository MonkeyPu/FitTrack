"use client";
import { useEffect, useState } from "react";
import { Field, Input } from "@/components/ui/field";

/**
 * Date + time inputs. `log_date` is exactly the date picked here, and `logged_at`
 * is built from the same date and time, so an entry can never land on the wrong day.
 */
export function DateTimeFields({ date, today, initialTime }: { date: string; today: string; initialTime?: string }) {
  const [d, setD] = useState(date);
  const [t, setT] = useState(initialTime ?? "12:00");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!initialTime && date === today) {
      const now = new Date();
      setT(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`);
    }
  }, [date, today, initialTime]);

  let iso = "";
  if (mounted && d && t) {
    const dt = new Date(`${d}T${t}`);
    if (!Number.isNaN(dt.getTime())) iso = dt.toISOString();
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Date"><Input type="date" name="log_date" value={d} onChange={(e) => setD(e.target.value)} required /></Field>
      <Field label="Time"><Input type="time" value={t} onChange={(e) => setT(e.target.value)} required /></Field>
      <input type="hidden" name="logged_at" value={iso} />
    </div>
  );
}
