create extension if not exists pgcrypto;

create table if not exists public.game_runs (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null,
  profile_id text not null check (profile_id in ('office', 'student', 'freelancer')),
  seed text not null check (char_length(seed) between 20 and 100),
  fingerprint text not null unique check (fingerprint ~ '^[0-9a-f]{64}$'),
  scenario_count smallint not null default 30 check (scenario_count = 30),
  source text not null check (source in ('rules', 'ai')),
  scenarios jsonb not null check (
    jsonb_typeof(scenarios) = 'array'
    and jsonb_array_length(scenarios) = 30
  ),
  created_at timestamptz not null default now()
);

alter table public.game_runs enable row level security;

revoke all on table public.game_runs from anon, authenticated;

create index if not exists game_runs_player_created_idx
on public.game_runs (player_id, created_at desc);

create index if not exists game_runs_profile_created_idx
on public.game_runs (profile_id, created_at desc);

create or replace function public.reserve_game_run(
  p_player_id uuid,
  p_profile_id text,
  p_seed text,
  p_fingerprint text,
  p_scenarios jsonb,
  p_source text
)
returns table (id uuid, created_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_profile_id not in ('office', 'student', 'freelancer') then
    raise exception 'invalid profile_id';
  end if;

  if char_length(p_seed) not between 20 and 100 then
    raise exception 'invalid seed';
  end if;

  if p_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid fingerprint';
  end if;

  if p_source not in ('rules', 'ai') then
    raise exception 'invalid source';
  end if;

  if jsonb_typeof(p_scenarios) <> 'array'
    or jsonb_array_length(p_scenarios) <> 30
    or octet_length(p_scenarios::text) > 200000 then
    raise exception 'invalid scenarios';
  end if;

  return query
  insert into public.game_runs (
    player_id,
    profile_id,
    seed,
    fingerprint,
    scenario_count,
    source,
    scenarios
  )
  values (
    p_player_id,
    p_profile_id,
    p_seed,
    p_fingerprint,
    30,
    p_source,
    p_scenarios
  )
  returning game_runs.id, game_runs.created_at;
end;
$$;

revoke all on function public.reserve_game_run(
  uuid,
  text,
  text,
  text,
  jsonb,
  text
) from public;

grant execute on function public.reserve_game_run(
  uuid,
  text,
  text,
  text,
  jsonb,
  text
) to anon, authenticated;

comment on table public.game_runs is
'Stores generated 30-day runs. The unique fingerprint prevents an identical logical deck from being issued twice.';
