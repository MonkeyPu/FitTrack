import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isDateStr, todayInTz } from "@/lib/dates";
import type { ActivityLog, FoodLog, MealLog, Profile } from "@/lib/types";

export type Db = Awaited<ReturnType<typeof createClient>>;

export const requireUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
});

/** Profile for the signed-in user. Sends new users to onboarding. */
export const requireProfile = cache(async () => {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!data || !data.onboarded) redirect("/onboarding");
  return { supabase, user, profile: data as Profile };
});

export async function getTz(): Promise<string> {
  const raw = (await cookies()).get("tz")?.value;
  return raw ? decodeURIComponent(raw) : "UTC";
}

/** The date being viewed (from ?date=) and today, both in the user's timezone. */
export async function resolveDate(raw: string | string[] | undefined) {
  const tz = await getTz();
  const today = todayInTz(tz);
  const d = Array.isArray(raw) ? raw[0] : raw;
  return { tz, today, date: d && isDateStr(d) ? d : today };
}

export async function getDay(supabase: Db, userId: string, date: string) {
  const [foods, meals, activities] = await Promise.all([
    supabase.from("food_logs").select("*").eq("user_id", userId).eq("log_date", date).order("logged_at"),
    supabase.from("meal_logs").select("*, meal_log_items(*)").eq("user_id", userId).eq("log_date", date).order("logged_at"),
    supabase.from("activity_logs").select("*").eq("user_id", userId).eq("log_date", date).order("logged_at"),
  ]);
  return {
    foods: (foods.data ?? []) as FoodLog[],
    meals: (meals.data ?? []) as MealLog[],
    activities: (activities.data ?? []) as ActivityLog[],
    error: foods.error || meals.error || activities.error ? "Couldn't load this day. Pull to refresh." : null,
  };
}
