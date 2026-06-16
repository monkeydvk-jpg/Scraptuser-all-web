import { NextRequest, NextResponse } from 'next/server';
import { fetchAssets, searchCount } from '@/lib/adobeStock';
import { analyze } from '@/lib/keywordInsights';
import type { InsightsRequest } from '@/types';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<InsightsRequest>;
    const mode = body.mode;
    const query = body.query?.trim();

    if (mode !== 'topic' && mode !== 'creator') {
      return NextResponse.json(
        { success: false, error: 'mode must be "topic" or "creator"' },
        { status: 400 },
      );
    }
    if (!query) {
      return NextResponse.json(
        { success: false, error: 'query is required' },
        { status: 400 },
      );
    }

    const maxAssets = clamp(Number(body.maxAssets) || 500, 100, 2000);
    const useGlobalCompetition = body.useGlobalCompetition !== false; // default true
    const contentFilter = body.contentFilter || 'all';

    // Leave headroom under the serverless limit so we can still respond.
    const deadline = Date.now() + (maxDuration - 8) * 1000;

    const result = await analyze(
      { mode, query, contentFilter, maxAssets, useGlobalCompetition, deadline },
      { fetchAssets, searchCount },
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('[keywords/insights] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unexpected error',
      },
      { status: 500 },
    );
  }
}
