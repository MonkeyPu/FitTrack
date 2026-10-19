-- Phase 5: more nutrients, notes on combined entries, and per-friend sharing.

-- ───────────── more nutrients (grams) ─────────────
-- Existing rows get 0, which the app treats as "not recorded".
do $$
declare n text;
begin
  foreach n in array array['carbs','sugar','fat','sat_fat','fiber','salt'] loop
    execute format('alter table public.foods add column %I numeric(7,2) not null default 0 check (%I between 0 and 1000)',
      n || '_per_serving', n || '_per_serving');
    execute format('alter table public.meal_items add column %I numeric(7,2) not null default 0 check (%I >= 0)',
      n || '_per_serving_snapshot', n || '_per_serving_snapshot');
    execute format('alter table public.meal_log_items add column %I numeric(7,2) not null default 0 check (%I >= 0)',
      n || '_per_serving_snapshot', n || '_per_serving_snapshot');
    execute format('alter table public.food_logs add column %I numeric(7,2) not null default 0 check (%I between 0 and 1000)',
      n || '_per_serving', n || '_per_serving');
    execute format('alter table public.food_logs add column %I numeric(12,4) generated always as (servings * %I) stored',
      'total_' || n, n || '_per_serving');
    execute format('alter table public.meal_logs add column %I numeric(9,2) not null default 0 check (%I >= 0)',
      n || '_per_serving', n || '_per_serving');
    execute format('alter table public.meal_logs add column %I numeric(14,4) generated always as (servings * %I) stored',
      'total_' || n, n || '_per_serving');
  end loop;
end $$;

alter table public.meal_logs add column notes text check (char_length(notes) <= 500);

-- ───────────── per-friend sharing ─────────────
-- profiles.privacy_settings is the default for every friend. A row here replaces that
-- default for one specific friend. Only the owner can see or change their own rows.
create table public.friend_permissions (
  owner_id uuid not null references public.profiles (id) on delete cascade,
  friend_id uuid not null references public.profiles (id) on delete cascade,
  share_summary boolean not null,
  share_exercise boolean not null,
  share_history boolean not null,
  share_goal boolean not null,
  updated_at timestamptz not null default now(),
  primary key (owner_id, friend_id),
  check (owner_id <> friend_id)
);
create index friend_permissions_friend_idx on public.friend_permissions (friend_id);
create trigger friend_permissions_updated before update on public.friend_permissions
  for each row execute function public.set_updated_at();

alter table public.friend_permissions enable row level security;
create policy "friend_permissions: owner only" on public.friend_permissions for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester_id = owner_id and f.recipient_id = friend_id)
          or (f.recipient_id = owner_id and f.requester_id = friend_id))
    )
  );

-- When a friendship ends, per-friend settings go with it, so they can't resurface later.
create or replace function public.friendships_cleanup() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.status = 'accepted' then return new; end if;
  delete from public.friend_permissions
  where (owner_id = old.requester_id and friend_id = old.recipient_id)
     or (owner_id = old.recipient_id and friend_id = old.requester_id);
  return coalesce(new, old);
end $$;
create trigger friendships_cleanup after delete or update of status on public.friendships
  for each row execute function public.friendships_cleanup();

-- ───────────── friend functions, now honoring per-friend settings ─────────────
drop function if exists public.friend_cards(date);
create function public.friend_cards(d date)
returns table (
  friendship_id uuid, friend_id uuid, username text, display_name text, avatar_url text,
  share_summary boolean, share_exercise boolean, share_goal boolean, share_history boolean,
  food_calories numeric, protein numeric, carbs numeric, sugar numeric, fat numeric,
  exercise_calories numeric,
  max_food_calories int, protein_goal int, net_calorie_target int,
  goal_description text, goal_personal_target text, goal_start_date date, goal_target_date date)
language sql stable security definer set search_path = '' as $$
  select f.id, p.id, p.username, p.display_name, p.avatar_url,
    s.summary, s.exercise, s.goal, s.history,
    case when s.summary then coalesce(t.cal, 0) end,
    case when s.summary then coalesce(t.pro, 0) end,
    case when s.summary then coalesce(t.carbs, 0) end,
    case when s.summary then coalesce(t.sugar, 0) end,
    case when s.summary then coalesce(t.fat, 0) end,
    case when s.exercise then coalesce(ex.cal, 0) end,
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
  left join public.friend_permissions fp on fp.owner_id = p.id and fp.friend_id = auth.uid()
  cross join lateral (select
      coalesce(fp.share_summary, coalesce((p.privacy_settings ->> 'share_summary')::boolean, false)) as summary,
      coalesce(fp.share_exercise, coalesce((p.privacy_settings ->> 'share_exercise')::boolean, false)) as exercise,
      coalesce(fp.share_goal, coalesce((p.privacy_settings ->> 'share_goal')::boolean, false)) as goal,
      coalesce(fp.share_history, coalesce((p.privacy_settings ->> 'share_history')::boolean, false)) as history) s
  left join lateral (
    select sum(x.cal) as cal, sum(x.pro) as pro, sum(x.carbs) as carbs, sum(x.sugar) as sugar, sum(x.fat) as fat
    from (
      select l.total_calories as cal, l.total_protein as pro, l.total_carbs as carbs, l.total_sugar as sugar, l.total_fat as fat
        from public.food_logs l where l.user_id = p.id and l.log_date = d and s.summary
      union all
      select m.total_calories, m.total_protein, m.total_carbs, m.total_sugar, m.total_fat
        from public.meal_logs m where m.user_id = p.id and m.log_date = d and s.summary
    ) x
  ) t on true
  left join lateral (
    select sum(a.calories_burned) as cal
    from public.activity_logs a where a.user_id = p.id and a.log_date = d and s.exercise
  ) ex on true
  where f.status = 'accepted'
    and (f.requester_id = auth.uid() or f.recipient_id = auth.uid())
    and p.onboarded
  order by lower(p.display_name)
$$;

create or replace function public.friend_history(fid uuid, from_d date, to_d date)
returns table (log_date date, food_calories numeric, protein numeric, exercise_calories numeric)
language sql stable security definer set search_path = '' as $$
  with ok as (
    select coalesce(fp.share_exercise, coalesce((p.privacy_settings ->> 'share_exercise')::boolean, false)) as exercise
    from public.profiles p
    left join public.friend_permissions fp on fp.owner_id = p.id and fp.friend_id = auth.uid()
    where p.id = fid
      and public.is_friend(fid)
      and coalesce(fp.share_history, coalesce((p.privacy_settings ->> 'share_history')::boolean, false))
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

revoke all on function public.friend_cards(date) from public, anon;
grant execute on function public.friend_cards(date) to authenticated;
revoke all on function public.friend_history(uuid, date, date) from public, anon;
grant execute on function public.friend_history(uuid, date, date) to authenticated;
