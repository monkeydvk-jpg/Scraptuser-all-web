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
