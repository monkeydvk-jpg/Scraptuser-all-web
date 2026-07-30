import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { fetchAdobeStats, USER_AGENT } from '@/lib/adobeStats';
import { fetchAssetById } from '@/lib/adobeStock';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/** Polite delay between contributors so we don't hammer Adobe's API. */
const CONTRIBUTOR_DELAY_MS = 500;
/** Overall wall-clock budget, kept safely below `maxDuration` (60s). */
const OVERALL_BUDGET_MS = 55_000;
/** Hard cap per contributor so one huge portfolio can't starve the rest. */
const PER_CONTRIBUTOR_MS = 25_000;
/** Polite delay between assets — each is a single light request. */
const ASSET_DELAY_MS = 250;
/** Per-asset cap; one request should never take anywhere near this. */
const PER_ASSET_MS = 5_000;
/** The rollup is one indexed SQL statement; if it hasn't answered by now it is stuck. */
const ACCESS_ROLLUP_MS = 10_000;

interface Failure {
  contributor_id: string;
  error: string;
}

interface AssetFailure {
  asset_id: string;
  error: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Daily snapshot cron. Called by Vercel Cron (GET with
 * `Authorization: Bearer $CRON_SECRET`) — also runnable manually via curl.
 */
export async function GET(request: NextRequest) {
  // ── Auth: reject anything without the exact bearer secret. Fail closed. ──
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();
  const overallDeadline = startedAt + OVERALL_BUDGET_MS;
  const supabase = getSupabaseAdmin();

  // ── Collect every watched contributor and dedupe (many users → crawl once). ──
  const { data: watch, error: wErr } = await supabase.from('watchlist').select('contributor_id');
  if (wErr) {
    return NextResponse.json({ error: `watchlist query failed: ${wErr.message}` }, { status: 500 });
  }

  const ids = Array.from(
    new Set((watch ?? []).map((w) => (w.contributor_id as string)?.trim()).filter(Boolean)),
  );

  const failures: Failure[] = [];
  let crawled = 0;

  // ── Crawl sequentially; one failure never kills the job. ──
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];

    if (Date.now() > overallDeadline) {
      failures.push({ contributor_id: id, error: 'skipped: hết ngân sách thời gian của cron' });
      continue;
    }

    try {
      const deadline = Math.min(overallDeadline, Date.now() + PER_CONTRIBUTOR_MS);
      const stats = await fetchAdobeStats(id, { deadline });

      // Upsert on (contributor_id, date): running twice/day overwrites, never errors.
      const { error: upErr } = await supabase.from('contributor_daily_stats').upsert(
        {
          contributor_id: id,
          total_assets: stats.total_assets,
          total_downloads: stats.total_downloads,
        },
        { onConflict: 'contributor_id,date' },
      );
      if (upErr) throw new Error(`upsert failed: ${upErr.message}`);

      crawled++;
    } catch (err) {
      failures.push({
        contributor_id: id,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    if (i < ids.length - 1) await sleep(CONTRIBUTOR_DELAY_MS);
  }

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

  // ── Access-log housekeeping: roll up completed days, then purge old detail.
  // Wrapped so a rollup failure can never fail the snapshot response the cron
  // is actually for. The next run's backfill repairs any skipped day.
  let accessLog: { rolledDays: number; purgedRows: number } | { error: string };
  try {
    // Budget-aware: the contributor/asset loops above can burn the whole
    // OVERALL_BUDGET_MS, so adding a fresh, fixed ACCESS_ROLLUP_MS on top could
    // push total wall-clock time past Vercel's hard `maxDuration` kill. Shrink
    // the timeout to whatever is actually left (floored at 1s so a
    // budget-starved run still gets a real attempt instead of an instant
    // abort), leaving a 2s safety margin before the platform kills the
    // function outright.
    const rollupTimeoutMs = Math.max(
      1_000,
      Math.min(ACCESS_ROLLUP_MS, startedAt + maxDuration * 1_000 - 2_000 - Date.now()),
    );
    // Aborting only cancels the HTTP request, not the SQL statement server-side —
    // the rollup may still complete, which is safe since access_rollup() is
    // atomic and idempotent.
    const { data, error } = await getSupabaseAdmin()
      .rpc('access_rollup')
      .abortSignal(AbortSignal.timeout(rollupTimeoutMs));
    if (error) throw new Error(error.message);
    accessLog = data as { rolledDays: number; purgedRows: number };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[cron] access_rollup failed:', message);
    accessLog = { error: message };
  }

  return NextResponse.json({
    crawled,
    failed: failures.length,
    failures,
    assets_crawled: assetsCrawled,
    assets_failed: assetFailures.length,
    asset_failures: assetFailures,
    accessLog,
    at: new Date().toISOString(),
  });
}
