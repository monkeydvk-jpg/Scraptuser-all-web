import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';
// Without this the Supabase call lands in Next's Data Cache and the process
// keeps replaying its first answer forever — measured: direct RPC 217/33/1
// while this route still served 216/32/0. The 60s `s-maxage` below is the
// intended cache window; that one expires, the Data Cache one does not.
export const fetchCache = 'force-no-store';

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
