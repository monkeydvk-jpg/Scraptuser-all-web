/**
 * Shared constants & types for the Watchlist + growth-history feature.
 * Kept framework-free so both server components and client components can import it.
 */

/**
 * Dogfooding user id. Matches the DB default on `watchlist.user_id`.
 * Replace with real auth (per-user id) when authentication is added.
 */
export const DOGFOOD_USER_ID = '00000000-0000-0000-0000-000000000001';

/** One row returned by the `get_watchlist_growth` Postgres function. */
export interface WatchlistGrowthRow {
  contributor_id: string;
  contributor_name: string | null;
  total_assets: number;
  total_downloads: number;
  /** Downloads gained since yesterday's snapshot; null when there's no prior day. */
  growth_today: number | null;
  /** Downloads gained over ~7 days; null when there's no ≥7-day-old snapshot. */
  growth_week: number | null;
  /** Date (YYYY-MM-DD) of the latest snapshot. */
  last_snapshot: string;
}

/** A watchlist entry that has been added but has no snapshot yet. */
export interface PendingContributor {
  contributor_id: string;
  contributor_name: string | null;
  created_at: string;
}
