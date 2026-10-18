-- Prevail: time tracking
-- Each entry is the moment you switched activity and what you started.
-- An activity runs until the next entry (capped at 16 hours, after which the
-- time counts as untracked). Days run 4am to 4am, London time.

create table time_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) > 0),
  colour text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Matching rules, like a bank app sorting transactions: if an entry's text
-- contains `keyword`, it goes in the category. Lowest sort_order is checked first.
create table time_rules (
  id uuid primary key default gen_random_uuid(),
  keyword text not null unique check (keyword = lower(trim(keyword)) and length(keyword) > 0),
  category_id uuid not null references time_categories (id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table time_entries (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null,
  label text not null check (length(trim(label)) > 0),
  -- "Just this entry" category choice; otherwise the rules decide.
  category_override uuid references time_categories (id) on delete set null,
  source text not null default 'app' check (source in ('app', 'import')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index time_entries_started_at on time_entries (started_at);
create trigger time_entries_updated before update on time_entries
  for each row execute function set_updated_at();

-- The fixed quick-switch buttons on the Now tab.
alter table settings add column time_quick text[] not null default '{}';

-- Starter categories and rules.
insert into time_categories (name, colour, sort_order) values
  ('Work', '#3F6B53', 0), ('Family', '#B07D4F', 1), ('Dogs', '#8A8F4E', 2),
  ('Sleep', '#5A6680', 3), ('Meals', '#C49A4A', 4), ('Breaks', '#A89C8C', 5),
  ('Morning', '#B46F5E', 6), ('Leisure', '#8C6A8A', 7), ('Travel', '#6E8A93', 8);

insert into time_rules (keyword, category_id, sort_order)
select r.keyword, c.id, r.ord
from (values
  ('wake up', 'Morning', 10), ('get ready', 'Morning', 20), ('otis', 'Family', 30),
  ('baby', 'Family', 40), ('family', 'Family', 50), ('dog', 'Dogs', 60),
  ('work', 'Work', 70), ('break', 'Breaks', 80), ('sleep', 'Sleep', 90),
  ('bed', 'Sleep', 100), ('breakfast', 'Meals', 110), ('lunch', 'Meals', 120),
  ('dinner', 'Meals', 130), ('tv', 'Leisure', 140), ('drive', 'Travel', 150)
) as r(keyword, cat, ord)
join time_categories c on c.name = r.cat;

-- Minutes per category for each day from p_from to p_to (inclusive), splitting
-- activities at the 4am boundary. category_id is null for uncategorised time.
create or replace function time_daily_totals(p_from date, p_to date)
returns table (day date, category_id uuid, minutes numeric)
language sql stable
set search_path = public
as $$
  with bounds as (
    select ((p_from + time '04:00') at time zone 'Europe/London') as t0,
           (((p_to + 1) + time '04:00') at time zone 'Europe/London') as t1
  ),
  e as (
    select t.id, t.label, t.started_at, t.category_override,
           least(
             coalesce(lead(t.started_at) over (order by t.started_at), now()),
             t.started_at + interval '16 hours',
             now()
           ) as ended_at
    from time_entries t, bounds b
    where t.started_at < b.t1 and t.started_at >= b.t0 - interval '16 hours'
  ),
  c as (
    select e.*, coalesce(
      e.category_override,
      (select r.category_id from time_rules r
        where position(r.keyword in lower(e.label)) > 0
        order by r.sort_order, r.created_at limit 1)
    ) as cat
    from e
    where e.ended_at > e.started_at
  ),
  split as (
    select c.cat, d::date as day,
      greatest(c.started_at, (d::date + time '04:00') at time zone 'Europe/London') as s,
      least(c.ended_at, ((d::date + 1) + time '04:00') at time zone 'Europe/London') as en
    from c
    cross join generate_series(
      ((c.started_at at time zone 'Europe/London') - interval '4 hours')::date,
      ((c.ended_at at time zone 'Europe/London') - interval '4 hours 1 microsecond')::date,
      interval '1 day'
    ) as d
  )
  select day, cat, round(sum(extract(epoch from (en - s))) / 60, 1)
  from split
  where en > s and day between p_from and p_to
  group by day, cat
  order by day, cat;
$$;

-- Only the server (secret key) may call it.
revoke execute on function time_daily_totals(date, date) from public, anon, authenticated;
grant execute on function time_daily_totals(date, date) to service_role;

alter table time_categories enable row level security;
alter table time_rules enable row level security;
alter table time_entries enable row level security;
