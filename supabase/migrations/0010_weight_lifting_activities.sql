-- Phase 10: weight lifting entries. The calories are worked out from sets, reps per set and intensity,
-- so those three are kept with the entry (they are shown on it and reloaded when it is edited).
alter table public.activity_logs drop constraint activity_logs_activity_type_check;
alter table public.activity_logs add constraint activity_logs_activity_type_check
  check (activity_type in ('running', 'walking', 'cycling', 'swimming', 'stair_climbing', 'other_cardio', 'weights'));

alter table public.activity_logs
  add column sets smallint check (sets between 1 and 100),
  add column reps_per_set smallint check (reps_per_set between 1 and 200),
  add column intensity text check (intensity in ('light', 'medium', 'heavy'));
