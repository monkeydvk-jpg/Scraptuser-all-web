import { NextRequest, NextResponse } from 'next/server';
import { fetchAssets } from '@/lib/adobeStock';
import { computeOverview } from '@/lib/portfolioStats';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

interface TrendsRequest {
  topic?: string;
  maxAssets?: number;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const body = (await request.json()) as TrendsRequest;
    const topic = body.topic?.trim() || 'business';
    const maxAssets = clamp(Number(body.maxAssets) || 400, 100, 2000);
    const deadline = Date.now() + (maxDuration - 8) * 1000;

    const { files, nbResults } = await fetchAssets({
      mode: 'topic',
      query: topic,
      contentFilter: 'all',
      maxAssets,
      deadline,
    });

    if (files.length === 0) {
      return NextResponse.json({ success: false, error: `No assets for "${topic}"` }, { status: 404 });
    }

    // Reuse the portfolio aggregation: topKeywords (hot) + topMovers (by velocity).
    const overview = computeOverview(files, nbResults, 'topic', topic, startTime, Date.now());
    return NextResponse.json({
      success: true,
      meta: overview.meta,
      topKeywords: overview.topKeywords,
      topMovers: overview.topMovers,
    });
  } catch (error) {
    console.error('[trends] error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 },
    );
  }
}
