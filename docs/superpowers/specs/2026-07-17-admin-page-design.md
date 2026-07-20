# Admin Page (`/admin`) — Design

**Date:** 2026-07-17
**Status:** Approved by user

## Purpose

A read-only admin dashboard listing registered accounts and how much each one
tracks. Admin(s) are designated by email via the `ADMIN_EMAILS` env var
(initially `dinhvancntt@gmail.com`).

## Decisions (from brainstorming)

- Admin = email listed in `ADMIN_EMAILS` (comma-separated, case-insensitive).
- v1 is read-only: user list + stats. No delete-user, no password reset.
- Entry point: an extra "Quản trị" item in the avatar menu, visible to admins
  only (`/api/auth/me` gains `isAdmin`). No pill in the main nav.

## Architecture

All server-side (service key), matching the rest of the app.

1. **`src/lib/adminAuth.ts`** — `isAdminEmail(email: string | null | undefined): boolean`
   (parses `ADMIN_EMAILS`, trim + lowercase); `getAdminUser(): Promise<User | null>`
   (session user if admin, else null; never throws).
2. **Middleware** — add `/admin/:path*` to the matcher and the login-required
   set (redirects to `/login?next=/admin` when logged out). The admin-email
   check itself happens in the page (env parsing + clearer redirect).
3. **`/admin` page** (`src/app/admin/page.tsx`, `force-dynamic`):
   - `getAdminUser()`; not admin → `redirect('/')`.
   - Data via `getSupabaseAdmin()`:
     `auth.admin.listUsers({ page: 1, perPage: 50 })` (email, created_at,
     last_sign_in_at; 50 users is plenty for now — noted limitation) +
     `select user_id` from `watchlist` and `asset_watchlist`, counted per
     user in JS.
   - Renders `AdminClient` with rows
     `{ id, email, created_at, last_sign_in_at, contributors, assets }` and
     totals; same error/config card pattern as watchlist.
4. **`AdminClient.tsx`** — overview chips (total users, total contributor
   follows, total asset follows) + table (email, ngày đăng ký, đăng nhập cuối
   — "—" when never, contributor count, asset count). Marks the current
   admin's own row. vi/en via i18n.
5. **`/api/auth/me`** — response becomes `{ email, isAdmin }`.
   **`AccountMenu`** — when `isAdmin`, the dropdown gains a "Quản trị" link to
   `/admin` (Shield icon).
6. **Env** — `ADMIN_EMAILS` added to `.env.local`, `.env.example`
   (placeholder), and Vercel production. No other config.

## Error handling

- Missing/empty `ADMIN_EMAILS` → nobody is admin; `/admin` redirects home
  (fail closed). Menu item simply never shows.
- Supabase errors on the admin page → same inline error card pattern.

## Testing

`npm run type-check` + `npm run build`; manual: non-admin blocked (redirect),
admin sees list with correct counts, menu item only for admin, production
check after deploy.
