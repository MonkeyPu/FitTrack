-- Added sugar replaces salt, and cardio entries record the machine settings instead of "how hard".
-- Run once in the Supabase SQL editor. Safe to re-run.

-- ───────────── added sugar (grams) replaces salt ─────────────
-- Salt values already saved are removed. Added sugar starts at 0, which the app treats as "not recorded".
do $$
begin
  alter table public.foods add column if not exists added_sugar_per_serving numeric(7,2) not null default 0 check (added_sugar_per_serving between 0 and 1000);
  alter table public.meal_items add column if not exists added_sugar_per_serving_snapshot numeric(7,2) not null default 0 check (added_sugar_per_serving_snapshot >= 0);
  alter table public.meal_log_items add column if not exists added_sugar_per_serving_snapshot numeric(7,2) not null default 0 check (added_sugar_per_serving_snapshot >= 0);
  alter table public.food_logs add column if not exists added_sugar_per_serving numeric(7,2) not null default 0 check (added_sugar_per_serving between 0 and 1000);
  alter table public.meal_logs add column if not exists added_sugar_per_serving numeric(9,2) not null default 0 check (added_sugar_per_serving >= 0);
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'food_logs' and column_name = 'total_added_sugar') then
    alter table public.food_logs add column total_added_sugar numeric(12,4) generated always as (servings * added_sugar_per_serving) stored;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'meal_logs' and column_name = 'total_added_sugar') then
    alter table public.meal_logs add column total_added_sugar numeric(14,4) generated always as (servings * added_sugar_per_serving) stored;
  end if;
end $$;

-- Generated totals go first, because they are built from the per-serving columns.
alter table public.food_logs drop column if exists total_salt;
alter table public.meal_logs drop column if exists total_salt;
alter table public.foods drop column if exists salt_per_serving;
alter table public.meal_items drop column if exists salt_per_serving_snapshot;
alter table public.meal_log_items drop column if exists salt_per_serving_snapshot;
alter table public.food_logs drop column if exists salt_per_serving;
alter table public.meal_logs drop column if exists salt_per_serving;

update public.profiles set nutrient_goals = nutrient_goals - 'salt' where nutrient_goals ? 'salt';

-- ───────────── cardio: machine settings and distance ─────────────
-- speed: km/h for walking, running and cycling; steps per minute for stair climbing.
-- incline_pct: treadmill incline (the Precor TRM 833 goes 0-15% in 0.5% steps).
-- resistance: the resistance level set on a bike.
-- distance: in distance_unit (km, m or floors).
alter table public.activity_logs
  add column if not exists speed numeric(6,2) check (speed between 0 and 300),
  add column if not exists incline_pct numeric(4,1) check (incline_pct between 0 and 15),
  add column if not exists resistance numeric(5,1) check (resistance between 0 and 100),
  add column if not exists distance numeric(8,2) check (distance between 0 and 100000),
  add column if not exists distance_unit text check (distance_unit in ('km', 'm', 'floors'));

alter table public.activity_logs drop column if exists intensity;
