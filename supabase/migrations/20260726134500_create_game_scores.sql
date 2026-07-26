create table if not exists public.game_scores (
  id bigint generated always as identity primary key,
  profile_id text not null check (profile_id in ('office', 'student', 'freelancer')),
  score integer not null check (score between 0 and 10000),
  net_worth bigint not null check (net_worth between -100000000 and 1000000000),
  savings bigint not null check (savings between 0 and 1000000000),
  debt bigint not null check (debt between 0 and 1000000000),
  health smallint not null check (health between 0 and 100),
  morale smallint not null check (morale between 0 and 100),
  created_at timestamptz not null default now()
);

alter table public.game_scores enable row level security;

grant select, insert on table public.game_scores to anon, authenticated;
grant usage, select on sequence public.game_scores_id_seq to anon, authenticated;

create policy "Anyone can view the leaderboard"
on public.game_scores
for select
to anon, authenticated
using (true);

create policy "Anyone can submit a valid game result"
on public.game_scores
for insert
to anon, authenticated
with check (
  profile_id in ('office', 'student', 'freelancer')
  and score between 0 and 10000
  and net_worth between -100000000 and 1000000000
  and savings between 0 and 1000000000
  and debt between 0 and 1000000000
  and health between 0 and 100
  and morale between 0 and 100
);

create index if not exists game_scores_score_created_idx
on public.game_scores (score desc, created_at asc);
