import "server-only";
import type { Db } from "@/lib/data";
import { groupDaily } from "@/lib/history";
import type { DayTotals, FriendCardData, FriendshipRow } from "@/lib/types";

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export async function getFriendCards(supabase: Db, date: string): Promise<FriendCardData[]> {
  const { data } = await supabase.rpc("friend_cards", { d: date });
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    ...(r as unknown as FriendCardData),
    food_calories: num(r.food_calories),
    protein: num(r.protein),
    exercise_calories: num(r.exercise_calories),
  }));
}

export async function getFriendships(supabase: Db): Promise<FriendshipRow[]> {
  const { data } = await supabase.rpc("my_friendships");
  return (data ?? []) as FriendshipRow[];
}

export async function getFriendHistory(supabase: Db, friendId: string, from: string, to: string): Promise<Map<string, DayTotals>> {
  const { data } = await supabase.rpc("friend_history", { fid: friendId, from_d: from, to_d: to });
  const out = new Map<string, DayTotals>();
  for (const r of (data ?? []) as Record<string, unknown>[]) {
    const date = String(r.log_date);
    out.set(date, { date, food: Number(r.food_calories), protein: Number(r.protein), exercise: num(r.exercise_calories) });
  }
  return out;
}

export async function getMyHistory(supabase: Db, userId: string, from: string, to: string): Promise<Map<string, DayTotals>> {
  const range = (t: "food_logs" | "meal_logs" | "activity_logs", cols: string) =>
    supabase.from(t).select(cols).eq("user_id", userId).gte("log_date", from).lte("log_date", to);
  const [f, m, a] = await Promise.all([range("food_logs", "log_date,total_calories,total_protein"), range("meal_logs", "log_date,total_calories,total_protein"), range("activity_logs", "log_date,calories_burned")]);
  type R = Parameters<typeof groupDaily>;
  return groupDaily((f.data ?? []) as unknown as R[0], (m.data ?? []) as unknown as R[1], (a.data ?? []) as unknown as R[2]);
}
