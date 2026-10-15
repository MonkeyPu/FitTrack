"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser, getTz } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSiteUrl } from "@/lib/site";
import { todayInTz } from "@/lib/dates";
import { firstError, type State } from "@/lib/action-helpers";
import { accountSchema, goalSchema, onboardingSchema, targetsSchema } from "@/lib/validation";

const USERNAME_TAKEN = "That username is taken. Try another.";
const SAVE_FAILED = "Couldn't save your changes. Try again.";

/** Avatars must live in this user's own folder of our storage bucket. */
function avatarOk(url: string | undefined, userId: string) {
  if (!url) return true;
  return url.startsWith(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${userId}/`);
}

export async function completeOnboarding(_: State, fd: FormData): Promise<State> {
  const { supabase, user } = await requireUser();
  const p = onboardingSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: firstError(p.error) };
  const v = p.data;
  if (!avatarOk(v.avatar_url, user.id)) return { error: "That profile picture isn't valid." };

  const hasGoal = Boolean(v.goal_description || v.goal_target_date);
  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      display_name: v.display_name,
      username: v.username,
      avatar_url: v.avatar_url ?? null,
      age: v.age ?? null,
      maintenance_calories: v.maintenance_calories,
      max_food_calories: v.max_food_calories,
      net_calorie_target: v.net_calorie_target,
      protein_goal: v.protein_goal,
      goal_description: v.goal_description || null,
      goal_personal_target: v.goal_personal_target || null,
      goal_start_date: v.goal_start_date ?? (hasGoal ? todayInTz(await getTz()) : null),
      goal_target_date: v.goal_target_date ?? null,
      onboarded: true,
    },
    { onConflict: "id" },
  );
  if (error) return { error: error.code === "23505" ? USERNAME_TAKEN : SAVE_FAILED };
  revalidatePath("/", "layout");
  redirect("/");
}

export async function updateAccount(_: State, fd: FormData): Promise<State> {
  const { supabase, user } = await requireUser();
  const p = accountSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: firstError(p.error) };
  if (!avatarOk(p.data.avatar_url, user.id)) return { error: "That profile picture isn't valid." };
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: p.data.display_name, username: p.data.username, avatar_url: p.data.avatar_url ?? null })
    .eq("id", user.id);
  if (error) return { error: error.code === "23505" ? USERNAME_TAKEN : SAVE_FAILED };
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved." };
}

export async function changeEmail(_: State, fd: FormData): Promise<State> {
  await requireUser();
  const p = z.object({ email: z.string().trim().toLowerCase().email("Enter a valid email address") }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: firstError(p.error) };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser(
    { email: p.data.email },
    { emailRedirectTo: `${await getSiteUrl()}/auth/callback?next=/profile` },
  );
  if (error) return { error: error.message };
  return { ok: true, message: "Check your inbox to confirm the new address." };
}

export async function updateTargets(_: State, fd: FormData): Promise<State> {
  const { supabase, user } = await requireUser();
  const p = targetsSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: firstError(p.error) };
  // Only the profile changes. Existing logs are never touched, and a trigger records the change.
  const { error } = await supabase.from("profiles").update(p.data).eq("id", user.id);
  if (error) return { error: SAVE_FAILED };
  revalidatePath("/", "layout");
  return { ok: true, message: "Targets saved. Past entries are unchanged." };
}

export async function updateGoal(_: State, fd: FormData): Promise<State> {
  const { supabase, user } = await requireUser();
  const p = goalSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: firstError(p.error) };
  const v = p.data;
  const hasGoal = Boolean(v.goal_description || v.goal_target_date);
  const { error } = await supabase
    .from("profiles")
    .update({
      goal_description: v.goal_description || null,
      goal_personal_target: v.goal_personal_target || null,
      goal_start_date: v.goal_start_date ?? (hasGoal ? todayInTz(await getTz()) : null),
      goal_target_date: v.goal_target_date ?? null,
    })
    .eq("id", user.id);
  if (error) return { error: SAVE_FAILED };
  revalidatePath("/", "layout");
  return { ok: true, message: "Goal saved." };
}

export async function updatePrivacy(_: State, fd: FormData): Promise<State> {
  const { supabase, user } = await requireUser();
  const on = (k: string) => fd.get(k) === "on";
  const { error } = await supabase
    .from("profiles")
    .update({
      privacy_settings: {
        share_summary: on("share_summary"),
        share_exercise: on("share_exercise"),
        share_history: on("share_history"),
        share_goal: on("share_goal"),
      },
    })
    .eq("id", user.id);
  if (error) return { error: SAVE_FAILED };
  return { ok: true, message: "Privacy settings saved." };
}

export async function updatePreferences(_: State, fd: FormData): Promise<State> {
  const { supabase, user } = await requireUser();
  const theme = fd.get("theme") === "light" ? "light" : "dark";
  const effects = fd.get("effects") === "on";
  const { error } = await supabase.from("profiles").update({ preferences: { theme, effects } }).eq("id", user.id);
  if (error) return { error: SAVE_FAILED };
  (await cookies()).set("theme", theme, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved." };
}

export async function deleteAccount(_: State, fd: FormData): Promise<State> {
  const { supabase, user } = await requireUser();
  if (fd.get("confirm") !== "DELETE") return { error: "Type DELETE to confirm." };
  try {
    const admin = createAdminClient();
    const { data: files } = await admin.storage.from("avatars").list(user.id);
    if (files?.length) await admin.storage.from("avatars").remove(files.map((f) => `${user.id}/${f.name}`));
    // Deleting the auth user cascades to the profile and every log row.
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;
  } catch {
    return { error: "Couldn't delete your account. Check that SUPABASE_SERVICE_ROLE_KEY is set, then try again." };
  }
  try {
    await supabase.auth.signOut();
  } catch {
    /* session is already gone */
  }
  redirect("/login?deleted=1");
}
