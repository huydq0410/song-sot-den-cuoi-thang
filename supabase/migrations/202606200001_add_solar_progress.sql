alter table public.learning_progress
  drop constraint if exists learning_progress_module_check;
alter table public.learning_progress
  add constraint learning_progress_module_check
  check (module in ('alphabet', 'vietnamese', 'number', 'solar'));
comment on table public.learning_progress is
  'Completed English alphabet, Vietnamese alphabet, number, and Solar System lessons for each application user.';
