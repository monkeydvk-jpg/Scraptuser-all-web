# Asset Watchlist ("Assets" tab) — Design

**Date:** 2026-07-16
**Status:** Approved by user

## Purpose

Let the user track individual Adobe Stock assets by Asset ID (media id) the same way
the existing Watchlist tracks contributors: enter an ID, the system stores it in
Supabase, a daily cron snapshots its download count, and the page shows growth per
day and per week.

## Scope

- New main-nav tab **Assets** → route `/assets` (desktop pills + mobile bottom nav).
- Long-term tracking (DB + daily snapshots). No transient "quick lookup" mode.
- Single dogfood user (`DOGFOOD_USER_ID`), same as the contributor watchlist.
- vi/en i18n for all new strings.

## Architecture

Mirrors the proven contributor-watchlist pattern end to end. Separate tables — the
contributor feature is untouched.

### 1. Adobe API client (`src/lib/adobeStock.ts`)

Add `fetchAssetById(assetId, { deadline?, headers? })`:

- Uses the existing `STOCK_API_BASE` search endpoint with
  `search_parameters[words]=<id>`, `limit=1`, and the existing
  `DEFAULT_COLUMNS` (id, title, nb_downloads, creation_date, content_type,
  thumbnail_240_url, …). Numeric queries resolve to the exact asset — the same
  trick the Adobe search bar uses. (`filters[media_id]` was the original plan
  but is silently ignored by this SearchBar endpoint — verified live
  2026-07-16 — so the returned `id` is double-checked against the request.)
- Returns the single `RawStockFile` or throws when the API errors or returns no
  file (invalid/removed asset id) — mirroring `fetchAdobeStats`'s fail-loud rule
  so the cron records a failure instead of storing a bogus 0.

### 2. Database (`supabase/migrations/20260716_asset_watchlist.sql`)

```sql
asset_watchlist (
  id bigint identity pk,
  user_id uuid not null default '00000000-0000-0000-0000-000000000001',
  asset_id text not null,
  asset_title text,          -- scraped from Adobe on add
  thumbnail_url text,        -- scraped from Adobe on add
  memo_name text,            -- optional user label
  created_at timestamptz default now(),
  unique (user_id, asset_id)
)

asset_daily_stats (
  id bigint identity pk,
  asset_id text not null,
  date date not null default (now() at time zone 'Asia/Ho_Chi_Minh')::date,
  downloads bigint not null,
  unique (asset_id, date)
)
-- index (asset_id, date desc)
```

RPC `get_asset_watchlist_growth(p_user_id uuid)` — same shape/logic as
`get_watchlist_growth`: latest snapshot per asset, `growth_today` = latest −
(date − 1), `growth_week` = latest − most recent snapshot ≤ date − 7, ordered by
`growth_today desc nulls last`. Returns asset_id, asset_title, memo_name,
thumbnail_url, downloads, growth_today, growth_week, last_snapshot.

### 3. Shared types (`src/lib/assetWatchlist.ts`)

Framework-free types `AssetGrowthRow`, `PendingAsset` — mirrors
`src/lib/watchlist.ts`. Reuses `DOGFOOD_USER_ID` from `watchlist.ts`.

### 4. Server actions (`src/app/assets/actions.ts`)

- `addAsset(formData)` — trims/validates the id (digits only), calls
  `fetchAssetById` to verify the asset exists **before** inserting; stores
  `asset_title` + `thumbnail_url` from the response plus the optional
  `memo_name`. Upsert on `(user_id, asset_id)`. A bad ID is rejected at input
  time with a thrown error.
- `removeAsset(formData)` — delete by `(user_id, asset_id)`.
- Both `revalidatePath('/assets')`.

### 5. Cron (`src/app/api/cron/snapshot/route.ts`)

Extend the existing daily job (no new vercel.json cron entry):

- After the contributor loop, load distinct `asset_id`s from `asset_watchlist`
  and loop them with a short polite delay (asset fetches are 1 light request
  each, so a smaller delay than contributors is fine, e.g. 250 ms).
- Upsert `{ asset_id, downloads }` into `asset_daily_stats` on
  `(asset_id, date)`.
- Shares the existing 55 s overall budget; per-asset deadline is small (5 s).
  Failures are appended to the same `failures` report with an `asset_id` key;
  response gains `assets_crawled` / `assets_failed` counts.

### 6. Page UI (`src/app/assets/page.tsx` + `AssetsClient.tsx`)

Mirrors `watchlist/page.tsx` + `WatchlistClient.tsx`:

- Server component fetches `get_asset_watchlist_growth` + pending rows
  (watched but no snapshot yet), `force-dynamic`, same error/config handling.
- Client renders:
  - **Add card** — inputs: Asset ID (required, numeric), memo name (optional).
  - **Growth table** — thumbnail (small, rounded), title (memo_name falls back
    to asset_title falls back to id) linked to
    `https://stock.adobe.com/images/id/<asset_id>` (external), total downloads,
    ▲ today, ▲ week (reuse the Growth cell pattern), delete button.
  - **Pending card** — assets added but not yet snapshotted.
  - Empty + error states, same as Watchlist.

### 7. Header nav (`src/components/Header.tsx`)

Add `{ href: '/assets', key: 'nav_assets', icon: ImageIcon }` (lucide `Image`)
to `NAV` — appears in desktop pills and mobile bottom nav automatically.

### 8. i18n (`src/lib/i18n.ts`)

New keys (vi/en): `nav_assets`, `as_title`, `as_sub`, `as_add_title`,
`as_add_id_ph`, `as_add_name_ph`, `as_add_btn`, `as_col_asset`,
`as_col_downloads`, `as_col_today`, `as_col_week`, `as_pending_title`,
`as_pending_desc`, `as_empty_title`, `as_empty_desc`, `as_error_title`,
`as_error_config`, `as_error_generic`, `as_snapshot`, `as_remove`.

## Error handling

- Add form: invalid/nonexistent asset id → server action throws with a clear
  Vietnamese message (same convention as `addContributor`).
- Cron: per-asset try/catch; one failure never kills the job; deadline overruns
  recorded as skipped.
- Page: `errorMsg` = 'config' when env vars missing, else raw message —
  identical to Watchlist.

## Testing

Project has no test harness; verification is manual (matches how Watchlist was
shipped): `npm run build` for types/lint, then exercise the page against the
live Supabase + Adobe API, and trigger the cron manually with the bearer secret.

## Out of scope

- Real multi-user auth (dogfood user only, same as Watchlist).
- Sparkline/history charts (growth numbers only, like Watchlist).
- Tracking assets automatically from a contributor's portfolio.
