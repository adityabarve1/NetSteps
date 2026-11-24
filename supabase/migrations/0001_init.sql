-- NetPath 0001: tables, row level security, triggers and delete_my_account().
--
-- Run top to bottom, once, on a fresh Supabase project (SQL editor or `supabase db push`).
-- Never edit this file after it has been applied; add 0002_*.sql instead.
--
-- Security model (spec section 10):
--   * Row level security is on for every table. The only role with any privilege on
--     them is `authenticated`, and policies limit it to its own rows.
--   * `anon` and PUBLIC get nothing. Supabase grants new tables to anon by default,
--     so every table below is explicitly revoked and then granted back narrowly.
--   * There is no delete policy and no delete privilege. Rows disappear only by
--     cascade when auth.users is deleted, which only delete_my_account() does.
--   * No service-role key is needed by the app or by this file.


-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  constraint profiles_display_name_length check (char_length(display_name) <= 80)
);

create table public.lesson_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id text not null,
  status text not null default 'in_progress',
  last_opened_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id),
  constraint lesson_progress_lesson_id_length
    check (char_length(lesson_id) between 1 and 100),
  constraint lesson_progress_status_check
    check (status in ('in_progress', 'completed')),
  -- completed_at is set exactly when the lesson is completed.
  -- The guard trigger below fixes client input up before this check runs.
  constraint lesson_progress_completed_at_matches_status
    check ((status = 'completed') = (completed_at is not null))
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id text not null,
  score integer not null,
  total integer not null,
  created_at timestamptz not null default now(),
  constraint quiz_attempts_lesson_id_length
    check (char_length(lesson_id) between 1 and 100),
  constraint quiz_attempts_total_positive check (total > 0),
  constraint quiz_attempts_score_in_range check (score between 0 and total)
);

-- Serves "my attempts" reads and the on-delete-cascade lookup.
create index quiz_attempts_user_id_lesson_id_idx
  on public.quiz_attempts (user_id, lesson_id);

create table public.lab_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  lab_id text not null,
  status text not null default 'started',
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lab_id),
  constraint lab_progress_lab_id_length
    check (char_length(lab_id) between 1 and 100),
  constraint lab_progress_status_check
    check (status in ('started', 'completed')),
  constraint lab_progress_completed_at_matches_status
    check ((status = 'completed') = (completed_at is not null))
);


-- ---------------------------------------------------------------------------
-- Privileges: nothing for anon/PUBLIC; select, insert, update for authenticated
-- ---------------------------------------------------------------------------

revoke all on table public.profiles from public, anon, authenticated;
revoke all on table public.lesson_progress from public, anon, authenticated;
revoke all on table public.quiz_attempts from public, anon, authenticated;
revoke all on table public.lab_progress from public, anon, authenticated;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update on table public.lesson_progress to authenticated;
grant select, insert, update on table public.quiz_attempts to authenticated;
grant select, insert, update on table public.lab_progress to authenticated;


-- ---------------------------------------------------------------------------
-- Row level security. Update policies carry both `using` (which existing rows
-- may be touched) and `with check` (what the row may look like afterwards), so a
-- user can neither edit another user's row nor hand one of their own to someone
-- else. (select auth.uid()) is evaluated once per statement, not once per row.
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.lab_progress enable row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy lesson_progress_select_own on public.lesson_progress
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy lesson_progress_insert_own on public.lesson_progress
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy lesson_progress_update_own on public.lesson_progress
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy quiz_attempts_select_own on public.quiz_attempts
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy quiz_attempts_insert_own on public.quiz_attempts
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy quiz_attempts_update_own on public.quiz_attempts
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy lab_progress_select_own on public.lab_progress
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy lab_progress_insert_own on public.lab_progress
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy lab_progress_update_own on public.lab_progress
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));


-- ---------------------------------------------------------------------------
-- Sign-up trigger: one profiles row per new auth.users row.
-- security definer so it can write profiles whatever role fires it; search_path is
-- empty and every name is schema-qualified so nothing can be shadowed.
-- It must never fail, or sign-up itself would fail, hence the trim, the length cap
-- and `on conflict do nothing`.
-- ---------------------------------------------------------------------------

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(
      left(
        btrim(
          coalesce(
            new.raw_user_meta_data ->> 'display_name',
            new.raw_user_meta_data ->> 'full_name',
            new.raw_user_meta_data ->> 'name',
            ''
          )
        ),
        80
      ),
      ''
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- A trigger function is never called by clients.
revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users who signed up before this migration ran (for example test users made in
-- the dashboard) get their profile row too. Does nothing on a fresh project.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;


-- ---------------------------------------------------------------------------
-- lesson_progress guard (before insert or update).
--
-- The app saves with an upsert: insert ... on conflict (user_id, lesson_id) do update.
-- Postgres runs the BEFORE INSERT trigger on the proposed row first, and only if
-- that row collides does it run the BEFORE UPDATE trigger on the existing row.
-- This one function handles both, with the following results:
--   first write, completed, no time sent  -> completed_at = now()
--   first write, completed, time sent     -> the sent completed_at is kept
--   first write, in_progress              -> completed_at = null
--   repeat completion                     -> status and the ORIGINAL completed_at stay
--   stale in_progress write after done    -> still completed, ORIGINAL completed_at stays
--   user_id or lesson_id changed          -> error (the key never moves)
-- last_opened_at is left alone: opening a completed lesson again is a valid update.
-- Completion is permanent; the only way to reset progress is to delete the account.
-- updated_at is always set by the server. Not security definer, so it runs with the
-- caller's rights and cannot touch anything beyond the row being written.
-- ---------------------------------------------------------------------------

create function public.lesson_progress_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.user_id is distinct from old.user_id
       or new.lesson_id is distinct from old.lesson_id then
      raise exception 'lesson_progress.user_id and lesson_id cannot be changed'
        using errcode = '42501';
    end if;
    if old.status = 'completed' then
      new.status := 'completed';
      new.completed_at := old.completed_at;
    end if;
  end if;

  if new.status = 'completed' then
    new.completed_at := coalesce(new.completed_at, now());
  else
    new.completed_at := null;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.lesson_progress_guard() from public, anon, authenticated;

create trigger lesson_progress_before_write
  before insert or update on public.lesson_progress
  for each row execute function public.lesson_progress_guard();


-- ---------------------------------------------------------------------------
-- lab_progress guard: the same rules, so a stale device cannot turn a completed
-- lab back into "started". Mirrors lesson_progress_guard() line for line.
-- ---------------------------------------------------------------------------

create function public.lab_progress_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.user_id is distinct from old.user_id
       or new.lab_id is distinct from old.lab_id then
      raise exception 'lab_progress.user_id and lab_id cannot be changed'
        using errcode = '42501';
    end if;
    if old.status = 'completed' then
      new.status := 'completed';
      new.completed_at := old.completed_at;
    end if;
  end if;

  if new.status = 'completed' then
    new.completed_at := coalesce(new.completed_at, now());
  else
    new.completed_at := null;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.lab_progress_guard() from public, anon, authenticated;

create trigger lab_progress_before_write
  before insert or update on public.lab_progress
  for each row execute function public.lab_progress_guard();


-- ---------------------------------------------------------------------------
-- delete_my_account(): powers the "Delete my account" button.
-- Takes no arguments, so a caller cannot name anyone else. It deletes the
-- auth.users row of the signed-in caller only; the foreign keys above cascade
-- to profiles, lesson_progress, quiz_attempts and lab_progress.
-- Signed out (auth.uid() is null) it raises instead of silently doing nothing.
-- ---------------------------------------------------------------------------

create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'You must be signed in to delete your account.'
      using errcode = '28000';
  end if;
  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
