"use client";
import { useActionState, useState } from "react";
import { saveActivityLog } from "@/app/actions/activity";
import { DateTimeFields } from "@/components/datetime-fields";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { ACTIVITY_PRESETS, CALORIE_SOURCES } from "@/lib/types";

type Initial = { id?: string; name?: string; type?: string; duration?: number; cal?: number; source?: string; notes?: string; time?: string };

export function ActivityForm({ date, today, next, initial }: { date: string; today: string; next?: string; initial?: Initial }) {
  const [state, action] = useActionState(saveActivityLog, {});
  const [type, setType] = useState(initial?.type ?? "running");
  const [name, setName] = useState(initial?.name ?? "Running");

  return (
    <form action={action} className="space-y-4">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      {next && <input type="hidden" name="next" value={next} />}
      <input type="hidden" name="activity_type" value={type} />

      <div role="radiogroup" aria-label="Activity" className="grid grid-cols-3 gap-2">
        {ACTIVITY_PRESETS.map((p) => (
          <button key={p.type} type="button" role="radio" aria-checked={type === p.type}
            onClick={() => { setType(p.type); setName(p.name); }}
            className={cn("min-h-12 rounded-xl border px-2 text-sm font-medium transition", type === p.type ? "border-accent bg-accent/10 text-accent" : "border-line bg-card text-fg")}>
            {p.name}
          </button>
        ))}
      </div>

      <Field label="Activity name"><Input name="activity_name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Duration"><Input name="duration_minutes" type="number" inputMode="numeric" min="1" max="1440" step="1" defaultValue={initial?.duration} placeholder="minutes" required /></Field>
        <Field label="Calories burned (estimate)"><Input name="calories_burned" type="number" inputMode="decimal" step="any" min="0" defaultValue={initial?.cal} placeholder="kcal" required /></Field>
      </div>
      <Field label="Where is the estimate from?" hint="Enter the number from your watch, Apple Health or the machine. It's an estimate, not a measurement.">
        <Select name="calorie_source" defaultValue={initial?.source ?? "manual"}>
          {CALORIE_SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>
      </Field>
      <DateTimeFields date={date} today={today} initialTime={initial?.time} />
      <Field label="Notes"><Textarea name="notes" rows={2} maxLength={500} defaultValue={initial?.notes ?? ""} placeholder="Optional" /></Field>
      <FormMessage state={state} />
      <SubmitButton className="w-full">{initial?.id ? "Save changes" : "Add to diary"}</SubmitButton>
    </form>
  );
}
