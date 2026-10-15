"use client";
import { useActionState, useState } from "react";
import { completeOnboarding } from "@/app/actions/profile";
import { AvatarUpload } from "@/components/avatar-upload";
import { FormMessage, Warnings } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { ESTIMATE_NOTE, targetWarnings } from "@/lib/safety";

const STEPS = ["About you", "Maintenance", "Daily targets", "Your goal"];

export function OnboardingForm({ userId }: { userId: string }) {
  const [state, action] = useActionState(completeOnboarding, {});
  const [step, setStep] = useState(0);
  const [err, setErr] = useState("");
  const [v, setV] = useState({
    display_name: "", username: "", age: "", avatar_url: "", maintenance_calories: "",
    max_food_calories: "", net_calorie_target: "", protein_goal: "",
    goal_description: "", goal_personal_target: "", goal_start_date: "", goal_target_date: "",
  });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV((o) => ({ ...o, [k]: e.target.value }));
  const num = (s: string) => (s === "" ? NaN : Number(s));

  function next() {
    setErr("");
    if (step === 0) {
      if (!v.display_name.trim()) return setErr("Enter a display name.");
      if (!/^[a-z0-9_]{3,20}$/i.test(v.username.trim())) return setErr("Username must be 3–20 letters, numbers or underscores.");
    }
    if (step === 1) {
      const m = num(v.maintenance_calories);
      if (!(m >= 800 && m <= 8000)) return setErr("Enter your maintenance calories (800–8000).");
      // Start the targets at maintenance rather than suggesting a deficit.
      setV((o) => ({ ...o, max_food_calories: o.max_food_calories || String(m), net_calorie_target: o.net_calorie_target || String(m) }));
    }
    if (step === 2) {
      if (!(num(v.max_food_calories) >= 800)) return setErr("Enter a maximum food calorie target (at least 800).");
      if (!(num(v.net_calorie_target) >= 0)) return setErr("Enter a net calorie target.");
      if (!(num(v.protein_goal) >= 0)) return setErr("Enter a daily protein goal in grams.");
    }
    setStep((s) => s + 1);
  }

  const warnings = targetWarnings({ maintenance: num(v.maintenance_calories), maxFood: num(v.max_food_calories), netTarget: num(v.net_calorie_target) });

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-10 pt-safe">
      <div className="pb-6 pt-8">
        <div className="mb-4 flex gap-1.5" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
          {STEPS.map((s, i) => <span key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-accent" : "bg-card2"}`} />)}
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{STEPS[step]}</h1>
      </div>

      <form action={action} className="flex flex-1 flex-col space-y-4" onKeyDown={(e) => { if (e.key === "Enter" && step < STEPS.length - 1 && (e.target as HTMLElement).tagName !== "TEXTAREA") { e.preventDefault(); next(); } }}>
        {Object.entries(v).map(([k, val]) => <input key={k} type="hidden" name={k} value={val} />)}

        {step === 0 && (<>
          <AvatarUpload userId={userId} name={v.display_name} initialUrl={v.avatar_url} onUrl={(u) => setV((o) => ({ ...o, avatar_url: u }))} />
          <Field label="Display name"><Input value={v.display_name} onChange={set("display_name")} maxLength={40} autoComplete="name" /></Field>
          <Field label="Username" hint="Friends find you by this. It must be unique."><Input value={v.username} onChange={set("username")} autoCapitalize="none" autoCorrect="off" maxLength={20} /></Field>
          <Field label="Age (optional)"><Input value={v.age} onChange={set("age")} type="number" inputMode="numeric" /></Field>
        </>)}

        {step === 1 && (<>
          <p className="text-muted">Maintenance calories are the energy you use in a normal day, including your usual activity. If you're not sure, use an estimate from a calculator or your fitness tracker. You can change it any time.</p>
          <Field label="Maintenance calories (kcal per day)"><Input value={v.maintenance_calories} onChange={set("maintenance_calories")} type="number" inputMode="numeric" placeholder="e.g. 2500" /></Field>
          <p className="text-sm text-muted">{ESTIMATE_NOTE}</p>
        </>)}

        {step === 2 && (<>
          <Field label="Maximum food calories" hint="The most you want to eat each day (kcal)"><Input value={v.max_food_calories} onChange={set("max_food_calories")} type="number" inputMode="numeric" /></Field>
          <Field label="Target net calories" hint="Food calories minus logged exercise calories (kcal)"><Input value={v.net_calorie_target} onChange={set("net_calorie_target")} type="number" inputMode="numeric" /></Field>
          <Field label="Daily protein goal" hint="Grams per day"><Input value={v.protein_goal} onChange={set("protein_goal")} type="number" inputMode="numeric" placeholder="e.g. 120" /></Field>
          <Warnings items={warnings} />
          <p className="text-sm text-muted">These are approximate. Avoid aggressive calorie deficits, especially while you're still growing.</p>
        </>)}

        {step === 3 && (<>
          <Field label="Your goal (optional)"><Textarea value={v.goal_description} onChange={set("goal_description")} rows={2} maxLength={200} placeholder="e.g. Build a steady habit and hit my protein most days" /></Field>
          <Field label="What you hope to achieve (optional)"><Input value={v.goal_personal_target} onChange={set("goal_personal_target")} maxLength={200} /></Field>
          <Field label="Target date (optional)" hint="We'll count the days remaining."><Input value={v.goal_target_date} onChange={set("goal_target_date")} type="date" /></Field>
          <p className="text-sm text-muted">Calorie logs can't measure body fat, so FitTrack tracks your habits and time, not exact fat loss.</p>
        </>)}

        {(err || state.error) && <FormMessage state={{ error: err || state.error }} />}
        <div className="mt-auto flex gap-3 pt-4">
          {step > 0 && <Button type="button" variant="secondary" onClick={() => { setErr(""); setStep(step - 1); }}>Back</Button>}
          {step < STEPS.length - 1
            ? <Button type="button" className="flex-1" onClick={next}>Continue</Button>
            : <SubmitButton className="flex-1">Finish setup</SubmitButton>}
        </div>
      </form>
    </div>
  );
}
