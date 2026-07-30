import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

interface VisitorStats {
  total: number | null;
  today: number | null;
  online: number | null;
}

const EMPTY: VisitorStats = { total: null, today: null, online: null };

/**
 * The three public footer numbers. Always 200: nulls tell the footer to render
 * nothing, which is the right failure mode for a decorative counter.
 *
 * Cached at the edge for 60s so the counts run at most once a minute per
 * region no matter how much traffic arrives.
 */
export async function GET() {
  const headers = {
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
  };

  try {
    const { data, error } = await getSupabaseAdmin().rpc('access_stats');
    if (error) {
      console.error('[stats] rpc failed:', error.message);
      return NextResponse.json(EMPTY, { headers });
    }

    const row = data as { total?: number; today?: number; online?: number } | null;
    return NextResponse.json(
      {
        total: row?.total ?? null,
        today: row?.today ?? null,
        online: row?.online ?? null,
      } satisfies VisitorStats,
      { headers },
    );
  } catch (err) {
    console.error('[stats] threw:', err instanceof Error ? err.message : err);
    return NextResponse.json(EMPTY, { headers });
  }
}
