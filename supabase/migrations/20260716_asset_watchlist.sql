create table if not exists public.asset_watchlist (
  id            bigint generated always as identity primary key,
  user_id       uuid not null default '00000000-0000-0000-0000-000000000001',
  asset_id      text not null,
  asset_title   text,
  thumbnail_url text,
  memo_name     text,
  created_at    timestamptz not null default now(),
  unique (user_id, asset_id)
);

create table if not exists public.asset_daily_stats (
  id        bigint generated always as identity primary key,
  asset_id  text not null,
  date      date not null default (now() at time zone 'Asia/Ho_Chi_Minh')::date,
  downloads bigint not null,
  unique (asset_id, date)
);

create index if not exists idx_asset_daily_stats_lookup
  on public.asset_daily_stats (asset_id, date desc);

create or replace function public.get_asset_watchlist_growth(p_user_id uuid)
returns table (
  asset_id      text,
  asset_title   text,
  memo_name     text,
  thumbnail_url text,
  downloads     bigint,
  growth_today  bigint,
  growth_week   bigint,
  last_snapshot date
) language sql stable as $$
  with latest as (
    select distinct on (s.asset_id)
      s.asset_id, s.downloads, s.date
    from asset_daily_stats s
    join asset_watchlist w
      on w.asset_id = s.asset_id and w.user_id = p_user_id
    order by s.asset_id, s.date desc
  )
  select
    l.asset_id,
    w.asset_title,
    w.memo_name,
    w.thumbnail_url,
    l.downloads,
    l.downloads - (
      select downloads from asset_daily_stats
      where asset_id = l.asset_id and date = l.date - 1
    ) as growth_today,
    l.downloads - (
      select downloads from asset_daily_stats
      where asset_id = l.asset_id and date <= l.date - 7
      order by date desc limit 1
    ) as growth_week,
    l.date as last_snapshot
  from latest l
  join asset_watchlist w
    on w.asset_id = l.asset_id and w.user_id = p_user_id
  order by growth_today desc nulls last;
$$;
