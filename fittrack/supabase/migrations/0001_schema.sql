-- FitTrack schema (phases 1-3). Run in the Supabase SQL editor, or with `supabase db push`.

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ───────────── profiles ─────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null check (char_length(display_name) between 1 and 40),
  avatar_url text,
  age int check (age between 10 and 100),
  maintenance_calories int check (maintenance_calories between 800 and 8000),
  max_food_calories int check (max_food_calories between 800 and 8000),
  net_calorie_target int check (net_calorie_target between 0 and 8000),
  protein_goal int check (protein_goal between 0 and 500),
  goal_description text check (char_length(goal_description) <= 200),
  goal_personal_target text check (char_length(goal_personal_target) <= 200),
  goal_start_date date,
  goal_target_date date,
  -- Everything is private until the user opts in.
  privacy_settings jsonb not null default
    '{"share_summary":false,"share_exercise":false,"share_history":false,"share_goal":false}',
  preferences jsonb not null default '{"theme":"dark"}',
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (goal_start_date is null or goal_target_date is null or goal_target_date >= goal_start_date)
);
create unique index profiles_username_key on public.profiles (username);
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- History of target values, so charts can show which targets were active when.
create table public.target_changes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  changed_at timestamptz not null default now(),
  maintenance_calories int,
  max_food_calories int,
  net_calorie_target int,
  protein_goal int
);
create index target_changes_user_idx on public.target_changes (user_id, changed_at);

create or replace function public.record_target_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' or
     (new.maintenance_calories, new.max_food_calories, new.net_calorie_target, new.protein_goal)
     is distinct from
     (old.maintenance_calories, old.max_food_calories, old.net_calorie_target, old.protein_goal)
  then
    insert into public.target_changes
      (user_id, maintenance_calories, max_food_calories, net_calorie_target, protein_goal)
    values
      (new.id, new.maintenance_calories, new.max_food_calories, new.net_calorie_target, new.protein_goal);
  end if;
  return new;
end $$;
create trigger profiles_target_history after insert or update on public.profiles
  for each row execute function public.record_target_change();

-- ───────────── saved foods and meals ─────────────
create table public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  calories_per_serving numeric(8,2) not null check (calories_per_serving between 0 and 10000),
  protein_per_serving numeric(7,2) not null default 0 check (protein_per_serving between 0 and 1000),
  serving_description text check (char_length(serving_description) <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index foods_user_name_idx on public.foods (user_id, lower(name));
create trigger foods_updated before update on public.foods
  for each row execute function public.set_updated_at();

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index meals_user_idx on public.meals (user_id);
create trigger meals_updated before update on public.meals
  for each row execute function public.set_updated_at();

-- Meal items keep their own copy (snapshot) of each ingredient's values.
create table public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  food_id uuid references public.foods (id) on delete set null,
  food_name_snapshot text not null,
  serving_description_snapshot text,
  calories_per_serving_snapshot numeric(8,2) not null check (calories_per_serving_snapshot >= 0),
  protein_per_serving_snapshot numeric(7,2) not null default 0 check (protein_per_serving_snapshot >= 0),
  serving_quantity numeric(6,2) not null check (serving_quantity > 0 and serving_quantity <= 100)
);
create index meal_items_meal_idx on public.meal_items (meal_id);

-- ───────────── diary logs ─────────────
-- Totals are generated columns, so they can never drift from servings x per-serving values.
create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  food_id uuid references public.foods (id) on delete set null,
  food_name_snapshot text not null check (char_length(food_name_snapshot) between 1 and 100),
  serving_description_snapshot text,
  servings numeric(6,2) not null check (servings > 0 and servings <= 100),
  calories_per_serving numeric(8,2) not null check (calories_per_serving between 0 and 10000),
  protein_per_serving numeric(7,2) not null default 0 check (protein_per_serving between 0 and 1000),
  total_calories numeric(12,4) generated always as (servings * calories_per_serving) stored,
  total_protein numeric(12,4) generated always as (servings * protein_per_serving) stored,
  notes text check (char_length(notes) <= 500),
  logged_at timestamptz not null default now(),
  log_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index food_logs_user_date_idx on public.food_logs (user_id, log_date, logged_at);
create trigger food_logs_updated before update on public.food_logs
  for each row execute function public.set_updated_at();

create table public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  meal_id uuid references public.meals (id) on delete set null,
  meal_name_snapshot text not null,
  servings numeric(6,2) not null check (servings > 0 and servings <= 100),
  calories_per_serving numeric(10,2) not null check (calories_per_serving >= 0),
  protein_per_serving numeric(9,2) not null default 0 check (protein_per_serving >= 0),
  total_calories numeric(12,4) generated always as (servings * calories_per_serving) stored,
  total_protein numeric(12,4) generated always as (servings * protein_per_serving) stored,
  logged_at timestamptz not null default now(),
  log_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index meal_logs_user_date_idx on public.meal_logs (user_id, log_date, logged_at);
create trigger meal_logs_updated before update on public.meal_logs
  for each row execute function public.set_updated_at();

create table public.meal_log_items (
  id uuid primary key default gen_random_uuid(),
  meal_log_id uuid not null references public.meal_logs (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  food_name_snapshot text not null,
  serving_description_snapshot text,
  serving_quantity numeric(6,2) not null,
  calories_per_serving_snapshot numeric(8,2) not null,
  protein_per_serving_snapshot numeric(7,2) not null default 0
);
create index meal_log_items_log_idx on public.meal_log_items (meal_log_id);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  activity_name text not null check (char_length(activity_name) between 1 and 60),
  activity_type text not null default 'other_cardio'
    check (activity_type in ('running','walking','cycling','swimming','stair_climbing','other_cardio')),
  duration_minutes int not null check (duration_minutes between 1 and 1440),
  calories_burned numeric(8,2) not null check (calories_burned between 0 and 10000),
  calorie_source text not null default 'manual'
    check (calorie_source in ('manual','apple_health','smartwatch','machine','other')),
  notes text check (char_length(notes) <= 500),
  logged_at timestamptz not null default now(),
  log_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index activity_logs_user_date_idx on public.activity_logs (user_id, log_date, logged_at);
create trigger activity_logs_updated before update on public.activity_logs
  for each row execute function public.set_updated_at();

-- ───────────── friendships (used from phase 4) ─────────────
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> recipient_id)
);
-- One row per pair, regardless of who asked first.
create unique index friendships_pair_key on public.friendships
  (least(requester_id, recipient_id), greatest(requester_id, recipient_id));
create index friendships_recipient_idx on public.friendships (recipient_id, status);
create index friendships_requester_idx on public.friendships (requester_id, status);

create or replace function public.friendships_guard() returns trigger
language plpgsql as $$
begin
  if new.requester_id <> old.requester_id or new.recipient_id <> old.recipient_id then
    raise exception 'Friendship parties cannot be changed';
  end if;
  new.updated_at = now();
  return new;
end $$;
create trigger friendships_guard before update on public.friendships
  for each row execute function public.friendships_guard();

-- Username search that exposes only public fields (never email or targets).
create or replace function public.search_profiles(q text)
returns table (id uuid, username text, display_name text, avatar_url text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.username, p.display_name, p.avatar_url
  from public.profiles p
  where length(q) >= 2
    and p.onboarded
    and p.id <> auth.uid()
    and p.username like lower(regexp_replace(q, '[^a-zA-Z0-9_]', '', 'g')) || '%'
  order by p.username
  limit 10
$$;
revoke all on function public.search_profiles(text) from public, anon;
grant execute on function public.search_profiles(text) to authenticated;

-- ───────────── avatar storage ─────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
