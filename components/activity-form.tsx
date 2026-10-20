"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/app-context";
import { DateTimeFields } from "@/components/datetime-fields";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useSaveActivity } from "@/lib/client/mutations";
import { FormError, parseNum, parseText } from "@/lib/client/validate";
import { configFor, estimateCardio, hasWeight, TREADMILL, treadmillDistanceKm } from "@/lib/cardio";
import { ACTIVITY_PRESETS, CALORIE_SOURCES } from "@/lib/types";
import { cn } from "@/lib/utils";

export type ActivityInitial = {
  id: string; date: string; name: string; type: string; duration: number; cal: number; source: string; notes: string; time: string;
  speed?: number | null; incline?: number | null; resistance?: number | null; distance?: number | null;
};

const str = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));

export function ActivityForm({ initial }: { initial?: ActivityInitial }) {
  const router = useRouter();
  const { date: selected, today, setDate, profile } = useApp();
  const save = useSaveActivity();
  const canCalc = hasWeight(profile.weight_kg);

  const [type, setType] = useState(initial?.type ?? "running");
  const [name, setName] = useState(initial?.name ?? "Running");
  const [minutes, setMinutes] = useState(initial ? String(initial.duration) : "");
  const [speed, setSpeed] = useState(str(initial?.speed));
  const [incline, setIncline] = useState(str(initial?.incline));
  const [resistance, setResistance] = useState(str(initial?.resistance));
  const [distance, setDistance] = useState(str(initial?.distance));
  const [distanceTouched, setDistanceTouched] = useState(initial?.distance != null);
  const [cal, setCal] = useState(initial ? String(initial.cal) : "");
  const [source, setSource] = useState(initial?.source ?? "manual");
  // New entries start on the calculated value. Existing ones keep what was saved unless they were calculated too.
  const [auto, setAuto] = useState(initial ? initial.source === "calculated" : true);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState("");
  const sent = useRef(false);

  const cfg = configFor(type);
  const mins = Number(minutes);
  // On a treadmill the distance follows from speed and time until you type your own.
  const autoDistance = cfg.estimate === "treadmill" && !distanceTouched ? treadmillDistanceKm(Number(speed), mins) : null;
  const distanceValue = autoDistance !== null && autoDistance > 0 ? String(autoDistance) : distance;

  const estimate = estimateCardio({
    type, minutes: mins, weightKg: profile.weight_kg, speed: Number(speed) || 0, incline: Number(incline) || 0,
    distanceKm: cfg.distance.unit === "km" ? Number(distanceValue) || 0 : 0,
  });
  const useCalc = auto && canCalc && estimate !== null;
  const calValue = useCalc ? String(estimate!.kcal) : cal;
  // A hand-typed number is never labelled "calculated".
  const sourceValue = useCalc ? "calculated" : source === "calculated" ? "manual" : source;

  function pickType(t: string, label: string) {
    setType(t);
    setName(label);
    setAuto(true);
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sent.current) return;
    setError("");
    try {
      const fd = new FormData(e.currentTarget);
      const date = String(fd.get("log_date") ?? "");
      const loggedAt = String(fd.get("logged_at") ?? "");
      if (!date || !loggedAt) throw new FormError("Choose a date and time.");
      const opt = (raw: string, label: string, f?: { min: number; max: number }) => (raw.trim() === "" ? null : parseNum(raw, label, { min: f?.min ?? 0, max: f?.max ?? 100000 }));
      const spd = cfg.speed ? opt(speed, "speed", cfg.speed) : null;
      const inc = cfg.incline ? opt(incline, "incline", cfg.incline) : null;
      const res = cfg.resistance ? opt(resistance, "resistance", cfg.resistance) : null;
      const dist = opt(distanceValue, "distance");
      sent.current = true;
      save.mutate({
        id: initial?.id, oldDate: initial?.date, date, loggedAt, type, source: sourceValue,
        name: parseText(name, "activity name", 60, true),
        minutes: parseNum(minutes, "duration", { min: 1, max: 1440, required: true, int: true }),
        calories: parseNum(calValue, "calories burned", { max: 10000, required: true }),
        notes: parseText(notes, "notes", 500) || null,
        speed: spd, incline: inc, resistance: res, distance: dist, distanceUnit: dist === null ? null : cfg.distance.unit,
      });
      setDate(date);
      if (initial) (window.history.length > 1 ? router.back() : router.push("/diary"));
      else router.push("/");
    } catch (err) {
      sent.current = false;
      setError(err instanceof FormError ? err.message : "Check your entries and try again.");
    }
  }

  const num = (props: React.ComponentProps<typeof Input>) => <Input type="number" inputMode="decimal" {...props} />;

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div role="radiogroup" aria-label="Activity" className="grid grid-cols-3 gap-2">
        {ACTIVITY_PRESETS.map((p) => (
          <button key={p.type} type="button" role="radio" aria-checked={type === p.type} onClick={() => pickType(p.type, p.name)}
            className={cn("min-h-12 rounded-xl border px-2 text-sm font-medium transition", type === p.type ? "border-accent bg-accent/10 text-accent" : "border-line bg-card text-fg")}>{p.name}</button>
        ))}
      </div>
      <Field label="Activity name"><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} /></Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Duration (minutes)">{num({ inputMode: "numeric", min: 1, max: 1440, step: 1, value: minutes, onChange: (e) => setMinutes(e.target.value), placeholder: "min" })}</Field>
        <Field label={`${cfg.distance.label} (${cfg.distance.unitLabel})`}>
          {num({ min: 0, step: "any", value: distanceValue, onChange: (e) => { setDistanceTouched(true); setDistance(e.target.value); }, placeholder: cfg.distance.unitLabel })}
        </Field>
      </div>

      {(cfg.speed || cfg.incline || cfg.resistance) && (
        <div className="grid grid-cols-2 gap-3">
          {cfg.speed && <Field label={`${cfg.speed.label} (${cfg.speed.unit})`}>{num({ min: cfg.speed.min, max: cfg.speed.max, step: cfg.speed.step, value: speed, onChange: (e) => setSpeed(e.target.value), placeholder: cfg.speed.unit })}</Field>}
          {cfg.incline && <Field label={`${cfg.incline.label} (${cfg.incline.unit})`}>{num({ min: cfg.incline.min, max: cfg.incline.max, step: cfg.incline.step, value: incline, onChange: (e) => setIncline(e.target.value), placeholder: "0" })}</Field>}
          {cfg.resistance && <Field label={cfg.resistance.label}>{num({ min: cfg.resistance.min, max: cfg.resistance.max, step: cfg.resistance.step, value: resistance, onChange: (e) => setResistance(e.target.value), placeholder: "level" })}</Field>}
        </div>
      )}
      {cfg.estimate === "treadmill" && (
        <p className="-mt-2 text-xs text-muted">Set these like the treadmill: speed {TREADMILL.speedMin}–{TREADMILL.speedMax} km/h, incline {TREADMILL.inclineMin}–{TREADMILL.inclineMax}% in {TREADMILL.inclineStep}% steps (Precor TRM 833).</p>
      )}

      <Field label={useCalc ? "Calories burned (calculated)" : "Calories burned (estimate)"}>
        {num({ min: 0, step: "any", value: calValue, onChange: (e) => { setAuto(false); setCal(e.target.value); }, placeholder: "kcal" })}
      </Field>

      {useCalc ? (
        <p className="text-xs text-muted">
          {estimate!.method === "treadmill"
            ? "Worked out from your weight, speed, incline and time. It counts only the calories above what you'd burn resting anyway. Type your own number to override it."
            : "A rough figure from your weight and average speed. It doesn't use the resistance level. Type your own number to override it."}
        </p>
      ) : (
        <>
          {canCalc && estimate !== null && (
            <button type="button" onClick={() => setAuto(true)} className="text-sm font-medium text-accent">Use calculated estimate (about {estimate.kcal} kcal)</button>
          )}
          {!canCalc && cfg.estimate && (
            <p className="rounded-xl border border-line bg-card px-3 py-2 text-sm text-muted">
              Want this worked out for you? <Link href="/profile/body" className="font-medium text-accent">Add your weight</Link>.
            </p>
          )}
          {!cfg.estimate && <p className="text-xs text-muted">Calories for this activity are entered by hand, for example from your watch or the machine.</p>}
          <Field label="Where is the estimate from?" hint="It's an estimate, not a measurement.">
            <Select value={sourceValue} onChange={(e) => setSource(e.target.value)}>{CALORIE_SOURCES.filter((s) => s.value !== "calculated").map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</Select>
          </Field>
        </>
      )}

      <DateTimeFields date={initial?.date ?? selected} today={today} initialTime={initial?.time} />
      <Field label="Notes"><Textarea rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" /></Field>
      {error && <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      <Button type="submit" className="w-full">{initial ? "Save changes" : "Add to diary"}</Button>
    </form>
  );
}
