import type { NutrientGoals } from "./nutrition";

export type Privacy = {
  share_summary: boolean;
  share_exercise: boolean;
  share_history: boolean;
  share_goal: boolean;
};

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  sex: "male" | "female" | null;
  /** Optional daily goals for carbs, sugar, added_sugar, fat, sat_fat, fiber (grams). Empty = none set. */
  nutrient_goals: NutrientGoals;
  maintenance_calories: number | null;
  max_food_calories: number | null;
  net_calorie_target: number | null;
  protein_goal: number | null;
  goal_description: string | null;
  goal_personal_target: string | null;
  goal_start_date: string | null;
  goal_target_date: string | null;
  privacy_settings: Privacy;
  preferences: { theme?: "dark" | "light"; effects?: boolean; accent?: string };
  onboarded: boolean;
};

export type PerServingCols = {
  carbs_per_serving: number; sugar_per_serving: number; fat_per_serving: number;
  sat_fat_per_serving: number; fiber_per_serving: number; added_sugar_per_serving: number;
};
export type SnapshotCols = {
  carbs_per_serving_snapshot: number; sugar_per_serving_snapshot: number; fat_per_serving_snapshot: number;
  sat_fat_per_serving_snapshot: number; fiber_per_serving_snapshot: number; added_sugar_per_serving_snapshot: number;
};
export type TotalCols = {
  total_carbs: number; total_sugar: number; total_fat: number; total_sat_fat: number; total_fiber: number; total_added_sugar: number;
};

export type Food = PerServingCols & {
  id: string;
  name: string;
  calories_per_serving: number;
  protein_per_serving: number;
  serving_description: string | null;
};

export type MealItem = SnapshotCols & {
  id: string;
  meal_id: string;
  food_id: string | null;
  food_name_snapshot: string;
  serving_description_snapshot: string | null;
  calories_per_serving_snapshot: number;
  protein_per_serving_snapshot: number;
  serving_quantity: number;
};

export type Meal = { id: string; name: string; meal_items: MealItem[] };

export type FoodLog = PerServingCols & TotalCols & {
  id: string;
  food_id: string | null;
  food_name_snapshot: string;
  serving_description_snapshot: string | null;
  servings: number;
  calories_per_serving: number;
  protein_per_serving: number;
  total_calories: number;
  total_protein: number;
  notes: string | null;
  logged_at: string;
  log_date: string;
};

export type MealLogItem = SnapshotCols & {
  id: string;
  food_name_snapshot: string;
  serving_description_snapshot: string | null;
  serving_quantity: number;
  calories_per_serving_snapshot: number;
  protein_per_serving_snapshot: number;
};

export type MealLog = PerServingCols & TotalCols & {
  notes: string | null;
  id: string;
  meal_id: string | null;
  meal_name_snapshot: string;
  servings: number;
  calories_per_serving: number;
  protein_per_serving: number;
  total_calories: number;
  total_protein: number;
  logged_at: string;
  log_date: string;
  meal_log_items: MealLogItem[];
};

export type ActivityLog = {
  id: string;
  activity_name: string;
  activity_type: string;
  duration_minutes: number;
  calories_burned: number;
  calorie_source: string;
  /** km/h for walking, running and cycling; steps per minute for stair climbing */
  speed: number | null;
  incline_pct: number | null;
  resistance: number | null;
  distance: number | null;
  distance_unit: "km" | "m" | "floors" | null;
  notes: string | null;
  logged_at: string;
  log_date: string;
};

export const ACTIVITY_PRESETS = [
  { type: "running", name: "Running" },
  { type: "walking", name: "Walking" },
  { type: "cycling", name: "Cycling" },
  { type: "swimming", name: "Swimming" },
  { type: "stair_climbing", name: "Stair climbing" },
  { type: "other_cardio", name: "Other cardio" },
] as const;

export const CALORIE_SOURCES = [
  { value: "calculated", label: "Calculated by FitTrack" },
  { value: "manual", label: "My own estimate" },
  { value: "apple_health", label: "Apple Health" },
  { value: "smartwatch", label: "Smartwatch" },
  { value: "machine", label: "Treadmill or machine" },
  { value: "other", label: "Other" },
] as const;

export type FriendCardData = {
  friendship_id: string;
  friend_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  share_summary: boolean;
  share_exercise: boolean;
  share_goal: boolean;
  share_history: boolean;
  food_calories: number | null;
  protein: number | null;
  carbs: number | null;
  sugar: number | null;
  fat: number | null;
  exercise_calories: number | null;
  max_food_calories: number | null;
  protein_goal: number | null;
  net_calorie_target: number | null;
  goal_description: string | null;
  goal_personal_target: string | null;
  goal_start_date: string | null;
  goal_target_date: string | null;
};

export type FriendshipRow = {
  friendship_id: string;
  other_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  status: "pending" | "accepted";
  incoming: boolean;
};

export type DayTotals = { date: string; food: number; protein: number; exercise: number | null };

export type FriendOrder = { friend_id: string; position: number };
export type FriendPerms = { friend_id: string; share_summary: boolean; share_exercise: boolean; share_history: boolean; share_goal: boolean };
