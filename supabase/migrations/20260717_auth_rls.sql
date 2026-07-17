-- Harden the data tables now that auth exists: enable RLS with NO policies.
-- Only the service role (which bypasses RLS) may access these tables; the
-- app never ships an anon key, and if one ever leaks it can read nothing.
alter table public.watchlist               enable row level security;
alter table public.contributor_daily_stats enable row level security;
alter table public.asset_watchlist         enable row level security;
alter table public.asset_daily_stats       enable row level security;

-- One-time data hand-over: after the owner registers, move the dogfood rows
-- to the real account (find the uuid in Supabase Auth → Users, then run):
-- update public.watchlist       set user_id = '<real-user-uuid>' where user_id = '00000000-0000-0000-0000-000000000001';
-- update public.asset_watchlist set user_id = '<real-user-uuid>' where user_id = '00000000-0000-0000-0000-000000000001';
