-- Prevail: initial schema
-- Single-user app. Every table has Row Level Security on and no policies,
-- so the public (anon) key can read nothing. The app talks to the database
-- only from the server, using the secret key, which bypasses RLS.

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- Settings (one row) ----------
create table settings (
  id smallint primary key default 1 check (id = 1),
  goal_weight_kg numeric(5,1) check (goal_weight_kg between 20 and 300),
  updated_at timestamptz not null default now()
);
insert into settings (id) values (1);
create trigger settings_updated before update on settings
  for each row execute function set_updated_at();

-- ---------- Weight ----------
-- One entry per day; saving again the same day overwrites it.
create table weight_entries (
  date date primary key,
  weight_kg numeric(5,1) not null check (weight_kg between 20 and 300),
  source text not null default 'app' check (source in ('app', 'import')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger weight_entries_updated before update on weight_entries
  for each row execute function set_updated_at();

-- ---------- Journal ----------
create table journal_entries (
  date date primary key,
  feelings text[] not null default '{}',
  body text not null default '',
  -- Set when "Done for today" is tapped.
  done_at timestamptz,
  -- True when finished on the day itself (before the 4am cutoff) or imported.
  -- Backdated entries stay false and don't count towards the streak.
  on_time boolean not null default false,
  source text not null default 'app' check (source in ('app', 'import')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger journal_entries_updated before update on journal_entries
  for each row execute function set_updated_at();

-- ---------- AI reflections ----------
create table reflections (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('daily', 'weekly')),
  -- The entry date for daily reflections; the Monday for weekly reviews.
  period_start date not null,
  -- daily: { "text": "..." }
  -- weekly: { "headline", "progress", "drift", "focus", "affirmation" }
  content jsonb not null,
  model text,
  created_at timestamptz not null default now(),
  unique (kind, period_start)
);

-- ---------- Life goals & daily scripting ----------
create table life_goals (
  id uuid primary key default gen_random_uuid(),
  text text not null check (length(trim(text)) > 0),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger life_goals_updated before update on life_goals
  for each row execute function set_updated_at();

create table goal_scripts (
  date date primary key,
  completed_at timestamptz not null default now(),
  -- The goals as written that day, so history survives later edits.
  goals text[] not null
);

-- ---------- Monthly objectives ----------
create table objectives (
  id uuid primary key default gen_random_uuid(),
  -- First day of the month the objective belongs to.
  month date not null check (extract(day from month) = 1),
  slot smallint not null check (slot between 1 and 3),
  text text not null,
  achieved_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (month, slot)
);
create trigger objectives_updated before update on objectives
  for each row execute function set_updated_at();

-- ---------- Lock everything down ----------
alter table settings enable row level security;
alter table weight_entries enable row level security;
alter table journal_entries enable row level security;
alter table reflections enable row level security;
alter table life_goals enable row level security;
alter table goal_scripts enable row level security;
alter table objectives enable row level security;
