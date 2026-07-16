create table if not exists public.watchlist (
  id               bigint generated always as identity primary key,
  user_id          uuid not null default '00000000-0000-0000-0000-000000000001',
  contributor_id   text not null,
  contributor_name text,
  created_at       timestamptz not null default now(),
  unique (user_id, contributor_id)
);

create table if not exists public.contributor_daily_stats (
  id              bigint generated always as identity primary key,
  contributor_id  text not null,
  date            date not null default (now() at time zone 'Asia/Ho_Chi_Minh')::date,
  total_assets    integer not null,
  total_downloads bigint not null,
  unique (contributor_id, date)
);

create index if not exists idx_daily_stats_lookup
  on public.contributor_daily_stats (contributor_id, date desc);

create or replace function public.get_watchlist_growth(p_user_id uuid)
returns table (
  contributor_id   text,
  contributor_name text,
  total_assets     integer,
  total_downloads  bigint,
  growth_today     bigint,
  growth_week      bigint,
  last_snapshot    date
) language sql stable as $$
  with latest as (
    select distinct on (s.contributor_id)
      s.contributor_id, s.total_assets, s.total_downloads, s.date
    from contributor_daily_stats s
    join watchlist w
      on w.contributor_id = s.contributor_id and w.user_id = p_user_id
    order by s.contributor_id, s.date desc
  )
  select
    l.contributor_id,
    w.contributor_name,
    l.total_assets,
    l.total_downloads,
    l.total_downloads - (
      select total_downloads from contributor_daily_stats
      where contributor_id = l.contributor_id and date = l.date - 1
    ) as growth_today,
    l.total_downloads - (
      select total_downloads from contributor_daily_stats
      where contributor_id = l.contributor_id and date <= l.date - 7
      order by date desc limit 1
    ) as growth_week,
    l.date as last_snapshot
  from latest l
  join watchlist w
    on w.contributor_id = l.contributor_id and w.user_id = p_user_id
  order by growth_today desc nulls last;
$$;
