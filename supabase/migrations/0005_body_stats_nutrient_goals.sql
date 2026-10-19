-- Phase 6: body stats (for cardio calories), optional nutrient goals, running deficit totals.
-- Run once in the Supabase SQL editor. Safe to re-run.

-- ───────────── body stats + optional nutrient goals on the profile ─────────────
-- Profiles are only readable by their owner, so these stay private.
alter table public.profiles
  add column if not exists height_cm numeric(5,1) check (height_cm between 100 and 250),
  add column if not exists weight_kg numeric(5,1) check (weight_kg between 30 and 300),
  add column if not exists sex text check (sex in ('male','female')),
  -- e.g. {"sugar": 50, "fiber": 30}. Empty means no extra goals. Keys: carbs, sugar, fat, sat_fat, fiber, salt (grams).
  add column if not exists nutrient_goals jsonb not null default '{}'::jsonb
    check (jsonb_typeof(nutrient_goals) = 'object');

-- ───────────── cardio: remember intensity, allow "calculated" as a source ─────────────
alter table public.activity_logs
  add column if not exists intensity text check (intensity in ('light','moderate','vigorous'));

do $$
declare c text;
begin
  -- Drop whatever the old calorie_source check is called, then add the widened one.
  for c in
    select con.conname from pg_constraint con
    where con.conrelid = 'public.activity_logs'::regclass
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%calorie_source%'
  loop
    execute format('alter table public.activity_logs drop constraint %I', c);
  end loop;
  alter table public.activity_logs add constraint activity_logs_calorie_source_check
    check (calorie_source in ('manual','apple_health','smartwatch','machine','other','calculated'));
end $$;

-- ───────────── per-day totals for the signed-in user ─────────────
-- One row per day that has any entry. Used for the "deficit since goal start" card.
-- security invoker: row level security still limits this to your own rows.
create or replace function public.my_daily_totals(from_d date, to_d date)
returns table (log_date date, food_calories numeric, protein numeric, exercise_calories numeric)
language sql stable security invoker set search_path = '' as $$
  select t.d, sum(t.food), sum(t.protein), sum(t.exercise)
  from (
    select f.log_date as d, f.total_calories as food, f.total_protein as protein, 0::numeric as exercise
      from public.food_logs f
      where f.user_id = (select auth.uid()) and f.log_date between from_d and to_d
    union all
    select m.log_date, m.total_calories, m.total_protein, 0::numeric
      from public.meal_logs m
      where m.user_id = (select auth.uid()) and m.log_date between from_d and to_d
    union all
    select a.log_date, 0::numeric, 0::numeric, a.calories_burned::numeric
      from public.activity_logs a
      where a.user_id = (select auth.uid()) and a.log_date between from_d and to_d
  ) t
  group by t.d
  order by t.d
$$;
revoke all on function public.my_daily_totals(date, date) from public, anon;
grant execute on function public.my_daily_totals(date, date) to authenticated;
