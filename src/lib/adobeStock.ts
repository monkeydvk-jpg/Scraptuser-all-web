/**
 * Shared Adobe Stock API client (pure I/O).
 *
 * Centralises the Adobe Stock REST calls that were previously duplicated across
 * the scrape / analytics / earnings routes. Keep this layer free of business
 * logic so it can be reused and mocked easily.
 */

export const STOCK_API_BASE = 'https://stock.adobe.io/Rest/Media/1/Search/Files';
export const ITEMS_PER_BATCH = 64; // Adobe Stock API max per request

const STOCK_HEADERS = {
  'x-api-key': 'AdobeStockClient1',
  'x-product': 'SearchBar/1',
  Accept: 'application/json',
} as const;

/** Maps UI content-filter keys → Adobe Stock API content_type filter param names */
export const CONTENT_TYPE_MAP: Record<string, string | null> = {
  all: null,
  'image/jpeg': 'photo',
  'image/png': 'illustration',
  'image/svg+xml': 'vector',
  video: 'video',
  application: 'template',
  '3d': '3d',
};

export type SearchMode = 'topic' | 'creator';

export interface RawStockFile {
  id?: number;
  title?: string;
  nb_downloads?: number;
  creation_date?: string;
  content_type?: string;
  keywords?: { name: string }[];
  thumbnail_240_url?: string;
  is_gentech?: boolean;
}

interface StockApiResponse {
  files?: RawStockFile[];
  nb_results?: number;
}

const DEFAULT_COLUMNS = [
  // nb_results is only included in the response when requested as a column.
  'nb_results',
  'id',
  'title',
  'nb_downloads',
  'creation_date',
  'content_type',
  'keywords',
  'thumbnail_240_url',
  'is_gentech',
];

interface FetchParams {
  mode: SearchMode;
  query: string;
  contentFilter?: string;
  limit: number;
  offset: number;
  /** Extra request headers merged over the defaults (e.g. a User-Agent). */
  headers?: Record<string, string>;
  /**
   * ms-epoch cutoff. When set, the in-flight request is aborted if it hasn't
   * completed by then — so a hung response can't outlast a serverless budget.
   */
  deadline?: number;
}

function buildApiUrl({ mode, query, contentFilter = 'all', limit, offset }: FetchParams): string {
  const url = new URL(STOCK_API_BASE);
  url.searchParams.set('locale', 'en_US');
  url.searchParams.set('search_parameters[limit]', String(Math.min(limit, ITEMS_PER_BATCH)));
  url.searchParams.set('search_parameters[offset]', String(offset));

  if (mode === 'creator') {
    url.searchParams.set('search_parameters[creator_id]', query);
  } else {
    url.searchParams.set('search_parameters[words]', query);
  }

  if (contentFilter && contentFilter !== 'all') {
    const adobeType = CONTENT_TYPE_MAP[contentFilter];
    if (adobeType) {
      url.searchParams.set(`search_parameters[filters][content_type:${adobeType}]`, '1');
    }
  }

  DEFAULT_COLUMNS.forEach((col, i) => {
    url.searchParams.set(`result_columns[${i}]`, col);
  });

  return url.toString();
}

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

export interface FetchAssetsResult {
  files: RawStockFile[];
  nbResults: number;
}

export interface FetchAssetsParams {
  mode: SearchMode;
  query: string;
  contentFilter?: string;
  maxAssets: number;
  /** Optional cutoff (ms epoch) after which fetching stops early and returns what it has. */
  deadline?: number;
  /** Extra request headers merged over the defaults (e.g. a User-Agent). */
  headers?: Record<string, string>;
}

/**
 * Fetch up to `maxAssets` files by looping batches of 64, with a polite delay
 * between requests. Stops early when results are exhausted or the deadline passes.
 */
export async function fetchAssets({
  mode,
  query,
  contentFilter = 'all',
  maxAssets,
  deadline,
  headers,
}: FetchAssetsParams): Promise<FetchAssetsResult> {
  const cappedMax = Math.min(maxAssets, 2000);
  const files: RawStockFile[] = [];
  let nbResults = 0;
  const batchCount = Math.ceil(cappedMax / ITEMS_PER_BATCH);

  for (let i = 0; i < batchCount; i++) {
    if (deadline && Date.now() > deadline) break;

    const offset = i * ITEMS_PER_BATCH;
    const limit = Math.min(ITEMS_PER_BATCH, cappedMax - files.length);
    if (limit <= 0) break;

    let data: StockApiResponse;
    try {
      data = await fetchBatch({ mode, query, contentFilter, limit, offset, headers, deadline });
    } catch (err) {
      // Deadline hit mid-request → stop and return what we have, matching the
      // between-batch deadline break above. Any other error still propagates.
      if ((err as { name?: string })?.name === 'AbortError') break;
      throw err;
    }
    nbResults = data.nb_results ?? nbResults;

    if (!data.files || data.files.length === 0) break;
    files.push(...data.files);
    // Stop only when the API reports a definite total we've reached. Some
    // queries omit nb_results (returns 0); in that case keep paging until the
    // API yields an empty batch or we hit maxAssets.
    if (nbResults > 0 && files.length >= nbResults) break;
    if (data.files.length < ITEMS_PER_BATCH) break; // last (partial) page

    if (i < batchCount - 1) await new Promise((r) => setTimeout(r, 200));
  }

  return { files, nbResults };
}

/** Get the total number of market-wide results for a keyword (global competition). */
export async function searchCount(keyword: string): Promise<number> {
  const data = await fetchBatch({ mode: 'topic', query: keyword, limit: 1, offset: 0 });
  return data.nb_results ?? 0;
}

/**
 * Fetch a single asset by its Adobe Stock media id (the number in the asset URL).
 *
 * Queries the id via `search_parameters[words]` — the same trick the Adobe
 * search bar uses for pasted ids, which resolves numeric queries to the exact
 * asset. (`filters[media_id]` is silently IGNORED by this SearchBar endpoint —
 * verified live 2026-07-16 — so the returned id is double-checked here.)
 *
 * @throws Error when the id is not numeric, the API errors, or the exact asset
 *   is not returned (invalid/removed id) — fail loud so callers never store a
 *   bogus 0.
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
  url.searchParams.set('search_parameters[words]', id);
  DEFAULT_COLUMNS.forEach((col, i) => {
    url.searchParams.set(`result_columns[${i}]`, col);
  });

  const data = await fetchStockUrl(url.toString(), options);
  const file = data.files?.[0];
  if (!file || file.id !== Number(id)) {
    throw new Error(`Không tìm thấy asset với id "${id}" (sai id hoặc asset đã bị gỡ?)`);
  }
  return file;
}
