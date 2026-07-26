create table if not exists public.game_run_scenarios (
  run_id uuid not null references public.game_runs(id) on delete cascade,
  day smallint not null check (day between 1 and 30),
  profile_id text not null check (profile_id in ('office', 'student', 'freelancer')),
  fingerprint text not null check (fingerprint ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  primary key (run_id, day),
  unique (profile_id, fingerprint)
);

alter table public.game_run_scenarios enable row level security;

revoke all on table public.game_run_scenarios from anon, authenticated;

drop function if exists public.reserve_game_run(
  uuid,
  text,
  text,
  text,
  jsonb,
  text
);

create or replace function public.reserve_game_run(
  p_player_id uuid,
  p_profile_id text,
  p_seed text,
  p_fingerprint text,
  p_scenario_fingerprints jsonb,
  p_scenarios jsonb,
  p_source text
)
returns table (id uuid, created_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  inserted_id uuid;
  inserted_at timestamptz;
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

  if jsonb_typeof(p_scenario_fingerprints) <> 'array'
    or jsonb_array_length(p_scenario_fingerprints) <> 30
    or exists (
      select 1
      from jsonb_array_elements_text(p_scenario_fingerprints) as item(value)
      where item.value !~ '^[0-9a-f]{64}$'
    )
    or (
      select count(distinct item.value)
      from jsonb_array_elements_text(p_scenario_fingerprints) as item(value)
    ) <> 30 then
    raise exception 'invalid scenario fingerprints';
  end if;

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
  returning game_runs.id, game_runs.created_at
  into inserted_id, inserted_at;

  insert into public.game_run_scenarios (
    run_id,
    day,
    profile_id,
    fingerprint
  )
  select
    inserted_id,
    item.position::smallint,
    p_profile_id,
    item.value
  from jsonb_array_elements_text(p_scenario_fingerprints)
    with ordinality as item(value, position)
  order by item.position;

  return query select inserted_id, inserted_at;
end;
$$;

revoke all on function public.reserve_game_run(
  uuid,
  text,
  text,
  text,
  jsonb,
  jsonb,
  text
) from public;

grant execute on function public.reserve_game_run(
  uuid,
  text,
  text,
  text,
  jsonb,
  jsonb,
  text
) to anon, authenticated;

comment on table public.game_run_scenarios is
'One fingerprint per generated day. The profile-scoped unique constraint prevents an exact logical scenario from being issued twice to the same character.';
