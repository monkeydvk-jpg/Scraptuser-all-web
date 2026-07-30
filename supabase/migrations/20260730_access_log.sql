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
-- total = completed days from the rollup + today's live count, so nothing is
-- counted twice: access_rollup() never writes a row for the current day.
create or replace function public.access_stats()
returns json
language sql
stable
as $$
  with rolled as (
    select coalesce(sum(pageviews), 0)::bigint as n
    from public.access_daily
    where day < (now() at time zone 'Asia/Ho_Chi_Minh')::date
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
    'total',  rolled.n + today.n,
    'today',  today.n,
    'online', online.n
  )
  from rolled, today, online;
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
  insert into public.access_daily (day, pageviews, visitors)
  select day, pageviews, visitors from src
  on conflict (day) do update set
    pageviews = greatest(public.access_daily.pageviews, excluded.pageviews),
    visitors  = greatest(public.access_daily.visitors,  excluded.visitors);
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
