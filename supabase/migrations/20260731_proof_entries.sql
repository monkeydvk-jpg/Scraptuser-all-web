-- 20260731_proof_entries.sql
--
-- "Proof of use": the real daily contributor rank the site owner publishes as
-- evidence the tool is actually used, each row backed by a screenshot. The
-- landing page scrolls these in a marquee.
--
-- Admin-only writes. No user-facing code path touches this table.

create table if not exists public.proof_entries (
  id          bigserial   primary key,
  -- The day the screenshot is evidence FOR, not the day it was uploaded. The
  -- admin backfills older days, so ordering keys off this and not created_at.
  day         date        not null,
  rank        integer     not null check (rank > 0),
  -- Object key inside the public `proof` storage bucket, e.g.
  -- '2026-07-30/9f2c....webp'. Stored instead of a full URL so the project can
  -- move Supabase hosts without rewriting every row.
  image_path  text        not null,
  created_at  timestamptz not null default now()
);

-- The marquee reads newest-day-first; created_at breaks ties within a day.
create index if not exists proof_entries_day_idx
  on public.proof_entries (day desc, created_at desc);

-- Same posture as access_events/access_daily in 20260730_access_log.sql: RLS
-- enabled with NO policies, so anon and authenticated cannot reach the table at
-- all. Every read and write goes through the service role inside a route
-- handler that has already checked ADMIN_EMAILS.
alter table public.proof_entries enable row level security;

-- Storage bucket for the screenshots. Public, because the marquee renders a
-- plain <img src> and an anonymous landing-page visitor has no session to sign
-- a URL with. Writes are unaffected by the public flag: the service role
-- bypasses storage RLS, and no policy grants anon or authenticated any write.
insert into storage.buckets (id, name, public)
values ('proof', 'proof', true)
on conflict (id) do nothing;
