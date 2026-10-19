import type { SupabaseClient } from "@supabase/supabase-js";
import { groupDaily } from "@/lib/history";
import type { ActivityLog, DayTotals, FriendCardData, FriendPerms, FriendshipRow, Food, FoodLog, Meal, MealLog } from "@/lib/types";

export type DayData = { foods: FoodLog[]; meals: MealLog[]; activities: ActivityLog[] };

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export async function fetchDay(sb: SupabaseClient, userId: string, date: string): Promise<DayData> {
  const [f, m, a] = await Promise.all([
    sb.from("food_logs").select("*").eq("user_id", userId).eq("log_date", date).order("logged_at"),
    sb.from("meal_logs").select("*, meal_log_items(*)").eq("user_id", userId).eq("log_date", date).order("logged_at"),
    sb.from("activity_logs").select("*").eq("user_id", userId).eq("log_date", date).order("logged_at"),
  ]);
  const err = f.error ?? m.error ?? a.error;
  if (err) throw err;
  return { foods: (f.data ?? []) as FoodLog[], meals: (m.data ?? []) as MealLog[], activities: (a.data ?? []) as ActivityLog[] };
}

export async function fetchFoods(sb: SupabaseClient, userId: string): Promise<Food[]> {
  const { data, error } = await sb.from("foods").select("*").eq("user_id", userId).order("name");
  if (error) throw error;
  return (data ?? []) as Food[];
}

export async function fetchMeals(sb: SupabaseClient, userId: string): Promise<Meal[]> {
  const { data, error } = await sb.from("meals").select("id, name, meal_items(*)").eq("user_id", userId).order("name");
  if (error) throw error;
  return (data ?? []) as Meal[];
}

export async function fetchHistory(sb: SupabaseClient, userId: string, from: string, to: string): Promise<DayTotals[]> {
  const range = (t: "food_logs" | "meal_logs" | "activity_logs", cols: string) =>
    sb.from(t).select(cols).eq("user_id", userId).gte("log_date", from).lte("log_date", to);
  const [f, m, a] = await Promise.all([
    range("food_logs", "log_date,total_calories,total_protein"),
    range("meal_logs", "log_date,total_calories,total_protein"),
    range("activity_logs", "log_date,calories_burned"),
  ]);
  const err = f.error ?? m.error ?? a.error;
  if (err) throw err;
  type R = Parameters<typeof groupDaily>;
  return [...groupDaily((f.data ?? []) as unknown as R[0], (m.data ?? []) as unknown as R[1], (a.data ?? []) as unknown as R[2]).values()];
}

export async function fetchFriendCards(sb: SupabaseClient, date: string): Promise<FriendCardData[]> {
  const { data, error } = await sb.rpc("friend_cards", { d: date });
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    ...(r as unknown as FriendCardData),
    food_calories: num(r.food_calories), protein: num(r.protein), carbs: num(r.carbs), sugar: num(r.sugar),
    fat: num(r.fat), exercise_calories: num(r.exercise_calories),
  }));
}

export async function fetchFriendships(sb: SupabaseClient): Promise<FriendshipRow[]> {
  const { data, error } = await sb.rpc("my_friendships");
  if (error) throw error;
  return (data ?? []) as FriendshipRow[];
}

export async function fetchFriendPerms(sb: SupabaseClient): Promise<FriendPerms[]> {
  const { data, error } = await sb.from("friend_permissions").select("friend_id, share_summary, share_exercise, share_history, share_goal");
  if (error) throw error;
  return (data ?? []) as FriendPerms[];
}

export async function fetchFriendHistory(sb: SupabaseClient, friendId: string, from: string, to: string): Promise<DayTotals[]> {
  const { data, error } = await sb.rpc("friend_history", { fid: friendId, from_d: from, to_d: to });
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    date: String(r.log_date), food: Number(r.food_calories), protein: Number(r.protein), exercise: num(r.exercise_calories),
  }));
}

export async function searchProfiles(sb: SupabaseClient, q: string) {
  const { data, error } = await sb.rpc("search_profiles", { q });
  if (error) throw error;
  return (data ?? []) as { id: string; username: string; display_name: string; avatar_url: string | null }[];
}

export async function fetchLog(sb: SupabaseClient, kind: "food" | "meal" | "activity", id: string) {
  const table = kind === "food" ? "food_logs" : kind === "meal" ? "meal_logs" : "activity_logs";
  const select = kind === "meal" ? "*, meal_log_items(*)" : "*";
  const { data, error } = await sb.from(table).select(select).eq("id", id).maybeSingle();
  if (error) throw error;
  return data as unknown as FoodLog | MealLog | ActivityLog | null;
}
