"use client";
import { useActionState, useState } from "react";
import { changePassword } from "@/app/actions/auth";
import { changeEmail, deleteAccount, updateAccount, updateGoal, updatePrivacy, updateTargets } from "@/app/actions/profile";
import { AvatarUpload } from "@/components/avatar-upload";
import { FormMessage, Warnings } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Field, Input, Select, Textarea, Toggle } from "@/components/ui/field";
import { ESTIMATE_NOTE, targetWarnings } from "@/lib/safety";
import type { Profile } from "@/lib/types";

export function AccountForm({ profile }: { profile: Profile }) {
  const [state, action] = useActionState(updateAccount, {});
  return (
    <form action={action} className="space-y-4">
      <AvatarUpload userId={profile.id} initialUrl={profile.avatar_url} name={profile.display_name} />
      <Field label="Display name"><Input name="display_name" defaultValue={profile.display_name} maxLength={40} required /></Field>
      <Field label="Username" hint="Friends find you by this. Letters, numbers and underscores."><Input name="username" defaultValue={profile.username} autoCapitalize="none" autoCorrect="off" maxLength={20} required /></Field>
      <FormMessage state={state} />
      <SubmitButton className="w-full">Save account</SubmitButton>
    </form>
  );
}

export function LoginForm({ email }: { email: string }) {
  const [es, ea] = useActionState(changeEmail, {});
  const [ps, pa] = useActionState(changePassword, {});
  return (
    <div className="space-y-6">
      <form action={ea} className="space-y-3">
        <Field label="Email"><Input name="email" type="email" defaultValue={email} inputMode="email" autoComplete="email" required /></Field>
        <FormMessage state={es} />
        <SubmitButton variant="secondary" className="w-full">Change email</SubmitButton>
      </form>
      <form action={pa} className="space-y-3">
        <Field label="New password" hint="At least 8 characters"><Input name="password" type="password" autoComplete="new-password" required /></Field>
        <Field label="Confirm new password"><Input name="confirm" type="password" autoComplete="new-password" required /></Field>
        <FormMessage state={ps} />
        <SubmitButton variant="secondary" className="w-full">Change password</SubmitButton>
      </form>
    </div>
  );
}

export function TargetsForm({ profile }: { profile: Profile }) {
  const [state, action] = useActionState(updateTargets, {});
  const [v, setV] = useState({
    maintenance: String(profile.maintenance_calories ?? ""), maxFood: String(profile.max_food_calories ?? ""),
    net: String(profile.net_calorie_target ?? ""), protein: String(profile.protein_goal ?? ""),
  });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV((o) => ({ ...o, [k]: e.target.value }));
  const warnings = targetWarnings({ maintenance: Number(v.maintenance), maxFood: Number(v.maxFood), netTarget: Number(v.net) });
  return (
    <form action={action} className="space-y-4">
      <Field label="Maintenance calories" hint="About how many calories you use per day, including normal activity (kcal)"><Input name="maintenance_calories" type="number" inputMode="numeric" value={v.maintenance} onChange={set("maintenance")} required /></Field>
      <Field label="Maximum food calories" hint="The most you want to eat per day (kcal)"><Input name="max_food_calories" type="number" inputMode="numeric" value={v.maxFood} onChange={set("maxFood")} required /></Field>
      <Field label="Net calorie target" hint="Food calories minus logged exercise calories (kcal)"><Input name="net_calorie_target" type="number" inputMode="numeric" value={v.net} onChange={set("net")} required /></Field>
      <Field label="Daily protein goal" hint="Grams per day"><Input name="protein_goal" type="number" inputMode="numeric" value={v.protein} onChange={set("protein")} required /></Field>
      <Warnings items={warnings} />
      <p className="text-sm text-muted">{ESTIMATE_NOTE} Changing targets doesn't change past entries.</p>
      <FormMessage state={state} />
      <SubmitButton className="w-full">Save targets</SubmitButton>
    </form>
  );
}

export function GoalForm({ profile }: { profile: Profile }) {
  const [state, action] = useActionState(updateGoal, {});
  return (
    <form action={action} className="space-y-4">
      <Field label="Goal"><Textarea name="goal_description" rows={2} maxLength={200} defaultValue={profile.goal_description ?? ""} placeholder="e.g. Eat steadier and hit my protein most days" /></Field>
      <Field label="Personal target" hint="What you hope to achieve by the target date"><Input name="goal_personal_target" maxLength={200} defaultValue={profile.goal_personal_target ?? ""} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start date"><Input name="goal_start_date" type="date" defaultValue={profile.goal_start_date ?? ""} /></Field>
        <Field label="Target date"><Input name="goal_target_date" type="date" defaultValue={profile.goal_target_date ?? ""} /></Field>
      </div>
      <FormMessage state={state} />
      <SubmitButton className="w-full">Save goal</SubmitButton>
    </form>
  );
}

export function PrivacyForm({ profile }: { profile: Profile }) {
  const [state, action] = useActionState(updatePrivacy, {});
  const p = profile.privacy_settings;
  return (
    <form action={action}>
      <p className="mb-1 text-sm text-muted">These are the defaults for all your friends. Everything stays private until you turn it on, and friends never see your email or notes. You can choose different settings for individual friends in Manage friends.</p>
      <div className="divide-y divide-line">
        <Toggle name="share_summary" label="Daily nutrition summary" hint="Calories and protein for each day" defaultChecked={p.share_summary} />
        <Toggle name="share_exercise" label="Exercise" hint="Logged cardio and calories burned" defaultChecked={p.share_exercise} />
        <Toggle name="share_history" label="Historical progress" hint="Charts over past days" defaultChecked={p.share_history} />
        <Toggle name="share_goal" label="Overall goal" hint="Your goal and target date" defaultChecked={p.share_goal} />
      </div>
      <div className="mt-3 space-y-3"><FormMessage state={state} /><SubmitButton className="w-full">Save privacy</SubmitButton></div>
    </form>
  );
}

export function DangerZone() {
  const [state, action] = useActionState(deleteAccount, {});
  return (
    <div className="space-y-4">
      <a href="/api/export" className="flex h-12 items-center justify-center rounded-xl border border-line bg-card2 font-semibold">Export my data (JSON)</a>
      <form action={action} className="space-y-3">
        <p className="text-sm text-muted">Deleting your account permanently removes your profile, foods, meals and every log. This can't be undone.</p>
        <Field label='Type DELETE to confirm'><Input name="confirm" autoCapitalize="characters" autoComplete="off" /></Field>
        <FormMessage state={state} />
        <SubmitButton variant="danger" className="w-full">Delete my account</SubmitButton>
      </form>
    </div>
  );
}
