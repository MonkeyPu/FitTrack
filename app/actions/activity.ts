"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/data";
import { firstError, safeNext, type State } from "@/lib/action-helpers";
import { activitySchema, idOnly } from "@/lib/validation";

export async function saveActivityLog(_: State, fd: FormData): Promise<State> {
  const { supabase, user } = await requireUser();
  const p = activitySchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: firstError(p.error) };
  const v = p.data;
  const row = {
    activity_name: v.activity_name,
    activity_type: v.activity_type,
    duration_minutes: Math.round(v.duration_minutes),
    calories_burned: v.calories_burned,
    calorie_source: v.calorie_source,
    speed: v.speed ?? null,
    incline_pct: v.incline_pct ?? null,
    resistance: v.resistance ?? null,
    distance: v.distance ?? null,
    distance_unit: v.distance_unit ?? null,
    notes: v.notes || null,
    logged_at: v.logged_at,
    log_date: v.log_date,
  };
  const { error } = v.id
    ? await supabase.from("activity_logs").update(row).eq("id", v.id).eq("user_id", user.id)
    : await supabase.from("activity_logs").insert({ ...row, user_id: user.id });
  if (error) return { error: "Couldn't save that. Check your connection and try again." };
  revalidatePath("/", "layout");
  redirect(safeNext(fd.get("next"), `/?date=${v.log_date}`));
}

export async function deleteActivityLog(fd: FormData) {
  const { supabase, user } = await requireUser();
  const p = idOnly.safeParse(Object.fromEntries(fd));
  if (!p.success) return;
  await supabase.from("activity_logs").delete().eq("id", p.data.id).eq("user_id", user.id);
  revalidatePath("/", "layout");
}
