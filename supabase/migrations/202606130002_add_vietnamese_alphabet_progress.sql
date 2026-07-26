alter table public.learning_progress
  add column if not exists lesson_key text,
  add column if not exists module text,
  add column if not exists item_id text;
alter table public.learning_progress
  alter column lesson_key set not null,
  alter column module set not null,
  alter column item_id set not null;
create unique index if not exists learning_progress_user_lesson_unique
  on public.learning_progress (user_id, lesson_key);
alter table public.learning_progress
  drop constraint if exists learning_progress_module_check;
alter table public.learning_progress
  add constraint learning_progress_module_check
  check (module in ('alphabet', 'vietnamese', 'number'));
alter table public.learning_progress
  drop constraint if exists learning_progress_item_id_check;
alter table public.learning_progress
  add constraint learning_progress_item_id_check
  check (char_length(item_id) between 1 and 20);
alter table public.learning_progress
  drop constraint if exists learning_progress_lesson_key_matches;
alter table public.learning_progress
  add constraint learning_progress_lesson_key_matches
  check (lesson_key = upper(module) || '#' || item_id);
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.learning_progress'::regclass
      and conname = 'learning_progress_user_id_fkey'
  ) then
    alter table public.learning_progress
      add constraint learning_progress_user_id_fkey
      foreign key (user_id) references public.app_users(id) on delete cascade;
  end if;
end
$$;
comment on table public.learning_progress is
  'Completed English alphabet, Vietnamese alphabet, and number lessons for each application user.';
