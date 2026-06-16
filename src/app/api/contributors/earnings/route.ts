import { NextRequest, NextResponse } from 'next/server';

const STOCK_API_BASE = 'https://stock.adobe.io/Rest/Media/1/Search/Files';
const ITEMS_PER_BATCH = 64;

/**
 * Earnings model for Adobe Stock contributors (v2 estimate):
 *
 * Adobe Stock pays contributors based on license type:
 *  - Subscription downloads:  ~$0.33 per download  (most common)
 *  - On-Demand (OD) downloads: ~$3.50 per download (weighted avg)
 *
 * Industry estimate: ~80 % subscription, ~20 % OD
 *   → blended avg ≈ (0.8 × 0.33) + (0.2 × 3.50) = $0.264 + $0.70 = ~$0.964 / download
 *
 * We expose three tiers (low / mid / high) to account for
 * portfolio composition & content-type variance.
 * We now separate rates for images and videos.
 * Image rates:
 *   - Low  (conservative): $0.33 / download  (all subscription)
 *   - Mid  (blended avg):  $0.96 / download
 *   - High (OD-heavy):     $2.50 / download
 *
 * Video rates (HD $79.99 / 4K $199.99 with ~35% royalty):
 *   - Low:  $10.00 / download
 *   - Mid:  $28.00 / download
 *   - High: $70.00 / download
 */
const IMAGE_RATE_LOW  = 0.33;
const IMAGE_RATE_MID  = 0.96;
const IMAGE_RATE_HIGH = 2.50;

const VIDEO_RATE_LOW  = 10.00;
const VIDEO_RATE_MID  = 28.00;
const VIDEO_RATE_HIGH = 70.00;

interface StockFile {
  id: number;
  nb_downloads: number;
  content_type?: string;
  creation_date?: string;
  is_gentech?: boolean;
}

interface BatchResponse {
  files?: StockFile[];
  nb_results?: number;
}

async function fetchBatch(creatorId: string, offset: number): Promise<BatchResponse> {
  const url = new URL(STOCK_API_BASE);
  url.searchParams.set('locale', 'en_US');
  url.searchParams.set('search_parameters[limit]', String(ITEMS_PER_BATCH));
  url.searchParams.set('search_parameters[offset]', String(offset));
  url.searchParams.set('search_parameters[creator_id]', creatorId);
  url.searchParams.set('result_columns[0]', 'id');
  url.searchParams.set('result_columns[1]', 'nb_downloads');
  url.searchParams.set('result_columns[2]', 'content_type');
  url.searchParams.set('result_columns[3]', 'creation_date');
  url.searchParams.set('result_columns[4]', 'is_gentech');

  const res = await fetch(url.toString(), {
    headers: {
      'x-api-key': 'AdobeStockClient1',
      'x-product': 'SearchBar/1',
      Accept: 'application/json',
    },
    // No-store so we always get fresh data
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Adobe Stock API ${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const creatorId = searchParams.get('creator_id')?.trim();
  const maxAssetsParam = searchParams.get('max_assets');
  const maxAssets = Math.min(parseInt(maxAssetsParam || '500', 10), 2000);

  if (!creatorId) {
    return NextResponse.json(
      { success: false, error: 'creator_id query parameter is required' },
      { status: 400 },
    );
  }

  try {
    // ── 1. Fetch all files up to maxAssets ────────────────────────────────
    const allFiles: StockFile[] = [];
    let nbResults = 0;
    const batchCount = Math.ceil(maxAssets / ITEMS_PER_BATCH);

    for (let i = 0; i < batchCount; i++) {
      const offset = i * ITEMS_PER_BATCH;
      const data = await fetchBatch(creatorId, offset);

      nbResults = data.nb_results ?? nbResults;

      if (!data.files || data.files.length === 0) break;
      allFiles.push(...data.files);
      if (allFiles.length >= nbResults) break; // no more pages

      // Polite delay between batches
      if (i < batchCount - 1) await new Promise((r) => setTimeout(r, 200));
    }

    if (allFiles.length === 0) {
      return NextResponse.json(
        { success: false, error: `No assets found for creator_id "${creatorId}"` },
        { status: 404 },
      );
    }

    // ── 2. Aggregate download data ────────────────────────────────────────
    let totalImageDownloads = 0;
    let totalVideoDownloads = 0;
    let monthlyImageDownloads = 0;
    let monthlyVideoDownloads = 0;

    allFiles.forEach((f) => {
      const dls = f.nb_downloads ?? 0;
      const created = new Date(f.creation_date ?? Date.now());
      const months = Math.max(
        1,
        (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24 * 30),
      );
      const mDls = dls / months;

      if (f.content_type?.includes('video')) {
        totalVideoDownloads += dls;
        monthlyVideoDownloads += mDls;
      } else {
        totalImageDownloads += dls;
        monthlyImageDownloads += mDls;
      }
    });

    const totalDownloads = totalImageDownloads + totalVideoDownloads;
    const avgDownloadsPerAsset = allFiles.length > 0 ? Math.round(totalDownloads / allFiles.length) : 0;
    const topDownloads = allFiles.length > 0 ? Math.max(...allFiles.map((f) => f.nb_downloads ?? 0)) : 0;
    const monthlyDownloads = Math.round(monthlyImageDownloads + monthlyVideoDownloads);

    // Content-type breakdown
    const aiAssets   = allFiles.filter((f) => f.is_gentech).length;
    const videoAssets = allFiles.filter((f) => f.content_type?.includes('video')).length;
    const photoAssets = allFiles.filter(
      (f) => f.content_type?.includes('jpeg') || f.content_type?.includes('jpg'),
    ).length;
    const vectorAssets = allFiles.filter((f) => f.content_type?.includes('svg')).length;
    const illustrationAssets = allFiles.filter((f) => f.content_type?.includes('png')).length;

    // ── 3. Estimate earnings (three tiers) ────────────────────────────────
    const earningsLow  = +(totalImageDownloads * IMAGE_RATE_LOW + totalVideoDownloads * VIDEO_RATE_LOW).toFixed(2);
    const earningsMid  = +(totalImageDownloads * IMAGE_RATE_MID + totalVideoDownloads * VIDEO_RATE_MID).toFixed(2);
    const earningsHigh = +(totalImageDownloads * IMAGE_RATE_HIGH + totalVideoDownloads * VIDEO_RATE_HIGH).toFixed(2);

    const monthlyEarningsLow  = +(monthlyImageDownloads * IMAGE_RATE_LOW + monthlyVideoDownloads * VIDEO_RATE_LOW).toFixed(2);
    const monthlyEarningsMid  = +(monthlyImageDownloads * IMAGE_RATE_MID + monthlyVideoDownloads * VIDEO_RATE_MID).toFixed(2);
    const monthlyEarningsHigh = +(monthlyImageDownloads * IMAGE_RATE_HIGH + monthlyVideoDownloads * VIDEO_RATE_HIGH).toFixed(2);

    // Effective blended rates
    const effectiveRateLow = totalDownloads > 0 ? earningsLow / totalDownloads : IMAGE_RATE_LOW;
    const effectiveRateMid = totalDownloads > 0 ? earningsMid / totalDownloads : IMAGE_RATE_MID;
    const effectiveRateHigh = totalDownloads > 0 ? earningsHigh / totalDownloads : IMAGE_RATE_HIGH;

    // ── 4. Respond ────────────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      version: '2.0',
      creator_id: creatorId,
      portfolio: {
        totalAssets: nbResults,
        enrichedAssets: allFiles.length,
        breakdown: {
          ai: aiAssets,
          video: videoAssets,
          photo: photoAssets,
          vector: vectorAssets,
          illustration: illustrationAssets,
        },
      },
      downloads: {
        total: totalDownloads,
        monthly: monthlyDownloads,
        avgPerAsset: avgDownloadsPerAsset,
        topAsset: topDownloads,
      },
      earnings: {
        rateModel: 'v3 – blended distinct image and video rates',
        currency: 'USD',
        rates: {
          low: +effectiveRateLow.toFixed(2),
          mid: +effectiveRateMid.toFixed(2),
          high: +effectiveRateHigh.toFixed(2),
        },
        lifetime: {
          low: earningsLow,
          mid: earningsMid,
          high: earningsHigh,
        },
        monthly: {
          low: monthlyEarningsLow,
          mid: monthlyEarningsMid,
          high: monthlyEarningsHigh,
        },
      },
    });
  } catch (error) {
    console.error('[contributors/earnings] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unexpected error',
      },
      { status: 500 },
    );
  }
}
