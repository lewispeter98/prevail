-- Time tracking now uses ordinary calendar days (midnight to midnight, London
-- time) instead of Prevail's 4am day. Only the time totals function changes;
-- existing entries are untouched and simply regroup.

create or replace function time_daily_totals(p_from date, p_to date)
returns table (day date, category_id uuid, minutes numeric)
language sql stable
set search_path = public
as $$
  with bounds as (
    select (p_from::timestamp at time zone 'Europe/London') as t0,
           ((p_to + 1)::timestamp at time zone 'Europe/London') as t1
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
      greatest(c.started_at, (d::date)::timestamp at time zone 'Europe/London') as s,
      least(c.ended_at, (d::date + 1)::timestamp at time zone 'Europe/London') as en
    from c
    cross join generate_series(
      (c.started_at at time zone 'Europe/London')::date,
      ((c.ended_at at time zone 'Europe/London') - interval '1 microsecond')::date,
      interval '1 day'
    ) as d
  )
  select day, cat, round(sum(extract(epoch from (en - s))) / 60, 1)
  from split
  where en > s and day between p_from and p_to
  group by day, cat
  order by day, cat;
$$;

revoke execute on function time_daily_totals(date, date) from public, anon, authenticated;
grant execute on function time_daily_totals(date, date) to service_role;
