# Asset Watchlist ("Assets" tab) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `/assets` tab where the user enters an Adobe Stock Asset ID; the asset is stored in Supabase, snapshotted daily by the existing cron, and shown with download growth per day/week.

**Architecture:** Mirrors the contributor Watchlist end to end: new `asset_watchlist` + `asset_daily_stats` tables and a growth RPC, a `fetchAssetById` helper on the existing Adobe Stock client (using the `filters[media_id]` search filter), server actions for add/remove, an extension of the existing daily snapshot cron, and a `/assets` page cloned from the Watchlist UI.

**Tech Stack:** Next.js App Router (server components + server actions), Supabase (service-role client), Adobe Stock SearchBar REST API, lucide-react, existing i18n helper.

**Spec:** `docs/superpowers/specs/2026-07-16-asset-watchlist-design.md`

## Global Constraints

- No test harness exists in this project; each task is verified with `npm run type-check` (and `npm run build` at the end) plus manual verification in Task 7. Do not add a test framework.
- All user-facing strings go through `src/lib/i18n.ts` with both `vi` and `en` values.
- Single dogfood user: reuse `DOGFOOD_USER_ID` from `src/lib/watchlist.ts`.
- Follow existing file conventions exactly (file-header doc comments, Vietnamese error messages in server actions/cron, `force-dynamic` pages).
- Error messages thrown from server actions are user-visible; write them in Vietnamese like `addContributor` does.

---

### Task 1: Adobe Stock client — `fetchAssetById`

> **Execution correction (2026-07-16):** live testing showed
> `search_parameters[filters][media_id]` is silently ignored by the SearchBar
> endpoint. The shipped implementation queries `search_parameters[words]=<id>`
> instead (numeric queries resolve to the exact asset) and verifies the
> returned `file.id` equals the requested id. The spec was updated to match.

**Files:**
- Modify: `src/lib/adobeStock.ts` (refactor `fetchBatch`, add `fetchAssetById`)
- Modify: `src/lib/adobeStats.ts` (export `USER_AGENT`)

**Interfaces:**
- Consumes: existing `STOCK_API_BASE`, `STOCK_HEADERS`, `DEFAULT_COLUMNS`, `RawStockFile`.
- Produces: `fetchAssetById(assetId: string, options?: { deadline?: number; headers?: Record<string, string> }): Promise<RawStockFile>` — throws on invalid id, API error, or asset not found. Also `USER_AGENT: string` exported from `src/lib/adobeStats.ts`.

- [ ] **Step 1: Extract the deadline-aware fetch into a shared helper**

In `src/lib/adobeStock.ts`, replace the body of `fetchBatch` (lines ~101–130) with a shared `fetchStockUrl` helper so `fetchAssetById` doesn't duplicate the abort logic:

```ts
/** Deadline-aware GET against the Stock API. Shared by fetchBatch/fetchAssetById. */
async function fetchStockUrl(
  url: string,
  { headers, deadline }: { headers?: Record<string, string>; deadline?: number },
): Promise<StockApiResponse> {
  const merged = headers ? { ...STOCK_HEADERS, ...headers } : STOCK_HEADERS;

  // Bound the request by the caller's deadline. Without a signal, an in-flight
  // fetch has no timeout (Node's global fetch defaults to minutes), so a single
  // stalled response could outlast a serverless maxDuration.
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  if (deadline != null) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      const err = new Error('Adobe Stock fetch aborted: deadline reached before request');
      err.name = 'AbortError';
      throw err;
    }
    timer = setTimeout(() => controller.abort(), remaining);
  }

  try {
    const res = await fetch(url, { headers: merged, cache: 'no-store', signal: controller.signal });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Adobe Stock API ${res.status}: ${text.slice(0, 200)}`);
    }
    return res.json();
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Fetch a single batch (≤ 64 files) from the Adobe Stock API. */
export async function fetchBatch(params: FetchParams): Promise<StockApiResponse> {
  return fetchStockUrl(buildApiUrl(params), { headers: params.headers, deadline: params.deadline });
}
```

- [ ] **Step 2: Add `fetchAssetById` at the end of `src/lib/adobeStock.ts`**

```ts
/**
 * Fetch a single asset by its Adobe Stock media id (the number in the asset URL).
 *
 * @throws Error when the id is not numeric, the API errors, or no asset is
 *   returned (invalid/removed id) — fail loud so callers never store a bogus 0.
 */
export async function fetchAssetById(
  assetId: string,
  options: { deadline?: number; headers?: Record<string, string> } = {},
): Promise<RawStockFile> {
  const id = assetId.trim();
  if (!/^\d+$/.test(id)) {
    throw new Error(`Asset id không hợp lệ: "${assetId}" (phải là dãy số)`);
  }

  const url = new URL(STOCK_API_BASE);
  url.searchParams.set('locale', 'en_US');
  url.searchParams.set('search_parameters[limit]', '1');
  url.searchParams.set('search_parameters[offset]', '0');
  url.searchParams.set('search_parameters[filters][media_id]', id);
  DEFAULT_COLUMNS.forEach((col, i) => {
    url.searchParams.set(`result_columns[${i}]`, col);
  });

  const data = await fetchStockUrl(url.toString(), options);
  const file = data.files?.[0];
  if (!file) {
    throw new Error(`Không tìm thấy asset với id "${id}" (sai id hoặc asset đã bị gỡ?)`);
  }
  return file;
}
```

- [ ] **Step 3: Export `USER_AGENT` from `src/lib/adobeStats.ts`**

Change the existing const (line ~25) from:

```ts
const USER_AGENT =
```

to:

```ts
/** Browser-like User-Agent so requests look legitimate to Adobe's edge. */
export const USER_AGENT =
```

(Keep the existing comment above it — just add `export`.)

- [ ] **Step 4: Verify types**

Run: `npm run type-check`
Expected: exits 0, no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/adobeStock.ts src/lib/adobeStats.ts
git commit -m "feat(stock): add fetchAssetById via media_id filter"
```

---

### Task 2: Supabase migration — asset tables + growth RPC

**Files:**
- Create: `supabase/migrations/20260716_asset_watchlist.sql`

**Interfaces:**
- Produces: tables `public.asset_watchlist`, `public.asset_daily_stats`; RPC `get_asset_watchlist_growth(p_user_id uuid)` returning `(asset_id text, asset_title text, memo_name text, thumbnail_url text, downloads bigint, growth_today bigint, growth_week bigint, last_snapshot date)`.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/20260716_asset_watchlist.sql`:

```sql
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
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260716_asset_watchlist.sql
git commit -m "feat(db): asset_watchlist tables + growth RPC"
```

Note: the SQL must also be run against the live Supabase project (SQL editor or CLI) — that happens in Task 7 (manual verification), same as the watchlist migration was applied.

---

### Task 3: Shared types + server actions

**Files:**
- Create: `src/lib/assetWatchlist.ts`
- Create: `src/app/assets/actions.ts`

**Interfaces:**
- Consumes: `fetchAssetById`, `USER_AGENT` (Task 1), `getSupabaseAdmin` from `src/lib/supabaseAdmin`, `DOGFOOD_USER_ID` from `src/lib/watchlist`.
- Produces:
  - `AssetGrowthRow { asset_id: string; asset_title: string | null; memo_name: string | null; thumbnail_url: string | null; downloads: number; growth_today: number | null; growth_week: number | null; last_snapshot: string }`
  - `PendingAsset { asset_id: string; asset_title: string | null; memo_name: string | null; thumbnail_url: string | null; created_at: string }`
  - Server actions `addAsset(formData: FormData): Promise<void>` (form fields `asset_id`, `memo_name`) and `removeAsset(formData: FormData): Promise<void>` (form field `asset_id`).

- [ ] **Step 1: Create `src/lib/assetWatchlist.ts`**

```ts
/**
 * Shared types for the Asset Watchlist (per-asset growth tracking).
 * Kept framework-free so both server and client components can import it.
 * The dogfood user id is shared with the contributor watchlist
 * (`DOGFOOD_USER_ID` in `watchlist.ts`).
 */

/** One row returned by the `get_asset_watchlist_growth` Postgres function. */
export interface AssetGrowthRow {
  asset_id: string;
  asset_title: string | null;
  memo_name: string | null;
  thumbnail_url: string | null;
  downloads: number;
  /** Downloads gained since yesterday's snapshot; null when there's no prior day. */
  growth_today: number | null;
  /** Downloads gained over ~7 days; null when there's no ≥7-day-old snapshot. */
  growth_week: number | null;
  /** Date (YYYY-MM-DD) of the latest snapshot. */
  last_snapshot: string;
}

/** An asset that has been added but has no snapshot yet. */
export interface PendingAsset {
  asset_id: string;
  asset_title: string | null;
  memo_name: string | null;
  thumbnail_url: string | null;
  created_at: string;
}
```

- [ ] **Step 2: Create `src/app/assets/actions.ts`**

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { DOGFOOD_USER_ID } from '@/lib/watchlist';
import { fetchAssetById } from '@/lib/adobeStock';
import { USER_AGENT } from '@/lib/adobeStats';

/**
 * Add (or re-label) an asset on the dogfooding user's asset watchlist.
 * Validates the id against Adobe first so a bad id is rejected at input time,
 * and stores the scraped title + thumbnail for display.
 */
export async function addAsset(formData: FormData): Promise<void> {
  const assetId = String(formData.get('asset_id') ?? '').trim();
  const memo = String(formData.get('memo_name') ?? '').trim();
  if (!assetId) return;

  const file = await fetchAssetById(assetId, {
    deadline: Date.now() + 10_000,
    headers: { 'User-Agent': USER_AGENT },
  });

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('asset_watchlist').upsert(
    {
      user_id: DOGFOOD_USER_ID,
      asset_id: assetId,
      asset_title: file.title ?? null,
      thumbnail_url: file.thumbnail_240_url ?? null,
      memo_name: memo || null,
    },
    { onConflict: 'user_id,asset_id' },
  );
  if (error) throw new Error(`Không thêm được asset: ${error.message}`);

  revalidatePath('/assets');
}

/** Remove an asset from the dogfooding user's asset watchlist. */
export async function removeAsset(formData: FormData): Promise<void> {
  const assetId = String(formData.get('asset_id') ?? '').trim();
  if (!assetId) return;

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('asset_watchlist')
    .delete()
    .eq('user_id', DOGFOOD_USER_ID)
    .eq('asset_id', assetId);
  if (error) throw new Error(`Không xoá được asset: ${error.message}`);

  revalidatePath('/assets');
}
```

- [ ] **Step 3: Verify types**

Run: `npm run type-check`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add src/lib/assetWatchlist.ts src/app/assets/actions.ts
git commit -m "feat(assets): types + add/remove server actions"
```

---

### Task 4: Extend the daily snapshot cron

**Files:**
- Modify: `src/app/api/cron/snapshot/route.ts`

**Interfaces:**
- Consumes: `fetchAssetById`, `USER_AGENT` (Task 1); tables from Task 2.
- Produces: cron response gains `assets_crawled: number`, `assets_failed: number`, `asset_failures: { asset_id: string; error: string }[]`.

- [ ] **Step 1: Add imports and constants**

In `src/app/api/cron/snapshot/route.ts`, extend the import from `@/lib/adobeStats`:

```ts
import { fetchAdobeStats, USER_AGENT } from '@/lib/adobeStats';
import { fetchAssetById } from '@/lib/adobeStock';
```

Below the existing constants add:

```ts
/** Polite delay between assets — each is a single light request. */
const ASSET_DELAY_MS = 250;
/** Per-asset cap; one request should never take anywhere near this. */
const PER_ASSET_MS = 5_000;
```

and next to the `Failure` interface:

```ts
interface AssetFailure {
  asset_id: string;
  error: string;
}
```

- [ ] **Step 2: Add the asset loop after the contributor loop**

Insert before the final `return NextResponse.json({...})`:

```ts
  // ── Snapshot watched assets (single request each, so run after contributors). ──
  const { data: watchedAssets, error: aErr } = await supabase
    .from('asset_watchlist')
    .select('asset_id');

  const assetFailures: AssetFailure[] = [];
  let assetsCrawled = 0;

  if (aErr) {
    assetFailures.push({ asset_id: '*', error: `asset_watchlist query failed: ${aErr.message}` });
  } else {
    const assetIds = Array.from(
      new Set((watchedAssets ?? []).map((a) => (a.asset_id as string)?.trim()).filter(Boolean)),
    );

    for (let i = 0; i < assetIds.length; i++) {
      const id = assetIds[i];

      if (Date.now() > overallDeadline) {
        assetFailures.push({ asset_id: id, error: 'skipped: hết ngân sách thời gian của cron' });
        continue;
      }

      try {
        const deadline = Math.min(overallDeadline, Date.now() + PER_ASSET_MS);
        const file = await fetchAssetById(id, { deadline, headers: { 'User-Agent': USER_AGENT } });

        // Upsert on (asset_id, date): running twice/day overwrites, never errors.
        const { error: upErr } = await supabase.from('asset_daily_stats').upsert(
          { asset_id: id, downloads: file.nb_downloads ?? 0 },
          { onConflict: 'asset_id,date' },
        );
        if (upErr) throw new Error(`upsert failed: ${upErr.message}`);

        assetsCrawled++;
      } catch (err) {
        assetFailures.push({
          asset_id: id,
          error: err instanceof Error ? err.message : String(err),
        });
      }

      if (i < assetIds.length - 1) await sleep(ASSET_DELAY_MS);
    }
  }
```

- [ ] **Step 3: Extend the response payload**

Replace the final `return NextResponse.json({...})` with:

```ts
  return NextResponse.json({
    crawled,
    failed: failures.length,
    failures,
    assets_crawled: assetsCrawled,
    assets_failed: assetFailures.length,
    asset_failures: assetFailures,
    at: new Date().toISOString(),
  });
```

- [ ] **Step 4: Verify types**

Run: `npm run type-check`
Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/cron/snapshot/route.ts
git commit -m "feat(cron): snapshot watched assets daily"
```

---

### Task 5: i18n strings + header nav entry

**Files:**
- Modify: `src/lib/i18n.ts` (append keys before the closing `};` of `STR`)
- Modify: `src/components/Header.tsx` (NAV array + icon import)

**Interfaces:**
- Produces: i18n keys `nav_assets`, `as_*` (listed below) usable via `t()`/`useT()`; nav pill + mobile nav item linking to `/assets`.

- [ ] **Step 1: Append i18n keys**

In `src/lib/i18n.ts`, immediately after the `wl_error_generic` entry (before the closing `};` at line ~400), add:

```ts
  // ── Asset watchlist ──
  nav_assets: { vi: 'Asset', en: 'Assets' },
  as_title: { vi: 'Theo dõi Asset ID', en: 'Asset tracking' },
  as_sub: {
    vi: 'Theo dõi lượt tải của từng asset Adobe Stock theo Asset ID, cập nhật mỗi ngày. Tăng trưởng = chênh lệch giữa các bản chụp.',
    en: 'Track downloads of individual Adobe Stock assets by Asset ID, refreshed daily. Growth = the delta between snapshots.',
  },
  as_add_title: { vi: 'Thêm asset', en: 'Add an asset' },
  as_add_id_ph: { vi: 'Asset ID (vd 123456789)', en: 'Asset ID (e.g. 123456789)' },
  as_add_name_ph: { vi: 'Tên gợi nhớ (tuỳ chọn)', en: 'Memo name (optional)' },
  as_add_btn: { vi: 'Theo dõi', en: 'Add' },
  as_col_asset: { vi: 'Asset', en: 'Asset' },
  as_col_downloads: { vi: 'Downloads', en: 'Downloads' },
  as_col_today: { vi: 'Hôm nay', en: 'Today' },
  as_col_week: { vi: '7 ngày', en: '7 days' },
  as_remove: { vi: 'Bỏ theo dõi', en: 'Untrack' },
  as_snapshot: { vi: 'snapshot', en: 'snapshot' },
  as_pending_title: { vi: 'Đang chờ snapshot đầu tiên', en: 'Awaiting first snapshot' },
  as_pending_desc: {
    vi: 'Đã thêm nhưng chưa có dữ liệu. Cron 07:00 (VN) mỗi ngày sẽ chụp lần đầu — hoặc gọi tay endpoint cron.',
    en: 'Added but no data yet. The daily 07:00 (VN) cron takes the first snapshot — or trigger the cron manually.',
  },
  as_empty_title: { vi: 'Chưa theo dõi asset nào', en: 'No assets tracked yet' },
  as_empty_desc: {
    vi: 'Nhập Asset ID của một asset Adobe Stock để bắt đầu theo dõi lượt tải.',
    en: 'Enter an Adobe Stock Asset ID to start tracking its downloads.',
  },
  as_error_title: { vi: 'Không tải được danh sách asset', en: 'Could not load tracked assets' },
  as_error_config: {
    vi: 'Supabase chưa cấu hình. Thêm NEXT_PUBLIC_SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY vào biến môi trường.',
    en: 'Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to the environment.',
  },
  as_error_generic: {
    vi: 'Lỗi khi truy vấn dữ liệu. Bạn đã chạy migration SQL 20260716_asset_watchlist trên Supabase chưa?',
    en: 'Error querying data. Did you run the 20260716_asset_watchlist SQL migration on Supabase?',
  },
```

- [ ] **Step 2: Add the nav entry in `src/components/Header.tsx`**

Extend the lucide import (line 6) with `Image as ImageIcon`:

```ts
import { Zap, BarChart3, Compass, TrendingUp, Eye, LineChart, Palette, Search, Check, Image as ImageIcon } from 'lucide-react';
```

Add to the `NAV` array after the watchlist entry:

```ts
  { href: '/assets', key: 'nav_assets', icon: ImageIcon },
```

- [ ] **Step 3: Verify types**

Run: `npm run type-check`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n.ts src/components/Header.tsx
git commit -m "feat(assets): nav tab + vi/en strings"
```

---

### Task 6: `/assets` page (server component + client UI)

**Files:**
- Create: `src/app/assets/page.tsx`
- Create: `src/app/assets/AssetsClient.tsx`

**Interfaces:**
- Consumes: `AssetGrowthRow`, `PendingAsset` (Task 3), `addAsset`/`removeAsset` (Task 3), RPC `get_asset_watchlist_growth` (Task 2), i18n keys (Task 5), `useT` from `@/lib/useT`, `Header`/`Footer` components.

- [ ] **Step 1: Create `src/app/assets/page.tsx`**

```tsx
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { DOGFOOD_USER_ID } from '@/lib/watchlist';
import type { AssetGrowthRow, PendingAsset } from '@/lib/assetWatchlist';
import { AssetsClient } from './AssetsClient';

export const dynamic = 'force-dynamic';

export default async function AssetsPage() {
  let rows: AssetGrowthRow[] = [];
  let pending: PendingAsset[] = [];
  let errorMsg: string | null = null;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    errorMsg = 'config';
  } else {
    try {
      const supabase = getSupabaseAdmin();
      const [growthRes, watchRes] = await Promise.all([
        supabase.rpc('get_asset_watchlist_growth', { p_user_id: DOGFOOD_USER_ID }),
        supabase
          .from('asset_watchlist')
          .select('asset_id, asset_title, memo_name, thumbnail_url, created_at')
          .eq('user_id', DOGFOOD_USER_ID)
          .order('created_at', { ascending: false }),
      ]);

      if (growthRes.error) throw new Error(growthRes.error.message);
      if (watchRes.error) throw new Error(watchRes.error.message);

      rows = (growthRes.data as AssetGrowthRow[] | null) ?? [];
      const tracked = new Set(rows.map((r) => r.asset_id));
      pending = ((watchRes.data as PendingAsset[] | null) ?? []).filter(
        (w) => !tracked.has(w.asset_id),
      );
    } catch (err) {
      errorMsg = err instanceof Error ? err.message : String(err);
    }
  }

  return (
    <main className="app">
      <div className="bg-aura" />
      <Header />
      <AssetsClient rows={rows} pending={pending} errorMsg={errorMsg} />
      <Footer />
    </main>
  );
}
```

- [ ] **Step 2: Create `src/app/assets/AssetsClient.tsx`**

```tsx
'use client';

import { ImageIcon, Plus, Trash2, AlertTriangle, Clock, ExternalLink } from 'lucide-react';
import { useT } from '@/lib/useT';
import type { AssetGrowthRow, PendingAsset } from '@/lib/assetWatchlist';
import { addAsset, removeAsset } from './actions';

const NF = new Intl.NumberFormat('vi-VN');

/** Growth cell: ▲ +N green (positive), ▼ N red (negative), "—" when null (insufficient data). */
function Growth({ value }: { value: number | null }) {
  if (value === null || value === undefined) {
    return <span style={{ color: 'var(--label-fg)' }}>—</span>;
  }
  if (value > 0) {
    return (
      <span className="num" style={{ color: 'var(--success)', fontWeight: 600 }}>
        ▲ +{NF.format(value)}
      </span>
    );
  }
  if (value < 0) {
    return (
      <span className="num" style={{ color: 'var(--error)', fontWeight: 600 }}>
        ▼ {NF.format(Math.abs(value))}
      </span>
    );
  }
  return (
    <span className="num" style={{ color: 'var(--label-fg)' }}>
      0
    </span>
  );
}

/** Small rounded thumbnail with a neutral fallback when Adobe has no preview. */
function Thumb({ url, alt }: { url: string | null; alt: string }) {
  if (!url) {
    return (
      <span
        className="row"
        style={{
          width: 44, height: 44, borderRadius: 8, flex: 'none',
          background: 'var(--frame-bg, rgba(127,127,127,.12))', alignItems: 'center', justifyContent: 'center',
        }}
        aria-hidden="true"
      >
        <ImageIcon style={{ width: 18, height: 18, color: 'var(--label-fg)' }} />
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={url}
      alt={alt}
      width={44}
      height={44}
      style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flex: 'none' }}
    />
  );
}

interface Props {
  rows: AssetGrowthRow[];
  pending: PendingAsset[];
  /** null = ok; 'config' = env missing; otherwise a raw error message. */
  errorMsg: string | null;
}

export function AssetsClient({ rows, pending, errorMsg }: Props) {
  const t = useT();
  const assetUrl = (id: string) => `https://stock.adobe.com/images/id/${encodeURIComponent(id)}`;
  const displayName = (a: { memo_name: string | null; asset_title: string | null; asset_id: string }) =>
    a.memo_name || a.asset_title || a.asset_id;

  return (
    <div className="page-wrap anim-up">
      <div className="page-head">
        <h1>{t('as_title')}</h1>
        <p>{t('as_sub')}</p>
      </div>

      {/* Add asset */}
      <div className="card anim-up" style={{ marginBottom: 18 }}>
        <div className="card-head">
          <span className="icon-badge">
            <Plus />
          </span>
          <span className="ttl">{t('as_add_title')}</span>
        </div>
        <form action={addAsset} className="row wrap" style={{ gap: 10 }}>
          <input
            className="input"
            name="asset_id"
            required
            inputMode="numeric"
            pattern="\d+"
            placeholder={t('as_add_id_ph')}
            aria-label={t('as_add_id_ph')}
            style={{ flex: '1 1 200px', minWidth: 160 }}
          />
          <input
            className="input"
            name="memo_name"
            placeholder={t('as_add_name_ph')}
            aria-label={t('as_add_name_ph')}
            style={{ flex: '1 1 200px', minWidth: 160 }}
          />
          <button type="submit" className="btn btn-primary">
            <Plus /> {t('as_add_btn')}
          </button>
        </form>
      </div>

      {/* Error / config states */}
      {errorMsg && (
        <div className="card anim-up">
          <div className="state-box">
            <div
              className="state-icon"
              style={{ background: 'var(--error-15)', borderColor: 'transparent', color: 'var(--error)' }}
            >
              <AlertTriangle />
            </div>
            <h3>{t('as_error_title')}</h3>
            <p>{errorMsg === 'config' ? t('as_error_config') : t('as_error_generic')}</p>
            {errorMsg !== 'config' && (
              <p className="mono" style={{ fontSize: 12, color: 'var(--label-fg)', wordBreak: 'break-word' }}>
                {errorMsg}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Empty state (no data at all) */}
      {!errorMsg && rows.length === 0 && pending.length === 0 && (
        <div className="card anim-up">
          <div className="state-box">
            <div className="state-icon">
              <ImageIcon />
            </div>
            <h3>{t('as_empty_title')}</h3>
            <p>{t('as_empty_desc')}</p>
          </div>
        </div>
      )}

      {/* Growth table */}
      {!errorMsg && rows.length > 0 && (
        <div className="card anim-up" style={{ padding: 0, overflow: 'hidden', marginBottom: 18 }}>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>{t('as_col_asset')}</th>
                  <th style={{ textAlign: 'right' }}>{t('as_col_downloads')}</th>
                  <th style={{ textAlign: 'right' }}>{t('as_col_today')}</th>
                  <th style={{ textAlign: 'right' }}>{t('as_col_week')}</th>
                  <th style={{ width: 44 }} aria-label="actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.asset_id} style={{ cursor: 'default' }}>
                    <td>
                      <div className="row" style={{ gap: 10 }}>
                        <Thumb url={r.thumbnail_url} alt={displayName(r)} />
                        <div className="stack" style={{ gap: 3 }}>
                          <a
                            href={assetUrl(r.asset_id)}
                            target="_blank"
                            rel="noreferrer"
                            className="row"
                            style={{ gap: 5, fontWeight: 600, color: 'var(--fg)', textDecoration: 'none', width: 'fit-content' }}
                          >
                            {displayName(r)}
                            <ExternalLink style={{ width: 12, height: 12, color: 'var(--label-fg)' }} />
                          </a>
                          <span className="num" style={{ fontSize: 11.5, color: 'var(--label-fg)' }}>
                            #{r.asset_id} · {t('as_snapshot')} {r.last_snapshot}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="num" style={{ textAlign: 'right' }}>{NF.format(r.downloads)}</td>
                    <td style={{ textAlign: 'right' }}><Growth value={r.growth_today} /></td>
                    <td style={{ textAlign: 'right' }}><Growth value={r.growth_week} /></td>
                    <td style={{ textAlign: 'right' }}>
                      <form action={removeAsset}>
                        <input type="hidden" name="asset_id" value={r.asset_id} />
                        <button
                          type="submit"
                          className="btn btn-ghost"
                          title={t('as_remove')}
                          aria-label={`${t('as_remove')} ${displayName(r)}`}
                          style={{ padding: '6px 8px' }}
                        >
                          <Trash2 style={{ width: 15, height: 15 }} />
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pending: added but no snapshot yet */}
      {!errorMsg && pending.length > 0 && (
        <div className="card anim-up">
          <div className="card-head">
            <span className="icon-badge tint-warning">
              <Clock />
            </span>
            <span className="ttl">{t('as_pending_title')}</span>
            <span className="sub">{pending.length}</span>
          </div>
          <p style={{ margin: '0 0 12px', color: 'var(--label-fg)', fontSize: 13.5, lineHeight: 1.5 }}>
            {t('as_pending_desc')}
          </p>
          <div className="stack" style={{ gap: 8 }}>
            {pending.map((p) => (
              <div key={p.asset_id} className="row spread" style={{ gap: 10 }}>
                <div className="row" style={{ gap: 8 }}>
                  <Thumb url={p.thumbnail_url} alt={displayName(p)} />
                  <span style={{ fontWeight: 600 }}>{displayName(p)}</span>
                  <span className="num" style={{ fontSize: 11.5, color: 'var(--label-fg)' }}>
                    #{p.asset_id}
                  </span>
                </div>
                <form action={removeAsset}>
                  <input type="hidden" name="asset_id" value={p.asset_id} />
                  <button
                    type="submit"
                    className="btn btn-ghost"
                    title={t('as_remove')}
                    aria-label={`${t('as_remove')} ${displayName(p)}`}
                    style={{ padding: '6px 8px' }}
                  >
                    <Trash2 style={{ width: 15, height: 15 }} />
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

Note: `ImageIcon` is a real lucide-react export (alias of `Image`) — used here to avoid shadowing `next/image`.

- [ ] **Step 3: Verify types + production build**

Run: `npm run type-check`
Expected: exits 0.

Run: `npm run build`
Expected: build succeeds; `/assets` appears in the route list as dynamic (ƒ).

- [ ] **Step 4: Commit**

```bash
git add src/app/assets/page.tsx src/app/assets/AssetsClient.tsx
git commit -m "feat(assets): /assets tracking page"
```

---

### Task 7: Manual verification (live services)

**Files:** none (verification only)

- [ ] **Step 1: Apply the migration to Supabase**

Run the contents of `supabase/migrations/20260716_asset_watchlist.sql` in the Supabase SQL editor (or `supabase db push` if the CLI is linked). Requires the user's Supabase access — flag to the user if credentials are unavailable.

- [ ] **Step 2: Exercise the page**

- `npm run dev`, open `http://localhost:3000/assets`.
- Confirm the "Assets" pill shows in the header (desktop + mobile widths) in both VI/EN.
- Add a real Adobe Stock asset id (take one from any stock.adobe.com asset URL). Expect it to appear in the "Awaiting first snapshot" card with its real title + thumbnail.
- Add a garbage id (e.g. `999999999999999`). Expect the server action to throw the "Không tìm thấy asset" error.
- Remove the asset via the trash button; expect it to disappear.

- [ ] **Step 3: Trigger the cron manually**

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/snapshot
```

Expected JSON includes `assets_crawled: 1`, `assets_failed: 0`. Reload `/assets`: the asset moves from pending to the growth table with today's snapshot and downloads count ("—" for growth until tomorrow).

- [ ] **Step 4: Report results to the user**

Summarize what was verified and anything that could not be verified locally (e.g. Vercel cron scheduling in production).
