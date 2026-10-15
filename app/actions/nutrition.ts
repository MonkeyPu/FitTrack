"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/data";
import { firstError, safeNext, type State } from "@/lib/action-helpers";
import { foodEntrySchema, foodSchema, idOnly, mealLogSchema, mealSchema } from "@/lib/validation";

const FAILED = "Couldn't save that. Check your connection and try again.";
const refresh = () => revalidatePath("/", "layout");

/* ───────────── diary: food entries ───────────── */

export async function saveFoodLog(_: State, fd: FormData): Promise<State> {
  const { supabase, user } = await requireUser();
  const p = foodEntrySchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: firstError(p.error) };
  const v = p.data;

  let foodId = v.food_id ?? null;
  if (!v.id && v.save_to_library && !foodId) {
    const { data } = await supabase
      .from("foods")
      .insert({
        user_id: user.id,
        name: v.name,
        serving_description: v.serving_description || null,
        calories_per_serving: v.calories_per_serving,
        protein_per_serving: v.protein_per_serving ?? 0,
      })
      .select("id")
      .single();
    foodId = data?.id ?? null;
  }

  const row = {
    food_id: foodId,
    food_name_snapshot: v.name,
    serving_description_snapshot: v.serving_description || null,
    servings: v.servings,
    calories_per_serving: v.calories_per_serving,
    protein_per_serving: v.protein_per_serving ?? 0,
    notes: v.notes || null,
    logged_at: v.logged_at,
    log_date: v.log_date,
  };
  const { error } = v.id
    ? await supabase.from("food_logs").update(row).eq("id", v.id).eq("user_id", user.id)
    : await supabase.from("food_logs").insert({ ...row, user_id: user.id });
  if (error) return { error: FAILED };

  refresh();
  redirect(safeNext(fd.get("next"), `/?date=${v.log_date}`));
}

export async function deleteFoodLog(fd: FormData) {
  const { supabase, user } = await requireUser();
  const p = idOnly.safeParse(Object.fromEntries(fd));
  if (!p.success) return;
  await supabase.from("food_logs").delete().eq("id", p.data.id).eq("user_id", user.id);
  refresh();
}

/* ───────────── diary: meal entries ───────────── */

export async function logMeal(_: State, fd: FormData): Promise<State> {
  const { supabase, user } = await requireUser();
  const p = mealLogSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: firstError(p.error) };
  const v = p.data;

  // Values come from the database, not the browser, and are copied as a snapshot.
  const { data: meal } = await supabase
    .from("meals")
    .select("id, name, meal_items(*)")
    .eq("id", v.meal_id)
    .eq("user_id", user.id)
    .single();
  if (!meal || !meal.meal_items?.length) return { error: "That meal has no foods in it." };

  const items = meal.meal_items;
  const calPer = items.reduce((a, i) => a + i.serving_quantity * i.calories_per_serving_snapshot, 0);
  const proPer = items.reduce((a, i) => a + i.serving_quantity * i.protein_per_serving_snapshot, 0);

  const { data: log, error } = await supabase
    .from("meal_logs")
    .insert({
      user_id: user.id,
      meal_id: meal.id,
      meal_name_snapshot: meal.name,
      servings: v.servings,
      calories_per_serving: calPer,
      protein_per_serving: proPer,
      logged_at: v.logged_at,
      log_date: v.log_date,
    })
    .select("id")
    .single();
  if (error || !log) return { error: FAILED };

  const { error: itemsError } = await supabase.from("meal_log_items").insert(
    items.map((i) => ({
      meal_log_id: log.id,
      user_id: user.id,
      food_name_snapshot: i.food_name_snapshot,
      serving_description_snapshot: i.serving_description_snapshot,
      serving_quantity: i.serving_quantity,
      calories_per_serving_snapshot: i.calories_per_serving_snapshot,
      protein_per_serving_snapshot: i.protein_per_serving_snapshot,
    })),
  );
  if (itemsError) {
    await supabase.from("meal_logs").delete().eq("id", log.id).eq("user_id", user.id);
    return { error: FAILED };
  }

  refresh();
  redirect(safeNext(fd.get("next"), `/?date=${v.log_date}`));
}

export async function deleteMealLog(fd: FormData) {
  const { supabase, user } = await requireUser();
  const p = idOnly.safeParse(Object.fromEntries(fd));
  if (!p.success) return;
  await supabase.from("meal_logs").delete().eq("id", p.data.id).eq("user_id", user.id);
  refresh();
}

/* ───────────── saved foods ───────────── */

export async function saveFood(_: State, fd: FormData): Promise<State> {
  const { supabase, user } = await requireUser();
  const p = foodSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: firstError(p.error) };
  const v = p.data;
  const row = {
    name: v.name,
    serving_description: v.serving_description || null,
    calories_per_serving: v.calories_per_serving,
    protein_per_serving: v.protein_per_serving ?? 0,
  };
  const { error } = v.id
    ? await supabase.from("foods").update(row).eq("id", v.id).eq("user_id", user.id)
    : await supabase.from("foods").insert({ ...row, user_id: user.id });
  if (error) return { error: FAILED };
  refresh();
  redirect("/library/foods");
}

export async function deleteFood(fd: FormData) {
  const { supabase, user } = await requireUser();
  const p = idOnly.safeParse(Object.fromEntries(fd));
  if (!p.success) return;
  // Logged entries and meals keep their own snapshots, so history is unaffected.
  await supabase.from("foods").delete().eq("id", p.data.id).eq("user_id", user.id);
  refresh();
  redirect("/library/foods");
}

/* ───────────── saved meals ───────────── */

export async function saveMeal(_: State, fd: FormData): Promise<State> {
  const { supabase, user } = await requireUser();
  const p = mealSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: firstError(p.error) };
  const v = p.data;

  let mealId = v.id;
  let oldItemIds: string[] = [];
  if (mealId) {
    const { data: existing } = await supabase.from("meal_items").select("id").eq("meal_id", mealId).eq("user_id", user.id);
    oldItemIds = (existing ?? []).map((r) => r.id);
    const { error } = await supabase.from("meals").update({ name: v.name }).eq("id", mealId).eq("user_id", user.id);
    if (error) return { error: FAILED };
  } else {
    const { data, error } = await supabase.from("meals").insert({ user_id: user.id, name: v.name }).select("id").single();
    if (error || !data) return { error: FAILED };
    mealId = data.id;
  }

  const { error: insertError } = await supabase.from("meal_items").insert(
    v.items.map((i) => ({
      meal_id: mealId,
      user_id: user.id,
      food_id: i.food_id ?? null,
      food_name_snapshot: i.name,
      serving_description_snapshot: i.serving_description || null,
      calories_per_serving_snapshot: i.calories_per_serving,
      protein_per_serving_snapshot: i.protein_per_serving,
      serving_quantity: i.serving_quantity,
    })),
  );
  if (insertError) return { error: FAILED };

  // Remove the previous items only after the new ones were stored.
  if (oldItemIds.length) await supabase.from("meal_items").delete().in("id", oldItemIds).eq("user_id", user.id);

  refresh();
  redirect("/library/meals");
}

export async function deleteMeal(fd: FormData) {
  const { supabase, user } = await requireUser();
  const p = idOnly.safeParse(Object.fromEntries(fd));
  if (!p.success) return;
  await supabase.from("meals").delete().eq("id", p.data.id).eq("user_id", user.id);
  refresh();
  redirect("/library/meals");
}
