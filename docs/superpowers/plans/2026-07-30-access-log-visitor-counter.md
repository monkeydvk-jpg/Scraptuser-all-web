# Access Log + Visitor Counter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Log every pageview and every server-verified user action into Supabase, show the recent activity in `/admin`, and display total/today/online visitor counts in the site footer.

**Architecture:** Two tables — `access_events` (detail, purged after 30 days) and `access_daily` (per-day rollup, kept forever so the all-time total survives the purge). Pageviews arrive via a client beacon to `POST /api/track`; action events are written server-side from the existing server actions and API routes. Two Postgres functions do the arithmetic: `access_stats()` returns the three counter numbers in one round-trip, `access_rollup()` performs the nightly rollup-then-purge idempotently.

**Tech Stack:** Next.js 14 App Router, Supabase (service-role only — the app ships no anon key), existing i18n (`src/lib/i18n.ts`) and theme-token styling patterns.

**Spec:** `docs/superpowers/specs/2026-07-30-access-log-visitor-counter-design.md`

## Global Constraints

- **No test harness in this repo.** Every task verifies with `npm run type-check`, plus the concrete curl / SQL checks written into its steps. Do not add jest/vitest — that is not this plan's scope.
- Tracking must never break a request. `logEvent()` never throws and never rejects; every call site ignores its result.
- Service-role key stays server-side. Never import `supabaseAdmin.ts`, `serverAuth.ts`, or `accessLog.ts` from a client component.
- New tables get RLS **enabled with no policies**, matching `supabase/migrations/20260717_auth_rls.sql`.
- Day boundaries use `Asia/Ho_Chi_Minh` (fixed UTC+7, no DST), never UTC.
- All user-facing strings go in `src/lib/i18n.ts` with both `vi` and `en`.
- Detail retention is exactly 30 days. The rollup is never purged.
- Only `pageview` may originate from the browser. Every other `event_type` is written server-side.
- No hardcoded colors. The two touched areas style differently and each must follow its neighbours: `Footer.tsx` uses inline styles from `theme.colors` via `useAppStore()`; `AdminClient.tsx` uses the shared CSS classes (`card`, `tbl`, `table-wrap`, `num`, `mono`) with `var(--label-fg)`.

---

### Task 1: Migration — tables, rollup + stats functions

**Files:**
- Create: `supabase/migrations/20260730_access_log.sql`

**Interfaces:**
- Produces: tables `public.access_events`, `public.access_daily`; functions `public.access_stats()` and `public.access_rollup()`. Consumed by Tasks 2, 5, 7, 8.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260730_access_log.sql`:

```sql
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
  -- The `as d` alias is the documented way to read the existing row here:
  -- Postgres sanctions "the table's name (or an alias)" and nothing more, so a
  -- schema-qualified reference is not guaranteed to resolve. SET targets stay
  -- bare — qualifying those is invalid.
  insert into public.access_daily as d (day, pageviews, visitors)
  select day, pageviews, visitors from src
  on conflict (day) do update set
    pageviews = greatest(d.pageviews, excluded.pageviews),
    visitors  = greatest(d.visitors,  excluded.visitors);
  -- ROW_COUNT here is every completed day still retained, not a per-run delta.
  get diagnostics rolled_days = row_count;

  delete from public.access_events where created_at < now() - interval '30 days';
  get diagnostics purged_rows = row_count;

  return json_build_object('rolledDays', rolled_days, 'purgedRows', purged_rows);
end;
$$;

-- The app never ships an anon key, but revoke anyway so a leaked one is inert.
-- `from public` is the one that matters: CREATE FUNCTION auto-grants EXECUTE to
-- PUBLIC, and revoking from a named role never removes a standing PUBLIC grant.
revoke all on function public.access_stats()   from public, anon, authenticated;
revoke all on function public.access_rollup()  from public, anon, authenticated;
revoke all on function public.vn_today_start() from public, anon, authenticated;
```

- [ ] **Step 2: Apply the migration**

Paste the whole file into the Supabase dashboard → SQL Editor → Run (this repo has no `supabase` CLI link; the two earlier migrations were applied the same way).

Expected: `Success. No rows returned`.

- [ ] **Step 3: Verify the schema and both functions**

In the SQL Editor, run:

```sql
insert into public.access_events (visitor_id, event_type, path)
values (gen_random_uuid(), 'pageview', '/verify');

select public.access_stats();
select public.access_rollup();
select public.access_stats();
```

Expected: first `access_stats()` returns `{"total":1,"today":1,"online":1}`. `access_rollup()` returns `{"rolledDays":0,"purgedRows":0}` — zero because the only row is from *today*, which the rollup deliberately skips. The second `access_stats()` is unchanged.

- [ ] **Step 4: Verify the check constraint rejects a bad event type**

```sql
insert into public.access_events (event_type) values ('nonsense');
```

Expected: `ERROR: new row for relation "access_events" violates check constraint "access_events_event_type_check"`.

- [ ] **Step 5: Clean up the verification row**

```sql
delete from public.access_events where path = '/verify';
```

Expected: `DELETE 1`.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260730_access_log.sql
git commit -m "feat(access-log): tables, rollup and stats functions"
```

---

### Task 2: `accessLog.ts` — the single writer

**Files:**
- Create: `src/lib/accessLog.ts`

**Interfaces:**
- Consumes: `getSupabaseAdmin()` from `src/lib/supabaseAdmin.ts`; `getUser()` from `src/lib/supabase/serverAuth.ts`.
- Produces:
  - `type AccessEventType = 'pageview' | 'login' | 'signup' | 'logout' | 'scrape' | 'keywords' | 'watchlist_add' | 'watchlist_remove' | 'asset_add' | 'asset_remove'`
  - `logEvent(input: AccessEventInput): Promise<void>` — never throws
  - `isBot(ua: string | null | undefined): boolean`
  - `readVisitorId(): string | null`
  - `VISITOR_COOKIE = 'sl_vid'`
  - `visitorCookieOptions(): { httpOnly: true; sameSite: 'lax'; secure: boolean; maxAge: number; path: '/' }`

  Consumed by Tasks 3, 4.

- [ ] **Step 1: Create `src/lib/accessLog.ts`**

```ts
/**
 * Access-log writer. SERVER ONLY — imports the service-role Supabase client.
 *
 * Every function here is failure-tolerant on purpose: analytics must never be
 * able to break a page render, a form submission, or an API response. On any
 * problem we log to the server console and move on.
 */
import { cookies, headers } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getUser } from '@/lib/supabase/serverAuth';

export type AccessEventType =
  | 'pageview'
  | 'login'
  | 'signup'
  | 'logout'
  | 'scrape'
  | 'keywords'
  | 'watchlist_add'
  | 'watchlist_remove'
  | 'asset_add'
  | 'asset_remove';

export interface AccessEventInput {
  eventType: AccessEventType;
  /** Pathname only, no query string. */
  path?: string | null;
  referrer?: string | null;
  /** Omit to resolve from the session; pass `null` to force anonymous. */
  userId?: string | null;
  visitorId?: string | null;
  meta?: Record<string, unknown> | null;
}

export const VISITOR_COOKIE = 'sl_vid';

/** One year. Long enough that "total visits" means something. */
const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Postgres text columns are unbounded; these caps stop abusive payloads. */
const MAX_PATH = 512;
const MAX_REFERRER = 1024;
const MAX_UA = 512;

const BOT_RE = /bot|crawl|spider|slurp|headless|preview|monitor|curl|wget|python-requests/i;

export function isBot(ua: string | null | undefined): boolean {
  if (!ua) return true; // No user-agent at all is not a real browser.
  return BOT_RE.test(ua);
}

export function visitorCookieOptions() {
  return {
    httpOnly: true as const,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: VISITOR_COOKIE_MAX_AGE,
    path: '/' as const,
  };
}

/** The visitor's id if they already have the cookie, else null. Never throws. */
export function readVisitorId(): string | null {
  try {
    return cookies().get(VISITOR_COOKIE)?.value ?? null;
  } catch {
    return null;
  }
}

const truncate = (v: string | null | undefined, max: number): string | null =>
  v == null || v === '' ? null : v.slice(0, max);

/**
 * Insert one access event. Resolves user + request metadata itself so call
 * sites stay one line. Swallows every error.
 */
export async function logEvent(input: AccessEventInput): Promise<void> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;

    const h = headers();
    const userAgent = h.get('user-agent');
    if (isBot(userAgent)) return;

    const userId = input.userId === undefined ? (await getUser())?.id ?? null : input.userId;
    const visitorId = input.visitorId === undefined ? readVisitorId() : input.visitorId;

    // x-forwarded-for is a comma-separated chain; the client is the first entry.
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || null;

    const { error } = await getSupabaseAdmin().from('access_events').insert({
      visitor_id: visitorId,
      user_id: userId,
      event_type: input.eventType,
      path: truncate(input.path, MAX_PATH),
      referrer: truncate(input.referrer, MAX_REFERRER),
      country: h.get('x-vercel-ip-country'),
      ip,
      user_agent: truncate(userAgent, MAX_UA),
      meta: input.meta ?? null,
    });
    if (error) console.error('[accessLog] insert failed:', error.message);
  } catch (err) {
    console.error('[accessLog] logEvent threw:', err instanceof Error ? err.message : err);
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/accessLog.ts
git commit -m "feat(access-log): add failure-tolerant logEvent writer"
```

---

### Task 3: Pageview beacon — `/api/track` + `TrackPageview`

**Files:**
- Create: `src/app/api/track/route.ts`
- Create: `src/components/TrackPageview.tsx`
- Modify: `src/app/layout.tsx` (import + mount inside `<body>`)

**Interfaces:**
- Consumes: `logEvent`, `readVisitorId`, `VISITOR_COOKIE`, `visitorCookieOptions` from Task 2.
- Produces: `POST /api/track` accepting `{ path: string, referrer?: string }`, always `204`. Consumed by nothing else; `TrackPageview` is the only caller.

- [ ] **Step 1: Create `src/app/api/track/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server';
import { logEvent, readVisitorId, VISITOR_COOKIE, visitorCookieOptions } from '@/lib/accessLog';

export const dynamic = 'force-dynamic';

/**
 * Pageview beacon. Always answers 204 — the browser must never retry or see an
 * error, and a tracking outage must be invisible to the visitor.
 */
export async function POST(request: NextRequest) {
  const response = new NextResponse(null, { status: 204 });

  try {
    const body = (await request.json()) as { path?: unknown; referrer?: unknown };
    const path = typeof body.path === 'string' ? body.path : null;
    if (!path || !path.startsWith('/')) return response;

    // Mint the visitor id here: a route handler is the only place allowed to
    // set a cookie, which is why visitor_id is nullable everywhere else.
    let visitorId = readVisitorId();
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      response.cookies.set(VISITOR_COOKIE, visitorId, visitorCookieOptions());
    }

    await logEvent({
      eventType: 'pageview',
      path,
      referrer: typeof body.referrer === 'string' ? body.referrer : null,
      visitorId,
    });
  } catch (err) {
    console.error('[track] failed:', err instanceof Error ? err.message : err);
  }

  return response;
}
```

- [ ] **Step 2: Create `src/components/TrackPageview.tsx`**

```tsx
'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Fires one beacon per client-side navigation.
 *
 * `lastPath` lives at module scope, not in a ref: React strict mode remounts
 * the component in development, and a ref would reset with it and double-count.
 */
let lastPath: string | null = null;

export function TrackPageview() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname === lastPath) return;
    lastPath = pathname;

    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname, referrer: document.referrer || null }),
      keepalive: true, // survives the navigation that triggered it
    }).catch(() => {
      // A failed beacon is not worth telling the user about.
    });
  }, [pathname]);

  return null;
}
```

- [ ] **Step 3: Mount it in `src/app/layout.tsx`**

Add the import next to the other component imports:

```tsx
import { TrackPageview } from '@/components/TrackPageview';
```

and mount it inside `<body>`, right after `<ThemeApplier />`:

```tsx
        <ThemeApplier />
        <TrackPageview />
        {children}
```

- [ ] **Step 4: Type-check**

Run: `npm run type-check`
Expected: no errors.

- [ ] **Step 5: Verify a real pageview is recorded**

Start the dev server: `npm run dev`

In a browser, load `http://localhost:3000/`, then navigate to `/generate` via the nav. Then in the Supabase SQL Editor:

```sql
select event_type, path, visitor_id, user_id, user_agent is not null as has_ua
from public.access_events order by id desc limit 5;
```

Expected: two `pageview` rows (`/` and `/generate`) sharing one `visitor_id`, `user_id` null when logged out, `has_ua` true.

- [ ] **Step 6: Verify bots are dropped**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/track \
  -H 'Content-Type: application/json' -H 'User-Agent: Googlebot/2.1' \
  -d '{"path":"/bot-test"}'
```

Expected: `204`. Then confirm nothing was written:

```sql
select count(*) from public.access_events where path = '/bot-test';
```

Expected: `0`.

- [ ] **Step 7: Verify a malformed body still answers 204**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/track \
  -H 'Content-Type: application/json' -d 'not json'
```

Expected: `204`.

- [ ] **Step 8: Commit**

```bash
git add src/app/api/track/route.ts src/components/TrackPageview.tsx src/app/layout.tsx
git commit -m "feat(access-log): pageview beacon via /api/track"
```

---

### Task 4: Action events at their real call sites

**Files:**
- Modify: `src/app/login/actions.ts` (`signIn`, `signUp`, `signOut`)
- Modify: `src/app/watchlist/actions.ts` (`addContributor`, `removeContributor`)
- Modify: `src/app/assets/actions.ts` (`addAsset`, `removeAsset`)
- Modify: `src/app/api/scrape/route.ts` (`POST`)
- Modify: `src/app/api/keywords/insights/route.ts` (`POST`)

**Interfaces:**
- Consumes: `logEvent` from Task 2.
- Produces: rows with `event_type` in `login`, `signup`, `logout`, `watchlist_add`, `watchlist_remove`, `asset_add`, `asset_remove`, `scrape`, `keywords`.

Every call goes **after** the underlying operation succeeds, so the log never claims an action that failed. `logEvent` never throws, so no call site needs a try/catch.

Two rules that matter here:

1. **`redirect()` throws.** In Next.js, `redirect()` raises a `NEXT_REDIRECT` error to unwind the request, so *nothing after it runs*. Every `logEvent` call in `login/actions.ts` must come before the `redirect(...)` line.
2. **Pass `userId` explicitly** where the function already has the user. It saves a redundant `getUser()` round-trip and, for `signIn`/`signUp`, avoids depending on whether a cookie written earlier in the same request is already readable.

- [ ] **Step 1: `src/app/login/actions.ts`**

Add the import after the existing ones:

```ts
import { logEvent } from '@/lib/accessLog';
```

In `signIn`, capture the sign-in result (currently only `error` is destructured) and log before the redirect:

```ts
  const supabase = createAuthClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: 'login_err_invalid' };

  await logEvent({ eventType: 'login', userId: data.user?.id ?? null });

  redirect(safeNext(formData.get('next')));
```

In `signUp`, same change to the second `signInWithPassword` call near the end of the function:

```ts
  const supabase = createAuthClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: 'login_err_generic' };

  await logEvent({ eventType: 'signup', userId: data.user?.id ?? null });

  redirect(safeNext(formData.get('next')));
```

Replace `signOut` entirely:

```ts
export async function signOut(): Promise<void> {
  const supabase = createAuthClient();
  // Log BEFORE signing out: afterwards the session cookie is gone, userId would
  // resolve to null, and the row would lose the one fact it exists to record.
  await logEvent({ eventType: 'logout' });
  await supabase.auth.signOut();
  redirect('/');
}
```

- [ ] **Step 2: `src/app/watchlist/actions.ts`**

Add the import:

```ts
import { logEvent } from '@/lib/accessLog';
```

In `addContributor`, between the `if (error) throw ...` line and `revalidatePath('/watchlist')`:

```ts
  await logEvent({
    eventType: 'watchlist_add',
    userId: user.id,
    meta: { contributor_id: contributorId },
  });
```

In `removeContributor`, in the same position:

```ts
  await logEvent({
    eventType: 'watchlist_remove',
    userId: user.id,
    meta: { contributor_id: contributorId },
  });
```

- [ ] **Step 3: `src/app/assets/actions.ts`**

Add the import:

```ts
import { logEvent } from '@/lib/accessLog';
```

In `addAsset`, between `if (error) throw ...` and `revalidatePath('/assets')`:

```ts
  await logEvent({ eventType: 'asset_add', userId: user.id, meta: { asset_id: assetId } });
```

In `removeAsset`, same position:

```ts
  await logEvent({ eventType: 'asset_remove', userId: user.id, meta: { asset_id: assetId } });
```

- [ ] **Step 4: `src/app/api/scrape/route.ts`**

Add the import after the existing `next/server` import:

```ts
import { logEvent } from '@/lib/accessLog';
```

`POST` destructures `const { url, startPage, endPage, config } = body;` at the top and has three `return NextResponse.json(...)` sites: two are error branches (400 at ~line 171, 500 in the `catch` at ~line 248). The success one is the `return NextResponse.json({` at **~line 234**. Insert immediately above it:

```ts
    await logEvent({
      eventType: 'scrape',
      path: '/api/scrape',
      meta: { url, startPage, endPage },
    });
```

Do not log on the 400 or 500 branches. `config` is deliberately not logged — it is bulky UI state with no audit value.

- [ ] **Step 5: `src/app/api/keywords/insights/route.ts`**

Add the import:

```ts
import { logEvent } from '@/lib/accessLog';
```

The success return is `return NextResponse.json(result);` at **~line 42**. Insert immediately above it:

```ts
    await logEvent({
      eventType: 'keywords',
      path: '/api/keywords/insights',
      meta: { mode, query },
    });
```

`mode` and `query` are already local variables in the handler.

- [ ] **Step 6: Type-check**

Run: `npm run type-check`
Expected: no errors.

- [ ] **Step 7: Verify the events land, with the right user**

With `npm run dev` running: log in, add one contributor to the watchlist, remove it, run one scrape from `/generate`, then log out. In the SQL Editor:

```sql
select event_type, user_id is not null as has_user, meta
from public.access_events
where event_type <> 'pageview'
order by id desc limit 10;
```

Expected: `logout`, `watchlist_remove`, `watchlist_add`, `scrape`, `login` rows. `has_user` is true for all of them — including `logout`, which is why it is logged before the session is destroyed. `meta` is populated for the watchlist and scrape rows.

- [ ] **Step 8: Verify a failed action logs nothing**

Attempt a login with a deliberately wrong password, then:

```sql
select count(*) from public.access_events
where event_type = 'login' and created_at > now() - interval '1 minute';
```

Expected: `0` — no row for the failed attempt.

- [ ] **Step 9: Commit**

```bash
git add src/app/login/actions.ts src/app/watchlist/actions.ts src/app/assets/actions.ts \
        src/app/api/scrape/route.ts src/app/api/keywords/insights/route.ts
git commit -m "feat(access-log): log auth, watchlist, scrape and keyword events"
```

---

### Task 5: Counter API — `GET /api/stats/visitors`

**Files:**
- Create: `src/app/api/stats/visitors/route.ts`

**Interfaces:**
- Consumes: `getSupabaseAdmin()`; the `access_stats()` function from Task 1.
- Produces: `GET /api/stats/visitors` → `{ total: number | null, today: number | null, online: number | null }`, always HTTP 200. Consumed by Task 6.

- [ ] **Step 1: Create `src/app/api/stats/visitors/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

interface VisitorStats {
  total: number | null;
  today: number | null;
  online: number | null;
}

const EMPTY: VisitorStats = { total: null, today: null, online: null };

/**
 * The three public footer numbers. Always 200: nulls tell the footer to render
 * nothing, which is the right failure mode for a decorative counter.
 *
 * Cached at the edge for 60s so the counts run at most once a minute per
 * region no matter how much traffic arrives.
 */
export async function GET() {
  const headers = {
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
  };

  try {
    const { data, error } = await getSupabaseAdmin().rpc('access_stats');
    if (error) {
      console.error('[stats] rpc failed:', error.message);
      return NextResponse.json(EMPTY, { headers });
    }

    const row = data as { total?: number; today?: number; online?: number } | null;
    return NextResponse.json(
      {
        total: row?.total ?? null,
        today: row?.today ?? null,
        online: row?.online ?? null,
      } satisfies VisitorStats,
      { headers },
    );
  } catch (err) {
    console.error('[stats] threw:', err instanceof Error ? err.message : err);
    return NextResponse.json(EMPTY, { headers });
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: no errors.

- [ ] **Step 3: Verify the endpoint**

With `npm run dev` running:

```bash
curl -s http://localhost:3000/api/stats/visitors
```

Expected: JSON like `{"total":3,"today":3,"online":1}` — three numbers, none null.

- [ ] **Step 4: Verify `online` reflects recent activity only**

```sql
update public.access_events set created_at = now() - interval '10 minutes';
```

Then `curl -s http://localhost:3000/api/stats/visitors` again.

Expected: `online` is now `0`, while `total` is unchanged. (`today` also drops to 0 if the shifted rows crossed local midnight — that is correct behaviour, not a bug.)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/stats/visitors/route.ts
git commit -m "feat(access-log): visitor stats endpoint"
```

---

### Task 6: Footer counter UI

**Files:**
- Create: `src/components/VisitorCounter.tsx`
- Modify: `src/lib/i18n.ts` (add three keys near `footer_hint` on line ~224)
- Modify: `src/components/Footer.tsx` (render the counter in the right-hand pill group)

**Interfaces:**
- Consumes: `GET /api/stats/visitors` from Task 5; `useAppStore()` for `theme`; `useT()` for strings.
- Produces: `<VisitorCounter />`, rendered only by `Footer`.

- [ ] **Step 1: Add the i18n keys**

In `src/lib/i18n.ts`, immediately after the `footer_hint` line:

```ts
  footer_visits_total: { vi: 'lượt truy cập', en: 'visits' },
  footer_visits_today: { vi: 'hôm nay', en: 'today' },
  footer_visits_online: { vi: 'đang online', en: 'online' },
```

- [ ] **Step 2: Create `src/components/VisitorCounter.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useT } from '@/lib/useT';
import { Eye, CalendarDays, Radio } from 'lucide-react';

interface VisitorStats {
  total: number | null;
  today: number | null;
  online: number | null;
}

/** Keep the "online" figure from going stale while a tab sits open. */
const REFRESH_MS = 60_000;

export function VisitorCounter() {
  const { theme } = useAppStore();
  const t = useT();
  const [stats, setStats] = useState<VisitorStats | null>(null);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const res = await fetch('/api/stats/visitors', { cache: 'no-store' });
        const data = (await res.json()) as VisitorStats;
        if (alive) setStats(data);
      } catch {
        // Leave the previous value on screen; a decorative counter must not
        // flash an error or disappear on one flaky request.
      }
    };

    void load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // Render nothing until real numbers exist: an empty footer beats a broken one.
  if (!stats || stats.total == null) return null;

  const fmt = (n: number) => new Intl.NumberFormat().format(n);

  const chip = 'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs';
  const chipStyle = {
    color: theme.colors.labelFg,
    border: `1px solid ${theme.colors.highlight}26`,
  };

  return (
    <div className="flex items-center gap-2">
      <span className={chip} style={chipStyle}>
        <Eye className="w-3.5 h-3.5" />
        <strong style={{ color: theme.colors.fg }}>{fmt(stats.total)}</strong>
        {t('footer_visits_total')}
      </span>
      {stats.today != null && (
        <span className={`${chip} hidden sm:flex`} style={chipStyle}>
          <CalendarDays className="w-3.5 h-3.5" />
          <strong style={{ color: theme.colors.fg }}>{fmt(stats.today)}</strong>
          {t('footer_visits_today')}
        </span>
      )}
      {stats.online != null && (
        <span className={chip} style={chipStyle}>
          <Radio className="w-3.5 h-3.5" style={{ color: theme.colors.highlight }} />
          <strong style={{ color: theme.colors.fg }}>{fmt(stats.online)}</strong>
          {t('footer_visits_online')}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Render it in `src/components/Footer.tsx`**

Add the import:

```tsx
import { VisitorCounter } from '@/components/VisitorCounter';
```

Then place `<VisitorCounter />` as the first child of the right-hand flex group — the `<div className="flex items-center gap-3 text-sm">` on line 35, immediately before the `footer_hint` `<span>`:

```tsx
          <div className="flex items-center gap-3 text-sm">
            <VisitorCounter />
            <span
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs"
```

- [ ] **Step 4: Type-check**

Run: `npm run type-check`
Expected: no errors.

- [ ] **Step 5: Verify in the browser**

With `npm run dev` running, load `http://localhost:3000/` and scroll to the footer.

Expected: three chips reading like `👁 12,483 lượt truy cập`, `📅 214 hôm nay`, `📡 3 đang online`, styled like the neighbouring `⌘K` pill. Reload once — the total increases by 1 (after up to 60s, since the endpoint is cached).

- [ ] **Step 6: Verify it hides instead of breaking**

Temporarily make the endpoint fail: in `src/app/api/stats/visitors/route.ts`, add `throw new Error('boom');` as the first line of `GET`. Reload the footer.

Expected: no counter chips, no error text, no layout break — the rest of the footer looks normal. **Remove the `throw` line before continuing.**

- [ ] **Step 7: Verify both languages**

Switch the language toggle to English.

Expected: the chip labels become `visits` / `today` / `online`; switching back to Vietnamese restores `lượt truy cập` / `hôm nay` / `đang online`.

- [ ] **Step 8: Commit**

```bash
git add src/components/VisitorCounter.tsx src/components/Footer.tsx src/lib/i18n.ts
git commit -m "feat(access-log): visitor counter in footer"
```

---

### Task 7: Nightly rollup + purge in the existing cron

**Files:**
- Modify: `src/app/api/cron/snapshot/route.ts` (add a final step to `GET`, extend the response payload)

**Interfaces:**
- Consumes: the `access_rollup()` function from Task 1; `getSupabaseAdmin()`.
- Produces: the cron JSON response gains an `accessLog` field: `{ rolledDays: number, purgedRows: number } | { error: string }`.

This reuses the cron that already runs at 00:00 daily per `vercel.json`. Hobby plan allows very few cron entries, so do **not** add a new one.

- [ ] **Step 1: Add the rollup step to the cron handler**

In `src/app/api/cron/snapshot/route.ts`, add a timeout constant beside the file's existing timing constants (they are grouped at the top with explanatory comments — match that style):

```ts
/** The rollup is one indexed SQL statement; if it hasn't answered by now it is stuck. */
const ACCESS_ROLLUP_MS = 10_000;
```

Then, after all existing Adobe snapshot work completes and before the final `NextResponse.json(...)`, insert:

```ts
  // ── Access-log housekeeping: roll up completed days, then purge old detail.
  // Wrapped so a rollup failure can never fail the snapshot response the cron
  // is actually for. The next run's backfill repairs any skipped day.
  let accessLog: { rolledDays: number; purgedRows: number } | { error: string };
  try {
    // Bounded like every other network call here. A hang is the one failure the
    // try/catch cannot contain: it would burn the 60s maxDuration and lose the
    // snapshot response this wrapper exists to protect. Aborting the HTTP
    // request does not cancel the SQL statement — safe, since access_rollup()
    // is atomic and idempotent.
    const { data, error } = await getSupabaseAdmin()
      .rpc('access_rollup')
      .abortSignal(AbortSignal.timeout(ACCESS_ROLLUP_MS));
    if (error) throw new Error(error.message);
    accessLog = data as { rolledDays: number; purgedRows: number };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[cron] access_rollup failed:', message);
    accessLog = { error: message };
  }
```

Then add `accessLog` to the object passed to the final `NextResponse.json(...)`.

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: no errors.

- [ ] **Step 3: Seed a completed day to roll up**

In the SQL Editor:

```sql
insert into public.access_events (visitor_id, event_type, path, created_at)
select gen_random_uuid(), 'pageview', '/rollup-test', now() - interval '2 days'
from generate_series(1, 3);

insert into public.access_events (visitor_id, event_type, path, created_at)
values (gen_random_uuid(), 'pageview', '/rollup-test-old', now() - interval '40 days');
```

Expected: `INSERT 0 3` then `INSERT 0 1`.

- [ ] **Step 4: Run the cron by hand**

With `npm run dev` running, using the `CRON_SECRET` from `.env.local`:

```bash
curl -s -H "Authorization: Bearer $(grep CRON_SECRET .env.local | cut -d= -f2- | tr -d '\"')" \
  http://localhost:3000/api/cron/snapshot | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.stringify(JSON.parse(s).accessLog)))"
```

Expected: `{"rolledDays":1,"purgedRows":1}` — the 2-day-old day rolled up, the 40-day-old row purged. (`rolledDays` may be higher if earlier verification steps left rows on other past days.)

- [ ] **Step 5: Verify the rollup row and the purge**

```sql
select day, pageviews, visitors from public.access_daily order by day desc;
select count(*) from public.access_events where path = 'rollup-test-old';
select count(*) from public.access_events
where created_at < now() - interval '30 days';
```

Expected: a row for the day two days ago with `pageviews = 3`, `visitors = 3`; then `0`; then `0`.

- [ ] **Step 6: Verify idempotency**

Run the exact same curl from Step 4 a second time, then:

```sql
select day, pageviews, visitors from public.access_daily order by day desc;
```

Expected: identical numbers to Step 5 — running twice changes nothing. This is what `GREATEST` in `access_rollup()` guarantees.

- [ ] **Step 7: Verify the total survived the purge**

```bash
curl -s http://localhost:3000/api/stats/visitors
```

Expected: `total` still counts the 3 rolled-up pageviews even though today's detail no longer holds them — proof the rollup preserves history across the purge.

- [ ] **Step 8: Clean up test data**

```sql
delete from public.access_events where path like '/rollup-test%';
```

- [ ] **Step 9: Commit**

```bash
git add src/app/api/cron/snapshot/route.ts
git commit -m "feat(access-log): nightly rollup and 30-day purge in cron"
```

---

### Task 8: `/admin` access-log panel

**Files:**
- Modify: `src/app/admin/page.tsx` (fetch log data, pass new props)
- Modify: `src/app/admin/AdminClient.tsx` (render two new tables + one new column)
- Modify: `src/lib/i18n.ts` (admin log strings)

**Interfaces:**
- Consumes: `access_events`, `access_daily` from Task 1; the existing `getAdminUser()` guard and `AdminUserRow` type.
- Produces: exported types from `AdminClient.tsx`:
  - `AccessEventRow = { id: number; created_at: string; email: string | null; event_type: string; path: string | null; country: string | null }`
  - `AccessDailyRow = { day: string; pageviews: number; visitors: number }`
  - `AdminUserRow` gains `events30d: number`

**Styling note:** unlike `Footer.tsx`, `AdminClient.tsx` does **not** use `theme.colors` — it uses the shared CSS classes (`card`, `table-wrap`, `tbl`, `num`, `page-head`) and CSS variables (`var(--label-fg)`). Follow that, not the footer's inline-style approach. Existing admin i18n keys use the `adm_` prefix, so the new ones do too.

- [ ] **Step 1: Add the i18n keys**

In `src/lib/i18n.ts`, next to the existing `adm_*` keys:

```ts
  adm_log_title: { vi: 'Hoạt động gần đây', en: 'Recent activity' },
  adm_log_time: { vi: 'Thời gian', en: 'Time' },
  adm_log_who: { vi: 'Người dùng', en: 'User' },
  adm_log_guest: { vi: 'Khách', en: 'Guest' },
  adm_log_event: { vi: 'Hành động', en: 'Event' },
  adm_log_path: { vi: 'Trang', en: 'Path' },
  adm_log_country: { vi: 'Quốc gia', en: 'Country' },
  adm_log_empty: { vi: 'Chưa có hoạt động nào.', en: 'No activity yet.' },
  adm_daily_title: { vi: 'Thống kê theo ngày', en: 'Daily stats' },
  adm_daily_day: { vi: 'Ngày', en: 'Day' },
  adm_daily_pageviews: { vi: 'Lượt xem', en: 'Pageviews' },
  adm_daily_visitors: { vi: 'Khách', en: 'Visitors' },
  adm_col_events: { vi: 'Event 30 ngày', en: 'Events (30d)' },
```

- [ ] **Step 2: Fetch the log data in `src/app/admin/page.tsx`**

Inside the existing `try` block, extend the `Promise.all` with two more queries and map the results. The page already builds `rows` from `usersRes`; reuse its `countBy` helper for the per-user counts.

```ts
    const [usersRes, wlRes, awRes, logRes, dailyRes, evUserRes] = await Promise.all([
      supabase.auth.admin.listUsers({ page: 1, perPage: 50 }),
      supabase.from('watchlist').select('user_id'),
      supabase.from('asset_watchlist').select('user_id'),
      supabase
        .from('access_events')
        .select('id, created_at, user_id, event_type, path, country')
        .order('id', { ascending: false })
        .limit(100),
      supabase.from('access_daily').select('day, pageviews, visitors').order('day', { ascending: false }).limit(30),
      // Only non-null user ids: counted in JS, matching how wl/aw counts work.
      supabase.from('access_events').select('user_id').not('user_id', 'is', null),
    ]);
```

Add error checks in the same style as the existing ones:

```ts
    if (logRes.error) throw new Error(logRes.error.message);
    if (dailyRes.error) throw new Error(dailyRes.error.message);
    if (evUserRes.error) throw new Error(evUserRes.error.message);
```

Declare the two new arrays next to the existing `rows` declaration, and extend the import:

```ts
import { AdminClient, type AdminUserRow, type AccessEventRow, type AccessDailyRow } from './AdminClient';

  let rows: AdminUserRow[] = [];
  let logRows: AccessEventRow[] = [];
  let dailyRows: AccessDailyRow[] = [];
```

`events30d` must be set in the **existing** `rows = usersRes.data.users.map(...)` block, not patched on afterwards — `AdminUserRow` requires the field, so a later `.map()` that adds it would leave the original assignment failing type-check. Compute `evCounts` before that block and add one line to the mapped object:

```ts
    const evCounts = countBy(evUserRes.data as { user_id: string }[] | null);

    rows = usersRes.data.users.map((u) => ({
      id: u.id,
      email: u.email ?? null,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      contributors: wlCounts.get(u.id) ?? 0,
      assets: awCounts.get(u.id) ?? 0,
      // Detail rows only survive 30 days, so this count is inherently a 30-day window.
      events30d: evCounts.get(u.id) ?? 0,
    }));
```

Then, after that block:

```ts
    // emailById only covers the 50 users this page fetches. A log row whose
    // user_id misses the map must NOT fall back to "guest" — that would show a
    // real user's activity as anonymous traffic in the one panel meant to be
    // believed. Keep the two cases distinct in the data.
    const emailById = new Map(rows.map((r) => [r.id, r.email]));
    logRows = (logRes.data ?? []).map((e) => {
      const uid = (e.user_id as string | null) ?? null;
      const email = uid ? emailById.get(uid) ?? null : null;
      return {
        id: e.id as number,
        created_at: e.created_at as string,
        email,
        userIdShort: uid && !email ? uid.slice(0, 8) : null,
        event_type: e.event_type as string,
        path: (e.path as string | null) ?? null,
        country: (e.country as string | null) ?? null,
      };
    });

    dailyRows = (dailyRes.data ?? []) as AccessDailyRow[];
```

Finally pass them through:

```tsx
      <AdminClient
        rows={rows}
        logRows={logRows}
        dailyRows={dailyRows}
        selfId={admin.id}
        errorMsg={errorMsg}
      />
```

- [ ] **Step 3: Render the panel in `src/app/admin/AdminClient.tsx`**

3a. Add `events30d` to the exported row type (line 6-13) and export the two new types beside it:

```tsx
export interface AdminUserRow {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  contributors: number;
  assets: number;
  events30d: number;
}

export interface AccessEventRow {
  id: number;
  created_at: string;
  /** null = the row has no user_id at all, i.e. a genuinely anonymous visitor. */
  email: string | null;
  /** Set when the row HAS a user_id we could not resolve to an email — the user
   *  exists but falls outside the 50-account page. Never conflate with anonymous. */
  userIdShort: string | null;
  event_type: string;
  path: string | null;
  country: string | null;
}

export interface AccessDailyRow {
  /** ISO date, already `YYYY-MM-DD` from Postgres. */
  day: string;
  pageviews: number;
  visitors: number;
}
```

3b. Extend `Props` (line 15-20) and the destructure on line 38:

```tsx
interface Props {
  rows: AdminUserRow[];
  logRows: AccessEventRow[];
  dailyRows: AccessDailyRow[];
  selfId: string;
  /** null = ok; otherwise a raw error message. */
  errorMsg: string | null;
}
```

```tsx
export function AdminClient({ rows, logRows, dailyRows, selfId, errorMsg }: Props) {
```

3c. Add the events column to the existing user table — one `<th>` after the `adm_col_assets` header (line 84) and one `<td>` after the assets cell (line 106):

```tsx
                    <th style={{ textAlign: 'right' }}>{t('adm_col_events')}</th>
```

```tsx
                      <td className="num" style={{ textAlign: 'right' }}>{r.events30d}</td>
```

3d. Insert both new sections **after** the `adm_note_limit` paragraph (line 113) and still inside the `{!errorMsg && (<>…</>)}` fragment, so a failed fetch shows only the error card:

```tsx
          <div className="page-head" style={{ marginTop: 28 }}>
            <h1 style={{ fontSize: 20 }}>{t('adm_log_title')}</h1>
          </div>
          {logRows.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--label-fg)' }}>{t('adm_log_empty')}</p>
          ) : (
            <div className="card anim-up" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>{t('adm_log_time')}</th>
                      <th style={{ textAlign: 'left' }}>{t('adm_log_who')}</th>
                      <th style={{ textAlign: 'left' }}>{t('adm_log_event')}</th>
                      <th style={{ textAlign: 'left' }}>{t('adm_log_path')}</th>
                      <th style={{ textAlign: 'right' }}>{t('adm_log_country')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logRows.map((e) => (
                      <tr key={e.id} style={{ cursor: 'default' }}>
                        <td className="num">{fmtDateTime(e.created_at)}</td>
                        <td>
                          {e.email ?? (
                            <span style={{ color: 'var(--label-fg)' }}>{t('adm_log_guest')}</span>
                          )}
                        </td>
                        <td className="mono" style={{ fontSize: 12 }}>{e.event_type}</td>
                        <td className="mono" style={{ fontSize: 12 }}>{e.path ?? '—'}</td>
                        <td className="num" style={{ textAlign: 'right' }}>{e.country ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {dailyRows.length > 0 && (
            <>
              <div className="page-head" style={{ marginTop: 28 }}>
                <h1 style={{ fontSize: 20 }}>{t('adm_daily_title')}</h1>
              </div>
              <div className="card anim-up" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-wrap">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>{t('adm_daily_day')}</th>
                        <th style={{ textAlign: 'right' }}>{t('adm_daily_pageviews')}</th>
                        <th style={{ textAlign: 'right' }}>{t('adm_daily_visitors')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyRows.map((d) => (
                        <tr key={d.day} style={{ cursor: 'default' }}>
                          <td className="num">{d.day}</td>
                          <td className="num" style={{ textAlign: 'right' }}>{d.pageviews}</td>
                          <td className="num" style={{ textAlign: 'right' }}>{d.visitors}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
```

3e. Add the timestamp formatter next to the existing `fmtDate` helper (line 22). The log needs time-of-day, which `fmtDate`'s `slice(0, 10)` throws away:

```tsx
/**
 * Log rows need the time of day, which fmtDate deliberately drops — and they need
 * it in Vietnam time, because the daily-stats table below uses Asia/Ho_Chi_Minh
 * day boundaries. Postgres serialises timestamptz as UTC, so shift by the fixed
 * +7 offset (Vietnam has no DST) and format off the ISO string.
 */
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
const fmtDateTime = (iso: string) =>
  new Date(new Date(iso).getTime() + VN_OFFSET_MS).toISOString().replace('T', ' ').slice(0, 16);
```

This formats the ISO string rather than using `new Date().toLocaleString()` on purpose: `AdminClient` is a client component, and locale-formatted dates rendered from a server-provided string are a classic hydration-mismatch source. Displaying UTC would be worse than wrong — it can place an event on a different calendar day than the daily table right below it.

Use `'—'` for missing values, exactly as the existing table does for a never-signed-in user.

- [ ] **Step 4: Type-check**

Run: `npm run type-check`
Expected: no errors.

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: build succeeds with no type or lint errors.

- [ ] **Step 6: Verify as an admin**

With `npm run dev` running, sign in as an email listed in `ADMIN_EMAILS` and open `http://localhost:3000/admin`.

Expected: the recent-activity table lists your own pageviews and actions with your email; anonymous rows read "Khách"; the daily table shows the rolled-up day from Task 7; the user table has a populated `Event 30 ngày` column.

- [ ] **Step 7: Verify a non-admin is still blocked**

Sign in as a non-admin account and open `/admin`.

Expected: redirected to `/` — the existing `getAdminUser()` guard is untouched.

- [ ] **Step 8: Commit**

```bash
git add src/app/admin/page.tsx src/app/admin/AdminClient.tsx src/lib/i18n.ts
git commit -m "feat(access-log): admin activity and daily stats panel"
```

---

## Post-implementation

- [ ] Run the migration against **production** Supabase (SQL Editor), not just the dev project. The two tables and both functions must exist before the deployed build calls `access_stats()`.
- [ ] Deploy, then confirm on `https://stocklytic.bond`: footer shows three numbers, and a fresh visit appears in `/admin`.
- [ ] Confirm `country` is populated in production rows — `x-vercel-ip-country` only exists on Vercel, so it is always null locally. A null `country` locally is expected, not a bug.
