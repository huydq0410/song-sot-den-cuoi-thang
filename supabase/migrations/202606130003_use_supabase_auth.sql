alter table public.app_users
  alter column id drop default,
  alter column password_hash drop not null;
alter table public.app_users
  add constraint app_users_auth_user_id_fkey
  foreign key (id) references auth.users(id) on delete cascade
  not valid;
comment on table public.app_users is
  'Application profiles linked to users authenticated by Supabase Auth.';
comment on column public.app_users.password_hash is
  'Legacy password hash retained only for pre-Supabase Auth records.';
