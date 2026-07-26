create extension if not exists pgcrypto with schema extensions;
create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 50),
  email text not null,
  password_hash text not null,
  role text not null default 'parent' check (role in ('parent', 'child')),
  created_at timestamptz not null default now()
);
create unique index if not exists app_users_email_lower_unique
  on public.app_users (lower(email));
create table if not exists public.learning_progress (
  user_id uuid not null references public.app_users(id) on delete cascade,
  lesson_key text not null,
  module text not null check (module in ('alphabet', 'number')),
  item_id text not null check (char_length(item_id) between 1 and 20),
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_key),
  constraint learning_progress_lesson_key_matches
    check (lesson_key = upper(module) || '#' || item_id)
);
alter table public.learning_progress
  add column if not exists completed_at timestamptz not null default now();
create index if not exists learning_progress_user_completed_idx
  on public.learning_progress (user_id, completed_at);
alter table public.app_users enable row level security;
alter table public.learning_progress enable row level security;
revoke all on table public.app_users from anon, authenticated;
revoke all on table public.learning_progress from anon, authenticated;
grant usage on schema public to service_role;
grant all on table public.app_users to service_role;
grant all on table public.learning_progress to service_role;
comment on table public.app_users is
  'Application users authenticated by the Next.js JWT cookie flow.';
comment on table public.learning_progress is
  'Completed alphabet and number lessons for each application user.';
