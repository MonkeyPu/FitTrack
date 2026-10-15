-- Row Level Security. Every table is locked down; policies grant only what is listed.
-- Friend access to another user's data is added in phase 4, through explicit policies/functions.

alter table public.profiles enable row level security;
create policy "profiles: read own" on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "profiles: insert own" on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy "profiles: update own" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "profiles: delete own" on public.profiles for delete to authenticated
  using (id = (select auth.uid()));

-- target_changes: readable by the owner; rows are written only by the trigger.
alter table public.target_changes enable row level security;
create policy "target_changes: read own" on public.target_changes for select to authenticated
  using (user_id = (select auth.uid()));

-- Simple owner-only tables.
do $$
declare t text;
begin
  foreach t in array array['foods','meals','food_logs','meal_logs','activity_logs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- Child tables: also require that the parent row belongs to the same user.
alter table public.meal_items enable row level security;
create policy "own meal items" on public.meal_items for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.meals m where m.id = meal_id and m.user_id = (select auth.uid()))
    and (food_id is null or exists (select 1 from public.foods f where f.id = food_id and f.user_id = (select auth.uid())))
  );

alter table public.meal_log_items enable row level security;
create policy "own meal log items" on public.meal_log_items for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.meal_logs l where l.id = meal_log_id and l.user_id = (select auth.uid()))
  );

-- Friendships: parties can read; only the requester can create (as pending);
-- only the recipient can accept/reject; either party can remove.
alter table public.friendships enable row level security;
create policy "friendships: read own" on public.friendships for select to authenticated
  using (requester_id = (select auth.uid()) or recipient_id = (select auth.uid()));
create policy "friendships: request" on public.friendships for insert to authenticated
  with check (requester_id = (select auth.uid()) and status = 'pending');
create policy "friendships: respond" on public.friendships for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()) and status in ('accepted','rejected'));
create policy "friendships: remove" on public.friendships for delete to authenticated
  using (requester_id = (select auth.uid()) or recipient_id = (select auth.uid()));

-- Avatars: public read (bucket is public); write only inside your own folder.
create policy "avatars: insert own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: update own folder" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: delete own folder" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
