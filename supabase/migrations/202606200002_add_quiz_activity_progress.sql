alter table public.learning_progress
  add column if not exists completed_activities text[] not null
    default array['listen', 'pronunciation', 'flip-card']::text[],
  add column if not exists progress_percent smallint not null default 100;
alter table public.learning_progress
  alter column completed_activities set default array[]::text[],
  alter column progress_percent set default 0,
  alter column completed_at drop not null,
  alter column completed_at drop default;
alter table public.learning_progress
  drop constraint if exists learning_progress_activities_check;
alter table public.learning_progress
  add constraint learning_progress_activities_check
  check (
    completed_activities <@ array['listen', 'pronunciation', 'flip-card']::text[]
  );
alter table public.learning_progress
  drop constraint if exists learning_progress_percent_check;
alter table public.learning_progress
  add constraint learning_progress_percent_check
  check (progress_percent between 0 and 100);
comment on table public.learning_progress is
  'Lesson progress with activity-level quiz completion for letters and numbers.';
