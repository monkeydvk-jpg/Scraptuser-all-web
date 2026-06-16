import { NextRequest, NextResponse } from 'next/server';
import { fetchAssets, type SearchMode } from '@/lib/adobeStock';
import { computeOverview } from '@/lib/portfolioStats';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

interface OverviewRequest {
  query?: string;
  type?: 'creator' | 'keyword';
  contentFilter?: string;
  maxAssets?: number;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const body = (await request.json()) as OverviewRequest;
    const query = body.query?.trim();
    const type = body.type === 'keyword' ? 'keyword' : 'creator';

    if (!query) {
      return NextResponse.json({ success: false, error: 'query is required' }, { status: 400 });
    }

    // analytics "keyword" → adobeStock "topic" (words search)
    const mode: SearchMode = type === 'keyword' ? 'topic' : 'creator';
    const maxAssets = clamp(Number(body.maxAssets) || 2000, 100, 2000);
    const contentFilter = body.contentFilter || 'all';
    const deadline = Date.now() + (maxDuration - 8) * 1000;

    const { files, nbResults } = await fetchAssets({ mode, query, contentFilter, maxAssets, deadline });

    if (files.length === 0) {
      return NextResponse.json(
        { success: false, error: `No assets found for "${query}"` },
        { status: 404 },
      );
    }

    const overview = computeOverview(files, nbResults, mode, query, startTime, Date.now());
    return NextResponse.json(overview);
  } catch (error) {
    console.error('[analytics/overview] error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 },
    );
  }
}
