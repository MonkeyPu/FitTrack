import { z } from "zod";
import { ACTIVITY_PRESETS, CALORIE_SOURCES } from "@/lib/types";

const emptyToUndef = (v: unknown) => (v === "" || v === null ? undefined : v);

export const reqNum = (min: number, max: number, label: string) =>
  z.preprocess(
    emptyToUndef,
    z.coerce
      .number({ invalid_type_error: `Enter a valid ${label}` })
      .finite()
      .min(min, `${label} must be at least ${min}`)
      .max(max, `${label} must be at most ${max}`),
  );

export const optNum = (min: number, max: number, label: string) =>
  z.preprocess(
    emptyToUndef,
    z.coerce
      .number({ invalid_type_error: `Enter a valid ${label}` })
      .finite()
      .min(min, `${label} must be at least ${min}`)
      .max(max, `${label} must be at most ${max}`)
      .optional(),
  );

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date");
const optDate = z.preprocess(emptyToUndef, dateStr.optional());
const optText = (max: number) => z.string().trim().max(max, `Keep this under ${max} characters`).optional();
const checkbox = z.preprocess((v) => v === "on" || v === "true", z.boolean());

export const username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,20}$/, "Username must be 3–20 letters, numbers or underscores");
export const displayName = z.string().trim().min(1, "Enter a display name").max(40, "Keep it under 40 characters");

export const targetsShape = {
  maintenance_calories: reqNum(800, 8000, "maintenance calories"),
  max_food_calories: reqNum(800, 8000, "maximum food calories"),
  net_calorie_target: reqNum(0, 8000, "net calorie target"),
  protein_goal: reqNum(0, 500, "protein goal"),
};
export const goalShape = {
  goal_description: optText(200),
  goal_personal_target: optText(200),
  goal_start_date: optDate,
  goal_target_date: optDate,
};
export const checkGoalDates = (v: { goal_start_date?: string; goal_target_date?: string }) =>
  !v.goal_start_date || !v.goal_target_date || v.goal_target_date >= v.goal_start_date;
const goalDatesMsg = { message: "Target date must be on or after the start date", path: ["goal_target_date"] };

export const targetsSchema = z.object(targetsShape);
export const goalSchema = z.object(goalShape).refine(checkGoalDates, goalDatesMsg);
export const accountSchema = z.object({
  display_name: displayName,
  username,
  avatar_url: z.preprocess(emptyToUndef, z.string().url().optional()),
});
export const onboardingSchema = z
  .object({
    ...accountSchema.shape,
    age: optNum(10, 100, "age"),
    ...targetsShape,
    ...goalShape,
  })
  .refine(checkGoalDates, goalDatesMsg);

const id = z.string().uuid();
const optId = z.preprocess(emptyToUndef, id.optional());

export const foodSchema = z.object({
  id: optId,
  name: z.string().trim().min(1, "Enter a food name").max(100),
  serving_description: optText(100),
  calories_per_serving: reqNum(0, 10000, "calories"),
  protein_per_serving: optNum(0, 1000, "protein"),
});

export const foodEntrySchema = z.object({
  id: optId,
  food_id: optId,
  name: z.string().trim().min(1, "Enter a food name").max(100),
  serving_description: optText(100),
  calories_per_serving: reqNum(0, 10000, "calories"),
  protein_per_serving: optNum(0, 1000, "protein"),
  servings: reqNum(0.01, 100, "servings"),
  notes: optText(500),
  log_date: dateStr,
  logged_at: z.string().datetime({ message: "Choose a valid time" }),
  save_to_library: checkbox,
});

export const mealLogSchema = z.object({
  meal_id: id,
  servings: reqNum(0.01, 100, "servings"),
  log_date: dateStr,
  logged_at: z.string().datetime({ message: "Choose a valid time" }),
});

export const activitySchema = z.object({
  id: optId,
  activity_name: z.string().trim().min(1, "Enter an activity name").max(60),
  activity_type: z.enum(ACTIVITY_PRESETS.map((p) => p.type) as [string, ...string[]]),
  duration_minutes: reqNum(1, 1440, "duration"),
  calories_burned: reqNum(0, 10000, "calories burned"),
  calorie_source: z.enum(CALORIE_SOURCES.map((s) => s.value) as [string, ...string[]]),
  notes: optText(500),
  log_date: dateStr,
  logged_at: z.string().datetime({ message: "Choose a valid time" }),
});

export const mealItemSchema = z.object({
  food_id: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(1).max(100),
  serving_description: z.string().trim().max(100).nullable().optional(),
  calories_per_serving: z.number().finite().min(0).max(10000),
  protein_per_serving: z.number().finite().min(0).max(1000),
  serving_quantity: z.number().finite().min(0.01).max(100),
});
export const mealSchema = z.object({
  id: optId,
  name: z.string().trim().min(1, "Name your meal").max(100),
  items: z.string().transform((s, ctx) => {
    try {
      return JSON.parse(s);
    } catch {
      ctx.addIssue({ code: "custom", message: "Add at least one food" });
      return z.NEVER;
    }
  }).pipe(z.array(mealItemSchema).min(1, "Add at least one food").max(40, "A meal can have up to 40 foods")),
});

export const idOnly = z.object({ id });
