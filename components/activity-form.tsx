"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/app-context";
import { DateTimeFields } from "@/components/datetime-fields";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useSaveActivity } from "@/lib/client/mutations";
import { FormError, parseNum, parseText } from "@/lib/client/validate";
import { ACTIVITY_PRESETS, CALORIE_SOURCES } from "@/lib/types";
import { cn } from "@/lib/utils";

export type ActivityInitial = { id: string; date: string; name: string; type: string; duration: number; cal: number; source: string; notes: string; time: string };

export function ActivityForm({ initial }: { initial?: ActivityInitial }) {
  const router = useRouter();
  const { date: selected, today, setDate } = useApp();
  const save = useSaveActivity();
  const [type, setType] = useState(initial?.type ?? "running");
  const [name, setName] = useState(initial?.name ?? "Running");
  const [minutes, setMinutes] = useState(initial ? String(initial.duration) : "");
  const [cal, setCal] = useState(initial ? String(initial.cal) : "");
  const [source, setSource] = useState(initial?.source ?? "manual");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState("");
  const sent = useRef(false);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sent.current) return;
    setError("");
    try {
      const fd = new FormData(e.currentTarget);
      const date = String(fd.get("log_date") ?? "");
      const loggedAt = String(fd.get("logged_at") ?? "");
      if (!date || !loggedAt) throw new FormError("Choose a date and time.");
      sent.current = true;
      save.mutate({
        id: initial?.id, oldDate: initial?.date, date, loggedAt, type, source,
        name: parseText(name, "activity name", 60, true),
        minutes: parseNum(minutes, "duration", { min: 1, max: 1440, required: true, int: true }),
        calories: parseNum(cal, "calories burned", { max: 10000, required: true }),
        notes: parseText(notes, "notes", 500) || null,
      });
      setDate(date);
      if (initial) (window.history.length > 1 ? router.back() : router.push("/diary"));
      else router.push("/");
    } catch (err) {
      sent.current = false;
      setError(err instanceof FormError ? err.message : "Check your entries and try again.");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div role="radiogroup" aria-label="Activity" className="grid grid-cols-3 gap-2">
        {ACTIVITY_PRESETS.map((p) => (
          <button key={p.type} type="button" role="radio" aria-checked={type === p.type} onClick={() => { setType(p.type); setName(p.name); }}
            className={cn("min-h-12 rounded-xl border px-2 text-sm font-medium transition", type === p.type ? "border-accent bg-accent/10 text-accent" : "border-line bg-card text-fg")}>{p.name}</button>
        ))}
      </div>
      <Field label="Activity name"><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Duration"><Input type="number" inputMode="numeric" min="1" max="1440" step="1" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="minutes" /></Field>
        <Field label="Calories burned (estimate)"><Input type="number" inputMode="decimal" step="any" min="0" value={cal} onChange={(e) => setCal(e.target.value)} placeholder="kcal" /></Field>
      </div>
      <Field label="Where is the estimate from?" hint="Enter the number from your watch, Apple Health or the machine. It's an estimate, not a measurement.">
        <Select value={source} onChange={(e) => setSource(e.target.value)}>{CALORIE_SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</Select>
      </Field>
      <DateTimeFields date={initial?.date ?? selected} today={today} initialTime={initial?.time} />
      <Field label="Notes"><Textarea rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" /></Field>
      {error && <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      <Button type="submit" className="w-full">{initial ? "Save changes" : "Add to diary"}</Button>
    </form>
  );
}
