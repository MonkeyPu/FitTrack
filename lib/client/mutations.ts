"use client";
import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useApp } from "@/components/app-context";
import { useToast } from "@/components/toast";
import { useSupabase } from "@/lib/client/hooks";
import type { DayData } from "@/lib/client/api";
import { qk } from "@/lib/client/keys";
import { FormError } from "@/lib/client/validate";
import { nutrientColumns, readNutrients, sumItems, totalColumns, type Nutrients } from "@/lib/nutrition";
import type { ActivityLog, Food, FoodLog, FriendPerms, FriendshipRow, Meal, MealLog } from "@/lib/types";

class AppError extends Error {}

function assertOnline() {
  // Saving while offline would leave changes only on this phone, so it is refused instead.
  if (typeof navigator !== "undefined" && navigator.onLine === false) throw new AppError("You're offline. Reconnect to save.");
}
const messageOf = (e: unknown) =>
  e instanceof AppError || e instanceof FormError ? e.message : "Couldn't save that. Please try again.";
const tmpId = () => `tmp-${crypto.randomUUID()}`;
export const isTmp = (id: string) => id.startsWith("tmp-");

/* ───────────── optimistic helpers ───────────── */

type Snap = (readonly [string, DayData | undefined])[];

function dayCache(qc: QueryClient) {
  return {
    async snapshot(dates: string[]): Promise<Snap> {
      const unique = [...new Set(dates)];
      await Promise.all(unique.map((d) => qc.cancelQueries({ queryKey: qk.day(d) })));
      return unique.map((d) => [d, qc.getQueryData<DayData>(qk.day(d))] as const);
    },
    restore(snap: Snap | undefined) {
      snap?.forEach(([d, data]) => qc.setQueryData(qk.day(d), data));
    },
    patch(date: string, fn: (d: DayData) => DayData) {
      qc.setQueryData<DayData>(qk.day(date), (old) => (old ? fn(old) : old));
    },
    settle(dates: string[]) {
      [...new Set(dates)].forEach((d) => qc.invalidateQueries({ queryKey: qk.day(d) }));
      qc.invalidateQueries({ queryKey: ["history"] });
      qc.invalidateQueries({ queryKey: ["friend-cards"] });
    },
  };
}

const byTime = <T extends { logged_at: string }>(list: T[]) => [...list].sort((a, b) => a.logged_at.localeCompare(b.logged_at));

/* ───────────── diary entries (food, combined foods, saved meals) ───────────── */

export type ItemInput = {
  food_id: string | null;
  name: string;
  serving_description: string | null;
  calories: number;
  protein: number;
  nutrients: Nutrients;
  /** servings of this item in one serving of the entry */
  qty: number;
};

export type EntryInput = {
  existing?: { kind: "food" | "meal"; id: string; date: string };
  date: string;
  loggedAt: string;
  notes: string | null;
  items: ItemInput[];
  /** name for a combined entry */
  comboName: string;
  saveToLibrary: boolean;
  /** set when logging a saved meal */
  fromMealId?: string | null;
  /** servings multiplier for the whole combination (saved meals) */
  mealServings?: number;
};

export function useSaveEntry() {
  const sb = useSupabase();
  const qc = useQueryClient();
  const { userId } = useApp();
  const toast = useToast();
  const cache = dayCache(qc);

  return useMutation({
    networkMode: "always",
    mutationFn: async (inp: EntryInput) => {
      assertOnline();
      const single = inp.items.length === 1 && inp.existing?.kind !== "meal" && !inp.fromMealId;

      if (single) {
        const it = inp.items[0];
        let foodId = it.food_id;
        if (!inp.existing && inp.saveToLibrary && !foodId) {
          const { data, error } = await sb.from("foods").insert({
            user_id: userId, name: it.name, serving_description: it.serving_description,
            calories_per_serving: it.calories, protein_per_serving: it.protein, ...nutrientColumns(it.nutrients),
          }).select("id").single();
          if (error) throw error;
          foodId = data.id;
        }
        const row = {
          food_id: foodId, food_name_snapshot: it.name, serving_description_snapshot: it.serving_description,
          servings: it.qty, calories_per_serving: it.calories, protein_per_serving: it.protein, ...nutrientColumns(it.nutrients),
          notes: inp.notes, logged_at: inp.loggedAt, log_date: inp.date,
        };
        if (inp.existing) {
          const { error } = await sb.from("food_logs").update(row).eq("id", inp.existing.id);
          if (error) throw error;
        } else {
          const { error } = await sb.from("food_logs").insert({ ...row, user_id: userId });
          if (error) throw error;
        }
        qc.invalidateQueries({ queryKey: qk.foods });
        return;
      }

      // Combined entry: stored as a meal log with its own copy of every ingredient.
      const per = sumItems(inp.items.map((i) => ({ qty: i.qty, calories: i.calories, protein: i.protein, nutrients: i.nutrients })));
      const mealRow = {
        meal_name_snapshot: inp.comboName, servings: inp.mealServings ?? 1,
        calories_per_serving: per.calories, protein_per_serving: per.protein, ...nutrientColumns(per.nutrients),
        notes: inp.notes, logged_at: inp.loggedAt, log_date: inp.date,
      };
      const itemRows = (logId: string) => inp.items.map((i) => ({
        meal_log_id: logId, user_id: userId, food_name_snapshot: i.name, serving_description_snapshot: i.serving_description,
        serving_quantity: i.qty, calories_per_serving_snapshot: i.calories, protein_per_serving_snapshot: i.protein,
        ...nutrientColumns(i.nutrients, "_per_serving_snapshot"),
      }));

      if (inp.existing?.kind === "meal") {
        const id = inp.existing.id;
        const { data: old } = await sb.from("meal_log_items").select("id").eq("meal_log_id", id);
        const { error } = await sb.from("meal_logs").update(mealRow).eq("id", id);
        if (error) throw error;
        const { error: insErr } = await sb.from("meal_log_items").insert(itemRows(id));
        if (insErr) throw insErr;
        if (old?.length) await sb.from("meal_log_items").delete().in("id", old.map((r) => r.id));
        return;
      }

      const { data: log, error } = await sb.from("meal_logs")
        .insert({ ...mealRow, user_id: userId, meal_id: inp.fromMealId ?? null }).select("id").single();
      if (error || !log) throw error ?? new Error("insert failed");
      const { error: itemsErr } = await sb.from("meal_log_items").insert(itemRows(log.id));
      if (itemsErr) {
        await sb.from("meal_logs").delete().eq("id", log.id);
        throw itemsErr;
      }
      // Turning a plain food entry into a combination replaces it.
      if (inp.existing?.kind === "food") await sb.from("food_logs").delete().eq("id", inp.existing.id);
    },

    onMutate: async (inp) => {
      const dates = [inp.date, ...(inp.existing ? [inp.existing.date] : [])];
      const snap = await cache.snapshot(dates);
      const stamp = new Date().toISOString();
      if (inp.existing) {
        const { id, date } = inp.existing;
        cache.patch(date, (d) => ({ ...d, foods: d.foods.filter((x) => x.id !== id), meals: d.meals.filter((x) => x.id !== id) }));
      }
      const single = inp.items.length === 1 && inp.existing?.kind !== "meal" && !inp.fromMealId;
      if (single) {
        const it = inp.items[0];
        const entry = {
          id: inp.existing?.id ?? tmpId(), food_id: it.food_id, food_name_snapshot: it.name, serving_description_snapshot: it.serving_description,
          servings: it.qty, calories_per_serving: it.calories, protein_per_serving: it.protein, ...nutrientColumns(it.nutrients),
          total_calories: it.qty * it.calories, total_protein: it.qty * it.protein, ...totalColumns(it.nutrients, it.qty),
          notes: inp.notes, logged_at: inp.loggedAt, log_date: inp.date, created_at: stamp,
        } as unknown as FoodLog;
        cache.patch(inp.date, (d) => ({ ...d, foods: byTime([...d.foods, entry]) }));
      } else {
        const per = sumItems(inp.items.map((i) => ({ qty: i.qty, calories: i.calories, protein: i.protein, nutrients: i.nutrients })));
        const s = inp.mealServings ?? 1;
        const entry = {
          id: inp.existing?.id ?? tmpId(), meal_id: inp.fromMealId ?? null, meal_name_snapshot: inp.comboName, servings: s,
          calories_per_serving: per.calories, protein_per_serving: per.protein, ...nutrientColumns(per.nutrients),
          total_calories: per.calories * s, total_protein: per.protein * s, ...totalColumns(per.nutrients, s),
          notes: inp.notes, logged_at: inp.loggedAt, log_date: inp.date,
          meal_log_items: inp.items.map((i) => ({
            id: tmpId(), food_name_snapshot: i.name, serving_description_snapshot: i.serving_description, serving_quantity: i.qty,
            calories_per_serving_snapshot: i.calories, protein_per_serving_snapshot: i.protein, ...nutrientColumns(i.nutrients, "_per_serving_snapshot"),
          })),
        } as unknown as MealLog;
        cache.patch(inp.date, (d) => ({ ...d, meals: byTime([...d.meals, entry]) }));
      }
      return { snap };
    },
    onError: (e, _v, ctx) => { cache.restore(ctx?.snap); toast(messageOf(e)); },
    onSettled: (_d, _e, inp) => {
      cache.settle([inp.date, ...(inp.existing ? [inp.existing.date] : [])]);
      if (inp.existing) { qc.invalidateQueries({ queryKey: ["log"] }); }
    },
  });
}

export type DeleteInput = { kind: "food" | "meal" | "activity"; id: string; date: string };

export function useDeleteEntry() {
  const sb = useSupabase();
  const qc = useQueryClient();
  const toast = useToast();
  const cache = dayCache(qc);
  return useMutation({
    networkMode: "always",
    mutationFn: async ({ kind, id }: DeleteInput) => {
      assertOnline();
      if (isTmp(id)) return;
      const table = kind === "food" ? "food_logs" : kind === "meal" ? "meal_logs" : "activity_logs";
      const { error } = await sb.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ kind, id, date }) => {
      const snap = await cache.snapshot([date]);
      cache.patch(date, (d) => ({
        foods: kind === "food" ? d.foods.filter((x) => x.id !== id) : d.foods,
        meals: kind === "meal" ? d.meals.filter((x) => x.id !== id) : d.meals,
        activities: kind === "activity" ? d.activities.filter((x) => x.id !== id) : d.activities,
      }));
      return { snap };
    },
    onError: (_e, _v, ctx) => { cache.restore(ctx?.snap); toast("Couldn't delete that. Please try again."); },
    onSettled: (_d, _e, v) => cache.settle([v.date]),
  });
}

/* ───────────── cardio ───────────── */

export type ActivityInput = {
  id?: string; oldDate?: string; date: string; loggedAt: string; name: string; type: string;
  minutes: number; calories: number; source: string; notes: string | null;
};

export function useSaveActivity() {
  const sb = useSupabase();
  const qc = useQueryClient();
  const { userId } = useApp();
  const toast = useToast();
  const cache = dayCache(qc);
  return useMutation({
    networkMode: "always",
    mutationFn: async (a: ActivityInput) => {
      assertOnline();
      const row = {
        activity_name: a.name, activity_type: a.type, duration_minutes: Math.round(a.minutes), calories_burned: a.calories,
        calorie_source: a.source, notes: a.notes, logged_at: a.loggedAt, log_date: a.date,
      };
      const { error } = a.id
        ? await sb.from("activity_logs").update(row).eq("id", a.id)
        : await sb.from("activity_logs").insert({ ...row, user_id: userId });
      if (error) throw error;
    },
    onMutate: async (a) => {
      const snap = await cache.snapshot([a.date, ...(a.oldDate ? [a.oldDate] : [])]);
      if (a.id && a.oldDate) cache.patch(a.oldDate, (d) => ({ ...d, activities: d.activities.filter((x) => x.id !== a.id) }));
      const entry = {
        id: a.id ?? tmpId(), activity_name: a.name, activity_type: a.type, duration_minutes: Math.round(a.minutes),
        calories_burned: a.calories, calorie_source: a.source, notes: a.notes, logged_at: a.loggedAt, log_date: a.date,
      } as ActivityLog;
      cache.patch(a.date, (d) => ({ ...d, activities: byTime([...d.activities.filter((x) => x.id !== entry.id), entry]) }));
      return { snap };
    },
    onError: (e, _v, ctx) => { cache.restore(ctx?.snap); toast(messageOf(e)); },
    onSettled: (_d, _e, a) => { cache.settle([a.date, ...(a.oldDate ? [a.oldDate] : [])]); qc.invalidateQueries({ queryKey: ["log"] }); },
  });
}

/* ───────────── saved foods and meals ───────────── */

export type FoodInput = { id?: string; name: string; serving: string | null; calories: number; protein: number; nutrients: Nutrients };

export function useSaveFood() {
  const sb = useSupabase();
  const qc = useQueryClient();
  const { userId } = useApp();
  return useMutation({
    networkMode: "always",
    mutationFn: async (f: FoodInput) => {
      assertOnline();
      const row = { name: f.name, serving_description: f.serving, calories_per_serving: f.calories, protein_per_serving: f.protein, ...nutrientColumns(f.nutrients) };
      const { error } = f.id ? await sb.from("foods").update(row).eq("id", f.id) : await sb.from("foods").insert({ ...row, user_id: userId });
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.foods }),
  });
}

export function useDeleteFood() {
  const sb = useSupabase();
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    networkMode: "always",
    mutationFn: async (id: string) => {
      assertOnline();
      // Logged entries and meals keep their own copy of the values, so history is unaffected.
      const { error } = await sb.from("foods").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.foods });
      const prev = qc.getQueryData<Food[]>(qk.foods);
      qc.setQueryData<Food[]>(qk.foods, (l) => l?.filter((f) => f.id !== id));
      return { prev };
    },
    onError: (e, _v, ctx) => { qc.setQueryData(qk.foods, ctx?.prev); toast(messageOf(e)); },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.foods }),
  });
}

export type MealInput = { id?: string; name: string; items: ItemInput[] };

export function useSaveMeal() {
  const sb = useSupabase();
  const qc = useQueryClient();
  const { userId } = useApp();
  return useMutation({
    networkMode: "always",
    mutationFn: async (m: MealInput) => {
      assertOnline();
      let mealId = m.id;
      let oldIds: string[] = [];
      if (mealId) {
        const { data } = await sb.from("meal_items").select("id").eq("meal_id", mealId);
        oldIds = (data ?? []).map((r) => r.id);
        const { error } = await sb.from("meals").update({ name: m.name }).eq("id", mealId);
        if (error) throw error;
      } else {
        const { data, error } = await sb.from("meals").insert({ user_id: userId, name: m.name }).select("id").single();
        if (error || !data) throw error ?? new Error("insert failed");
        mealId = data.id;
      }
      const { error } = await sb.from("meal_items").insert(m.items.map((i) => ({
        meal_id: mealId, user_id: userId, food_id: i.food_id, food_name_snapshot: i.name, serving_description_snapshot: i.serving_description,
        calories_per_serving_snapshot: i.calories, protein_per_serving_snapshot: i.protein, serving_quantity: i.qty,
        ...nutrientColumns(i.nutrients, "_per_serving_snapshot"),
      })));
      if (error) throw error;
      if (oldIds.length) await sb.from("meal_items").delete().in("id", oldIds);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.meals }),
  });
}

export function useDeleteMeal() {
  const sb = useSupabase();
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    networkMode: "always",
    mutationFn: async (id: string) => {
      assertOnline();
      const { error } = await sb.from("meals").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.meals });
      const prev = qc.getQueryData<Meal[]>(qk.meals);
      qc.setQueryData<Meal[]>(qk.meals, (l) => l?.filter((m) => m.id !== id));
      return { prev };
    },
    onError: (e, _v, ctx) => { qc.setQueryData(qk.meals, ctx?.prev); toast(messageOf(e)); },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.meals }),
  });
}

/** Logging a saved meal: the meal's values are copied into the diary entry. */
export function mealToItems(meal: Meal): ItemInput[] {
  return meal.meal_items.map((i) => ({
    food_id: i.food_id, name: i.food_name_snapshot, serving_description: i.serving_description_snapshot,
    calories: Number(i.calories_per_serving_snapshot), protein: Number(i.protein_per_serving_snapshot),
    nutrients: readNutrients(i as unknown as Record<string, unknown>, "_per_serving_snapshot"), qty: Number(i.serving_quantity),
  }));
}

/* ───────────── friends ───────────── */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

function useFriendRefresh() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: qk.friendships });
    qc.invalidateQueries({ queryKey: ["friend-cards"] });
    qc.invalidateQueries({ queryKey: qk.friendPerms });
    qc.invalidateQueries({ queryKey: ["friend-search"] });
  };
}

export function useSendRequest() {
  const sb = useSupabase();
  const { userId } = useApp();
  const toast = useToast();
  const refresh = useFriendRefresh();
  return useMutation({
    networkMode: "always",
    mutationFn: async (other: string): Promise<string> => {
      assertOnline();
      if (!UUID.test(other)) throw new AppError("Something went wrong. Try again.");
      if (other === userId) throw new AppError("You can't add yourself.");
      const { data: existing } = await sb.from("friendships").select("id, status, requester_id, recipient_id, updated_at")
        .or(`and(requester_id.eq.${userId},recipient_id.eq.${other}),and(requester_id.eq.${other},recipient_id.eq.${userId})`).maybeSingle();
      if (existing) {
        if (existing.status === "accepted") return "You're already friends.";
        if (existing.status === "pending") {
          if (existing.recipient_id === userId) {
            const { error } = await sb.from("friendships").update({ status: "accepted" }).eq("id", existing.id);
            if (error) throw error;
            return "You're now friends.";
          }
          return "Request already sent.";
        }
        if (existing.requester_id === userId && Date.now() - Date.parse(existing.updated_at) < COOLDOWN_MS) {
          throw new AppError("You can't send this person a request right now.");
        }
        await sb.from("friendships").delete().eq("id", existing.id);
      }
      const { error } = await sb.from("friendships").insert({ requester_id: userId, recipient_id: other });
      if (error) {
        if (String(error.message).includes("Too many")) throw new AppError("You've sent a lot of requests. Try again later.");
        throw error;
      }
      return "Request sent.";
    },
    onSuccess: (msg) => toast(msg, "success"),
    onError: (e) => toast(messageOf(e)),
    onSettled: refresh,
  });
}

export function useRespondToRequest() {
  const sb = useSupabase();
  const qc = useQueryClient();
  const toast = useToast();
  const refresh = useFriendRefresh();
  return useMutation({
    networkMode: "always",
    mutationFn: async ({ id, decision }: { id: string; decision: "accept" | "reject" }) => {
      assertOnline();
      const { data, error } = await sb.from("friendships").update({ status: decision === "accept" ? "accepted" : "rejected" })
        .eq("id", id).eq("status", "pending").select("id");
      if (error) throw error;
      if (!data?.length) throw new AppError("That request is no longer available.");
    },
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: qk.friendships });
      const prev = qc.getQueryData<FriendshipRow[]>(qk.friendships);
      qc.setQueryData<FriendshipRow[]>(qk.friendships, (l) => l?.filter((r) => r.friendship_id !== id));
      return { prev };
    },
    onError: (e, _v, ctx) => { qc.setQueryData(qk.friendships, ctx?.prev); toast(messageOf(e)); },
    onSettled: refresh,
  });
}

/** Remove a friend, or cancel a request you sent. */
export function useRemoveFriendship() {
  const sb = useSupabase();
  const qc = useQueryClient();
  const toast = useToast();
  const refresh = useFriendRefresh();
  return useMutation({
    networkMode: "always",
    mutationFn: async (id: string) => {
      assertOnline();
      const { error } = await sb.from("friendships").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.friendships });
      const prev = qc.getQueryData<FriendshipRow[]>(qk.friendships);
      qc.setQueryData<FriendshipRow[]>(qk.friendships, (l) => l?.filter((r) => r.friendship_id !== id));
      return { prev };
    },
    onError: (e, _v, ctx) => { qc.setQueryData(qk.friendships, ctx?.prev); toast(messageOf(e)); },
    onSettled: refresh,
  });
}

export function useSavePerms() {
  const sb = useSupabase();
  const qc = useQueryClient();
  const { userId } = useApp();
  const toast = useToast();
  const refresh = useFriendRefresh();
  return useMutation({
    networkMode: "always",
    mutationFn: async (p: FriendPerms) => {
      assertOnline();
      const { error } = await sb.from("friend_permissions").upsert({ owner_id: userId, ...p }, { onConflict: "owner_id,friend_id" });
      if (error) throw error;
    },
    onMutate: async (p) => {
      await qc.cancelQueries({ queryKey: qk.friendPerms });
      const prev = qc.getQueryData<FriendPerms[]>(qk.friendPerms);
      qc.setQueryData<FriendPerms[]>(qk.friendPerms, (l) => [...(l ?? []).filter((x) => x.friend_id !== p.friend_id), p]);
      return { prev };
    },
    onError: (e, _v, ctx) => { qc.setQueryData(qk.friendPerms, ctx?.prev); toast(messageOf(e)); },
    onSettled: refresh,
  });
}

export function useResetPerms() {
  const sb = useSupabase();
  const qc = useQueryClient();
  const { userId } = useApp();
  const toast = useToast();
  const refresh = useFriendRefresh();
  return useMutation({
    networkMode: "always",
    mutationFn: async (friendId: string) => {
      assertOnline();
      const { error } = await sb.from("friend_permissions").delete().eq("owner_id", userId).eq("friend_id", friendId);
      if (error) throw error;
    },
    onMutate: async (friendId) => {
      await qc.cancelQueries({ queryKey: qk.friendPerms });
      const prev = qc.getQueryData<FriendPerms[]>(qk.friendPerms);
      qc.setQueryData<FriendPerms[]>(qk.friendPerms, (l) => l?.filter((x) => x.friend_id !== friendId));
      return { prev };
    },
    onError: (e, _v, ctx) => { qc.setQueryData(qk.friendPerms, ctx?.prev); toast(messageOf(e)); },
    onSettled: refresh,
  });
}
