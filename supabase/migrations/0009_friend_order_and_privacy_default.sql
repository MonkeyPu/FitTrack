-- Phase 9a: new accounts share everything with friends by default (people can turn things off in Settings > Privacy).
-- Existing accounts keep the settings they already have.
alter table public.profiles alter column privacy_settings
  set default '{"share_summary":true,"share_exercise":true,"share_history":true,"share_goal":true}'::jsonb;

-- Phase 9b: each person chooses the order their friends show in on the Friends tab.
create table public.friend_order (
  owner_id uuid not null references public.profiles (id) on delete cascade,
  friend_id uuid not null references public.profiles (id) on delete cascade,
  position integer not null check (position >= 0),
  primary key (owner_id, friend_id),
  check (owner_id <> friend_id)
);
create index friend_order_friend_idx on public.friend_order (friend_id);

alter table public.friend_order enable row level security;
create policy "friend_order: owner only" on public.friend_order for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
revoke all on public.friend_order from anon, authenticated;
grant select, insert, update, delete on public.friend_order to authenticated;
