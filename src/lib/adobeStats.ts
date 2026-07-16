/**
 * Watchlist stat fetcher for a single Adobe Stock contributor.
 *
 * REUSES the existing Adobe Stock "SearchBar" REST client in `adobeStock.ts`
 * (`fetchAssets`, pure HTTP via `fetch`, `cache: 'no-store'`, serverless-safe) —
 * no scraper is reimplemented and no browser (puppeteer/selenium) is needed.
 *
 * - `total_assets`    → `nbResults`, the true portfolio size reported by the API.
 * - `total_downloads` → sum of per-asset `nb_downloads` over the scanned window
 *   (same definition used by `portfolioStats.computeOverview`). Exact for
 *   portfolios ≤ the scan cap; an approximation (still a valid growth signal)
 *   for larger ones.
 */
import { fetchAssets } from './adobeStock';

export interface ContributorStats {
  total_assets: number;
  total_downloads: number;
}

/** Max assets paged when summing downloads. Exact for portfolios ≤ this value. */
export const DEFAULT_MAX_ASSETS = 2000;

/** Browser-like User-Agent so requests look legitimate to Adobe's edge. */
export const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export interface FetchAdobeStatsOptions {
  /** ms-epoch cutoff; paging stops early past it (keeps the cron under maxDuration). */
  deadline?: number;
  /** Override the scan cap (defaults to DEFAULT_MAX_ASSETS). */
  maxAssets?: number;
}

/**
 * Fetch a contributor's `total_assets` and `total_downloads`.
 *
 * @throws Error if the Adobe API errors / parsing fails, or the id yields no
 *   assets (surfaced so the cron records a failure instead of storing a bogus 0).
 */
export async function fetchAdobeStats(
  contributorId: string,
  options: FetchAdobeStatsOptions = {},
): Promise<ContributorStats> {
  const id = contributorId.trim();
  if (!id) throw new Error('fetchAdobeStats: contributorId trống');

  const { files, nbResults } = await fetchAssets({
    mode: 'creator',
    query: id,
    maxAssets: options.maxAssets ?? DEFAULT_MAX_ASSETS,
    deadline: options.deadline,
    headers: { 'User-Agent': USER_AGENT },
  });

  if (nbResults === 0 && files.length === 0) {
    throw new Error(
      `Không tìm thấy asset nào cho contributor_id "${id}" (sai id hoặc portfolio rỗng?)`,
    );
  }

  const total_downloads = files.reduce((sum, f) => sum + (f.nb_downloads ?? 0), 0);
  return { total_assets: nbResults, total_downloads };
}
