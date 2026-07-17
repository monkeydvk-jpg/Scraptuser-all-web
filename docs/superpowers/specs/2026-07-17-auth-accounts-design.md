# Account Login ("quản lý tài khoản") — Design

**Date:** 2026-07-17
**Status:** Approved by user

## Purpose

Replace the single shared `DOGFOOD_USER_ID` with real accounts: anyone can
register with email + password, and each user gets their own Watchlist and
Assets data. The other tabs (Generate, Analytics, Keywords, Trends) stay
public.

## Decisions (from brainstorming)

- Supabase Auth (email + password), open self-signup.
- No email confirmation: registration is done server-side via the Auth admin
  API with `email_confirm: true`, so no SMTP setup is needed.
- Login required only for `/watchlist` and `/assets`.
- Out of scope for v1: password reset via email, password change, OAuth
  providers, admin user management.

## Architecture

### Key security decision: no anon key in the browser

The app currently talks to Supabase exclusively through the service-role key
on the server, and the tables have **no RLS policies**. Shipping the standard
`NEXT_PUBLIC_SUPABASE_ANON_KEY` browser client would let anyone query
PostgREST directly and read every user's data.

Instead, **all Supabase access stays server-side**:

- `@supabase/ssr`'s `createServerClient` manages the session cookie, but is
  instantiated with the existing `SUPABASE_SERVICE_ROLE_KEY` (server-only).
  No new env vars, nothing key-like reaches the browser.
- The header account menu learns the current user from a tiny
  `/api/auth/me` route instead of a browser Supabase client.
- Defense in depth: a migration enables RLS on all four data tables with no
  policies — only the service role (which bypasses RLS) can touch them, so a
  leaked/added anon key exposes nothing.

### 1. Dependency

Add `@supabase/ssr` (cookie-session helpers for App Router).

### 2. Server auth helper (`src/lib/supabase/serverAuth.ts`)

- `createAuthClient(cookieStore)` — `createServerClient(url, SERVICE_KEY, { cookies: ... })`
  bound to `next/headers` cookies. Used by server components, server actions,
  route handlers, and middleware (middleware passes request/response cookies).
- `getUser()` — convenience: build client from `cookies()`, return
  `(await supabase.auth.getUser()).data.user` or `null` (never throws).

### 3. Middleware (`src/middleware.ts`)

Matcher: `/watchlist/:path*`, `/assets/:path*`, `/login`.

- Refreshes the Supabase session cookie (standard `@supabase/ssr` pattern).
- No user + protected path → redirect `/login?next=<pathname>`.
- Logged-in user visiting `/login` → redirect `/watchlist`.

### 4. Login page (`src/app/login/`)

- `page.tsx` (server): reads `next` search param, renders `LoginClient`.
- `LoginClient.tsx` (client): one card with a Đăng nhập / Đăng ký segmented
  toggle; email + password fields; errors rendered inline via
  `useFormState` (no thrown errors → no "Application error" digest pages).
- `actions.ts` (server actions, both returning `{ error: string } | never`):
  - `signIn(prevState, formData)` — server client `signInWithPassword`;
    on success `redirect(next || '/watchlist')`; on failure returns a
    friendly vi/en error key result.
  - `signUp(prevState, formData)` — validates email format + password ≥ 6
    chars; `getSupabaseAdmin().auth.admin.createUser({ email, password,
    email_confirm: true })`; then signs in with the same credentials and
    redirects. Duplicate email → friendly error.
  - `signOut()` — server action: `supabase.auth.signOut()` + `redirect('/')`.

### 5. Header account menu

- `src/components/AccountMenu.tsx` (client): on mount fetches
  `/api/auth/me`. Logged out → "Đăng nhập" button linking `/login`.
  Logged in → avatar with first letter of email; dropdown (same pattern as
  ThemePicker) showing the email and a "Đăng xuất" item that submits the
  `signOut` server action.
- `src/app/api/auth/me/route.ts` — `force-dynamic` GET returning
  `{ email: string | null }` from the session cookie.
- `Header.tsx`: replace the hardcoded "SA" avatar with `<AccountMenu />`.

### 6. Per-user data (watchlist + assets)

- `src/app/watchlist/page.tsx`, `src/app/assets/page.tsx`: resolve the user
  via `getUser()`; no user → `redirect('/login?next=...')` (belt +
  suspenders with middleware). Use `user.id` in the RPC call and the
  pending-rows select instead of `DOGFOOD_USER_ID`.
- `src/app/watchlist/actions.ts`, `src/app/assets/actions.ts`: resolve the
  user in each action; no user → throw. Upsert/delete with `user.id`.
- `DOGFOOD_USER_ID` constant stays only as a reference for the data
  migration; no runtime usage remains.
- Cron is unchanged: service role, snapshots every watched id across all
  users (already deduped).

### 7. Migration (`supabase/migrations/20260717_auth_rls.sql`)

Enable RLS (no policies — service role only) on `watchlist`,
`contributor_daily_stats`, `asset_watchlist`, `asset_daily_stats`.

Manual, run once after the owner registers (template in the migration file
as a comment):

```sql
update watchlist       set user_id = '<real-user-uuid>' where user_id = '00000000-0000-0000-0000-000000000001';
update asset_watchlist set user_id = '<real-user-uuid>' where user_id = '00000000-0000-0000-0000-000000000001';
```

### 8. i18n

New vi/en keys: `login_title`, `login_sub`, `login_tab_signin`,
`login_tab_signup`, `login_email_ph`, `login_password_ph`, `login_btn_signin`,
`login_btn_signup`, `login_err_invalid`, `login_err_exists`,
`login_err_weak_password`, `login_err_generic`, `acc_signin`, `acc_signout`,
`acc_signed_in_as`.

## Error handling

- Auth server actions never throw for expected failures (wrong password,
  duplicate email, weak password) — they return error state rendered inline.
- Unexpected failures fall through to a generic inline error, not a crash.
- Pages behave as today when Supabase env vars are missing (config card).

## Testing

No test harness (project convention): `npm run type-check` + `npm run build`,
then manual verification — register, login, add asset (scoped to the new
user), logout, verify `/assets` redirects to `/login`, second account sees an
empty list, cron still snapshots.

## Deployment

No new env vars. Steps: run the RLS migration in Supabase SQL editor, push,
register the owner account, run the data-reassignment SQL.
