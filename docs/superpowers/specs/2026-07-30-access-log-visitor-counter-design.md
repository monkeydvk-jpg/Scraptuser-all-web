# Per-User Access Log + Public Visitor Counter — Design

**Date:** 2026-07-30
**Status:** Approved by user

## Purpose

Two related deliverables sharing one data source:

1. **Access log** — which user (or anonymous visitor) opened which page and
   performed which action, viewable by admins in `/admin`.
2. **Visitor counter** — three public numbers in the site footer: all-time
   visits, visits today, visitors online now. The kind of counter blogs show.

Explicitly **not** Vercel Analytics: it cannot tie events to Supabase Auth
user ids, which is the primary requirement.

## Decisions (from brainstorming)

- Log **pageviews + meaningful actions**, not every `/api/*` request.
- Log **anonymous visitors too** (`user_id = null`), not only signed-in users.
- Detail rows are **purged after 30 days**.
- Counter shows **total + today + online**.
- Capture via **client beacon** (approach A), not middleware and not a
  third-party analytics service. Bots do not run JS, so this filters most
  crawler noise — which matters because anonymous hits are logged.
- The all-time total must survive the 30-day purge, so a permanent per-day
  rollup table is required. Detail table for forensics, rollup for totals.

## Data model

### `access_events` — detail, retained 30 days

| Column | Type | Notes |
|---|---|---|
| `id` | `bigserial` PK | |
| `created_at` | `timestamptz not null default now()` | |
| `visitor_id` | `uuid null` | from the `sl_vid` cookie, 1-year lifetime. Nullable because only a route handler may *set* a cookie — a server action that runs before the visitor ever loaded a tracked page can read but not mint one |
| `user_id` | `uuid null` | `null` = anonymous. Plain uuid, no FK — matches `watchlist` |
| `event_type` | `text not null` | see enum list below |
| `path` | `text null` | pathname only, no query string |
| `referrer` | `text null` | |
| `country` | `text null` | from `x-vercel-ip-country` |
| `ip` | `inet null` | |
| `user_agent` | `text null` | |
| `meta` | `jsonb null` | e.g. `{"contributor_id":"…"}` |

`event_type` values: `pageview`, `login`, `signup`, `logout`, `scrape`,
`keywords`, `watchlist_add`, `watchlist_remove`, `asset_add`, `asset_remove`.
Enforced by a `check` constraint so a typo in application code fails loudly
instead of silently writing an unqueryable row.

Every value except `pageview` is written from a server action or route
handler, so it cannot be forged by a client. Prompt generation and CSV export
are deliberately **excluded**: both run entirely in the browser with no
server round-trip, so logging them would require trusting a client-supplied
event type. Adding them later means giving them a real server endpoint first.

Indexes: `(created_at desc)`, `(user_id, created_at desc)`,
`(event_type, created_at desc)`.

RLS **enabled with no policies**, matching `20260717_auth_rls.sql`: only the
service role reaches it, and a leaked anon key reads nothing.

### `access_daily` — rollup, retained forever

`day date PK`, `pageviews bigint not null default 0`,
`visitors bigint not null default 0`. One row per day, ~40 bytes; ten years
is under 150 KB. Same RLS treatment.

`visitors` (distinct `visitor_id` that day) is stored even though the footer
counter does not use it: it cannot be recomputed once the detail rows are
purged, and it is what any later "unique visitors per day" view would need.
It is surfaced in the `/admin` panel as a per-day column.

### Counter arithmetic

- **Total** = `SUM(access_daily.pageviews)` + today's `pageview` count from
  `access_events`. The rollup only ever holds completed days, so no
  double-counting.
- **Today** = `pageview` count since 00:00 `Asia/Ho_Chi_Minh`.
- **Online** = distinct `visitor_id` in the last 5 minutes.

Day boundaries use `Asia/Ho_Chi_Minh`, not UTC, so "today" matches what the
operator sees on the clock.

## Architecture

1. **`supabase/migrations/20260730_access_log.sql`** — both tables, the check
   constraint, indexes, RLS.

2. **`src/lib/accessLog.ts`** — server-only module, the single writer.
   - `logEvent(input): Promise<void>` — never throws, never rejects; on
     failure it logs to `console.error` and returns. Tracking must not be able
     to break a request.
   - `isBot(ua: string | null): boolean` —
     `/bot|crawl|spider|slurp|headless|preview|monitor|curl|wget|python-requests/i`.
     A missing user-agent also counts as a bot: no real browser omits it.
   - `readVisitorId(): string | null` — reads the `sl_vid` cookie, or null.
     Minting a new id lives in `/api/track` rather than here, because only a
     route handler may attach the `Set-Cookie` that makes the new id stick.
   - Cookie `sl_vid`: `httpOnly`, `sameSite: 'lax'`, `secure` in production,
     `maxAge` 1 year, `path: '/'`.

3. **`POST /api/track`** (`src/app/api/track/route.ts`, `force-dynamic`) —
   body `{ path, referrer }`. Resolves `user_id` from the Supabase session
   when present, reads geo/UA/IP from headers, drops bots, inserts one
   `pageview`. Always returns `204`, even on internal failure, so the client
   never retries or surfaces an error. `path` is truncated to 512 chars and
   `referrer` to 1024; anything longer is a bug or an abuse attempt.

4. **`src/components/TrackPageview.tsx`** — client component mounted once in
   `src/app/layout.tsx`. `useEffect` on `usePathname()` fires
   `fetch('/api/track', { method: 'POST', keepalive: true })`. A module-level
   `lastPath` guard prevents double-firing from React strict-mode remounts.
   Renders `null`.

5. **Action events** — `logEvent()` called server-side at the exact place each
   action happens. This app puts mutations in server actions, not API routes,
   so the call sites are:
   - `src/app/login/actions.ts` — `signIn` → `login`, `signUp` → `signup`,
     `signOut` → `logout`
   - `src/app/watchlist/actions.ts` — `addContributor` → `watchlist_add`,
     `removeContributor` → `watchlist_remove`
   - `src/app/assets/actions.ts` — `addAsset` → `asset_add`,
     `removeAsset` → `asset_remove`
   - `src/app/api/scrape/route.ts` (`POST`) → `scrape`
   - `src/app/api/keywords/insights/route.ts` (`POST`) → `keywords`

   Each logs only on success, after the underlying operation succeeds, so the
   log never claims an action that did not happen.

6. **`GET /api/stats/visitors`** — returns `{ total, today, online }`.
   `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`, so the
   three count queries run at most once a minute per edge region regardless
   of traffic. On error returns `{ total: null, today: null, online: null }`
   with `200` — the footer then renders nothing rather than an error.

7. **`src/components/VisitorCounter.tsx`** — client component in
   `Footer.tsx`. Fetches on mount, refreshes every 60 s. Renders three chips
   styled with the existing `theme.colors` tokens, matching the current
   footer pills. Hidden entirely until real numbers exist — while loading, and
   on a failure that happens before any successful fetch. A broken counter must
   never look like a broken site. Numbers formatted with `Intl.NumberFormat`.
   New i18n keys `footer_visits_total`, `footer_visits_today`,
   `footer_visits_online` in `src/lib/i18n.ts` (vi/en).

   Once numbers are on screen, a later failed poll leaves the last good values
   in place rather than clearing them: chips that vanish and reappear on every
   network blip would alarm more than slightly stale numbers, and nothing
   depends on their freshness.

   The chip row and the footer group it joins both wrap. Three extra chips
   joining a row that already holds three items would otherwise overflow on a
   phone, which is exactly the "must not break the layout" failure this
   component is supposed to avoid.

8. **`/admin` access-log panel** — `src/app/admin/page.tsx` additionally
   fetches the 100 most recent `access_events` plus per-user event counts for
   the last 30 days. `AdminClient.tsx` gains a section: a recent-activity
   table (time, email or "Khách", event type, path, country), a per-day table
   from `access_daily` (day, pageviews, visitors), and an extra column on the
   existing user table showing that user's 30-day event count. Read-only,
   consistent with the rest of `/admin`.

9. **Cron** — `src/app/api/cron/snapshot/route.ts` gains a final step after
   the existing Adobe snapshot work, guarded so a rollup failure cannot fail
   the snapshot response:
   - upsert `access_daily` for **yesterday** (`Asia/Ho_Chi_Minh`) computed
     from `access_events`;
   - backfill any missing `access_daily` day still present in
     `access_events`, so a skipped cron run does not permanently lose a day
     from the all-time total. The backfill covers days **strictly before
     today** only — rolling up the current day would double-count it, since
     the total adds today's live count on top of the rollup;
   - `delete from access_events where created_at < now() - interval '30 days'`.

   Rollup happens **before** the purge, and the backfill makes the whole step
   idempotent — running it twice produces the same result.

## Error handling

- Supabase unconfigured (`NEXT_PUBLIC_SUPABASE_URL` /
  `SUPABASE_SERVICE_ROLE_KEY` missing) → `logEvent()` is a no-op, `/api/track`
  returns `204`, the counter API returns nulls, the footer shows no chips. The
  app behaves exactly as it does today.
- Any insert or query failure → swallowed and logged server-side. No user-facing
  error, no retry, no toast.
- Bot user-agent → dropped before the insert, so it affects neither the log nor
  the counter.
- Cron rollup failure → logged in the cron response payload; the next run's
  backfill repairs the gap.

## Privacy

Raw IP is stored because this is an audit log for the site owner. Retention is
30 days for detail rows; the permanent rollup holds only aggregate counts, no
IP, no user id, no path. Nothing is sent to a third party.

## Out of scope (v1)

Charts or time-series graphs of traffic; per-path breakdown UI; CSV export of
the log; geographic map; bot allow/deny list management; alerting; logging
prompt generation and CSV export (browser-only, see the `event_type` note).

## Testing

`npm run type-check` + `npm run build`. Manual verification:

1. Anonymous visit → row with `user_id = null`, `sl_vid` cookie set.
2. Signed-in visit → row carries the correct `user_id`.
3. Same visitor across two pages → two rows, one `visitor_id`.
4. `curl -A 'Googlebot' -X POST /api/track` → no row written.
5. Footer shows three numbers; total increments after a reload.
6. Two browsers open → `online` reads 2, drops back after 5 minutes.
7. Trigger a scrape → `scrape` event row with populated `meta`.
8. Run the cron by hand with `Authorization: Bearer $CRON_SECRET` → `access_daily`
   gains yesterday's row, old rows purged, and a second run changes nothing.
9. Non-admin cannot reach the `/admin` panel (existing guard).
