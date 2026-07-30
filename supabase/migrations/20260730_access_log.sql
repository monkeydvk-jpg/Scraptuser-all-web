-- Access log: per-user + anonymous activity, plus the permanent per-day rollup
-- that keeps the all-time visitor total alive after detail rows are purged.
--
-- Retention: `access_events` holds 30 days of detail. `access_daily` holds one
-- tiny row per day forever (~40 bytes; a decade is under 150 KB).

create table if not exists public.access_events (
  id          bigserial primary key,
  created_at  timestamptz not null default now(),
  -- Nullable: only a route handler may SET a cookie, so a server action that
  -- runs before the visitor ever loaded a tracked page can read but not mint one.
  visitor_id  uuid,
  -- Null = anonymous visitor. Plain uuid with no FK, matching public.watchlist.
  user_id     uuid,
  event_type  text not null,
  path        text,
  referrer    text,
  country     text,
  ip          inet,
  user_agent  text,
  meta        jsonb,
  constraint access_events_event_type_check check (event_type in (
    'pageview', 'login', 'signup', 'logout', 'scrape', 'keywords',
    'watchlist_add', 'watchlist_remove', 'asset_add', 'asset_remove'
  ))
);

create index if not exists access_events_created_idx on public.access_events (created_at desc);
create index if not exists access_events_user_idx    on public.access_events (user_id, created_at desc);
create index if not exists access_events_type_idx    on public.access_events (event_type, created_at desc);

create table if not exists public.access_daily (
  day        date primary key,
  pageviews  bigint not null default 0,
  visitors   bigint not null default 0
);

-- Service-role only, same posture as 20260717_auth_rls.sql: RLS on, no policies.
alter table public.access_events enable row level security;
alter table public.access_daily  enable row level security;

-- Start of "today" in Vietnam, as a timestamptz. UTC+7 is fixed (no DST).
create or replace function public.vn_today_start()
returns timestamptz
language sql
stable
as $$
  select ((now() at time zone 'Asia/Ho_Chi_Minh')::date)::timestamp
         at time zone 'Asia/Ho_Chi_Minh';
$$;

-- The three footer numbers in one round-trip.
-- total = rolled-up days + every pageview on a day the rollup has not yet
-- covered (see `live` below). That is equivalent to "completed days from the
-- rollup + today's live count" only when the cron ran on schedule for every
-- day up to and including yesterday; using "days after the last rolled-up
-- day" instead of "today" keeps the total correct even if a cron run was
-- delayed, skipped, or fired outside Vietnam's midnight (e.g. Vercel crons
-- run in UTC), so no day is ever double-counted or silently dropped.
create or replace function public.access_stats()
returns json
language sql
stable
as $$
  with rolled as (
    select coalesce(sum(pageviews), 0)::bigint as n, max(day) as last_day
    from public.access_daily
  ),
  live as (
    -- Every pageview on a day the rollup has not yet covered. Independent of the
    -- cron's schedule and of whether it ran, so the total never dips or drifts.
    select count(*)::bigint as n
    from public.access_events
    where event_type = 'pageview'
      and (created_at at time zone 'Asia/Ho_Chi_Minh')::date
          > coalesce((select max(day) from public.access_daily), '-infinity'::date)
  ),
  today as (
    select count(*)::bigint as n
    from public.access_events
    where event_type = 'pageview'
      and created_at >= public.vn_today_start()
  ),
  online as (
    select count(distinct visitor_id)::bigint as n
    from public.access_events
    where created_at > now() - interval '5 minutes'
  )
  select json_build_object(
    'total',  rolled.n + live.n,
    'today',  today.n,
    'online', online.n
  )
  from rolled, live, today, online;
$$;

-- Per-user event counts, grouped in Postgres. Doing this by selecting every
-- user_id into the app would be silently truncated by PostgREST's row cap and,
-- with no ORDER BY, truncated arbitrarily — making the admin column meaningless.
create or replace function public.access_user_event_counts()
returns table (user_id uuid, n bigint)
language sql
stable
as $$
  select user_id, count(*)::bigint
  from public.access_events
  where user_id is not null
  group by user_id;
$$;

-- Nightly: roll up every completed day still present in the detail table, then
-- purge detail older than 30 days. Idempotent — safe to run twice.
--
-- GREATEST on conflict makes the rollup monotonic. Without it, the day sitting
-- exactly on the 30-day purge boundary would be recomputed from a partially
-- purged set of rows and its count would shrink.
create or replace function public.access_rollup()
returns json
language plpgsql
as $$
declare
  rolled_days int;
  purged_rows int;
begin
  with src as (
    select
      (created_at at time zone 'Asia/Ho_Chi_Minh')::date as day,
      count(*) filter (where event_type = 'pageview')     as pageviews,
      count(distinct visitor_id)                          as visitors
    from public.access_events
    where (created_at at time zone 'Asia/Ho_Chi_Minh')::date
          < (now() at time zone 'Asia/Ho_Chi_Minh')::date
    group by 1
  )
  insert into public.access_daily as d (day, pageviews, visitors)
  select day, pageviews, visitors from src
  on conflict (day) do update set
    pageviews = greatest(d.pageviews, excluded.pageviews),
    visitors  = greatest(d.visitors,  excluded.visitors);
  get diagnostics rolled_days = row_count;

  delete from public.access_events where created_at < now() - interval '30 days';
  get diagnostics purged_rows = row_count;

  return json_build_object('rolledDays', rolled_days, 'purgedRows', purged_rows);
end;
$$;

-- The app never ships an anon key, but revoke anyway so a leaked one is inert.
revoke all on function public.access_stats()  from anon, authenticated;
revoke all on function public.access_rollup() from anon, authenticated;
revoke all on function public.vn_today_start() from anon, authenticated;
revoke all on function public.access_user_event_counts() from anon, authenticated;
revoke all on function public.access_stats()  from public;
revoke all on function public.access_rollup() from public;
revoke all on function public.vn_today_start() from public;
revoke all on function public.access_user_event_counts() from public;

-- Explicit grant so this file is correct on its own, not dependent on whether
-- Supabase's default privileges happened to apply when it ran.
grant execute on function public.access_stats()    to service_role;
grant execute on function public.access_rollup()   to service_role;
grant execute on function public.vn_today_start()  to service_role;
grant execute on function public.access_user_event_counts() to service_role;
