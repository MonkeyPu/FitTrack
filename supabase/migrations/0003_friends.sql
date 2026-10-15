-- Phase 4: friends. Friends never get direct table access. They read through the functions
-- below, which check (1) an accepted friendship and (2) the owner's privacy toggles.
-- Email, maintenance calories, notes and individual log rows are never exposed.

-- ───────────── request rate limiting ─────────────
-- Events are kept separately so deleting and re-sending a request doesn't reset the count.
create table public.friend_request_events (
  id bigint generated always as identity primary key,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index friend_request_events_idx on public.friend_request_events (requester_id, created_at);
alter table public.friend_request_events enable row level security;  -- no policies: not readable by clients

create or replace function public.friendships_rate_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare recent int; pending int;
begin
  select count(*) into recent from public.friend_request_events
    where requester_id = new.requester_id and created_at > now() - interval '1 hour';
  select count(*) into pending from public.friendships
    where requester_id = new.requester_id and status = 'pending';
  if recent >= 15 or pending >= 50 then
    raise exception 'Too many friend requests. Try again later.';
  end if;
  insert into public.friend_request_events (requester_id) values (new.requester_id);
  return new;
end $$;
create trigger friendships_rate_limit before insert on public.friendships
  for each row execute function public.friendships_rate_limit();

-- ───────────── helpers ─────────────
create or replace function public.is_friend(other uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = auth.uid() and f.recipient_id = other)
        or (f.recipient_id = auth.uid() and f.requester_id = other))
  )
$$;

-- My requests and friendships, with only the other person's public fields.
create or replace function public.my_friendships()
returns table (friendship_id uuid, other_id uuid, username text, display_name text,
               avatar_url text, status text, incoming boolean, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select f.id, p.id, p.username, p.display_name, p.avatar_url, f.status,
         (f.recipient_id = auth.uid()), f.created_at
  from public.friendships f
  join public.profiles p
    on p.id = case when f.requester_id = auth.uid() then f.recipient_id else f.requester_id end
  where (f.requester_id = auth.uid() or f.recipient_id = auth.uid())
    and f.status <> 'rejected'
  order by lower(p.display_name)
$$;

-- One row per accepted friend with that day's totals. A value is null unless the friend
-- turned on the matching sharing toggle.
create or replace function public.friend_cards(d date)
returns table (
  friendship_id uuid, friend_id uuid, username text, display_name text, avatar_url text,
  share_summary boolean, share_exercise boolean, share_goal boolean, share_history boolean,
  food_calories numeric, protein numeric, exercise_calories numeric,
  max_food_calories int, protein_goal int, net_calorie_target int,
  goal_description text, goal_personal_target text, goal_start_date date, goal_target_date date)
language sql stable security definer set search_path = '' as $$
  select f.id, p.id, p.username, p.display_name, p.avatar_url,
    s.summary, s.exercise, s.goal, s.history,
    case when s.summary then
      coalesce((select sum(l.total_calories) from public.food_logs l where l.user_id = p.id and l.log_date = d), 0)
      + coalesce((select sum(m.total_calories) from public.meal_logs m where m.user_id = p.id and m.log_date = d), 0) end,
    case when s.summary then
      coalesce((select sum(l.total_protein) from public.food_logs l where l.user_id = p.id and l.log_date = d), 0)
      + coalesce((select sum(m.total_protein) from public.meal_logs m where m.user_id = p.id and m.log_date = d), 0) end,
    case when s.exercise then
      coalesce((select sum(a.calories_burned) from public.activity_logs a where a.user_id = p.id and a.log_date = d), 0) end,
    case when s.summary then p.max_food_calories end,
    case when s.summary then p.protein_goal end,
    case when s.summary then p.net_calorie_target end,
    case when s.goal then p.goal_description end,
    case when s.goal then p.goal_personal_target end,
    case when s.goal then p.goal_start_date end,
    case when s.goal then p.goal_target_date end
  from public.friendships f
  join public.profiles p
    on p.id = case when f.requester_id = auth.uid() then f.recipient_id else f.requester_id end
  cross join lateral (select
      coalesce((p.privacy_settings ->> 'share_summary')::boolean, false) as summary,
      coalesce((p.privacy_settings ->> 'share_exercise')::boolean, false) as exercise,
      coalesce((p.privacy_settings ->> 'share_goal')::boolean, false) as goal,
      coalesce((p.privacy_settings ->> 'share_history')::boolean, false) as history) s
  where f.status = 'accepted'
    and (f.requester_id = auth.uid() or f.recipient_id = auth.uid())
    and p.onboarded
  order by lower(p.display_name)
$$;

-- Daily totals for a friend over a date range. Empty unless they share history.
create or replace function public.friend_history(fid uuid, from_d date, to_d date)
returns table (log_date date, food_calories numeric, protein numeric, exercise_calories numeric)
language sql stable security definer set search_path = '' as $$
  with ok as (
    select coalesce((p.privacy_settings ->> 'share_exercise')::boolean, false) as exercise
    from public.profiles p
    where p.id = fid
      and public.is_friend(fid)
      and coalesce((p.privacy_settings ->> 'share_history')::boolean, false)
      and to_d - from_d <= 366
  ),
  rows as (
    select l.log_date, l.total_calories as c, l.total_protein as pr, 0::numeric as e
      from public.food_logs l where l.user_id = fid and l.log_date between from_d and to_d
    union all
    select m.log_date, m.total_calories, m.total_protein, 0::numeric
      from public.meal_logs m where m.user_id = fid and m.log_date between from_d and to_d
    union all
    select a.log_date, 0::numeric, 0::numeric, a.calories_burned
      from public.activity_logs a where a.user_id = fid and a.log_date between from_d and to_d
  )
  select r.log_date, sum(r.c), sum(r.pr), case when ok.exercise then sum(r.e) end
  from rows r cross join ok
  group by r.log_date, ok.exercise
  order by r.log_date
$$;

-- Only signed-in users may call these.
do $$
declare f text;
begin
  foreach f in array array[
    'public.is_friend(uuid)', 'public.my_friendships()', 'public.friend_cards(date)',
    'public.friend_history(uuid, date, date)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
