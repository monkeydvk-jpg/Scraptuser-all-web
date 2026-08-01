import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { PROOF_BUCKET, PROOF_LIMIT, type ProofEntry } from '@/lib/proof';

export const dynamic = 'force-dynamic';
// `force-dynamic` alone is not enough: it stops the ROUTE from being
// prerendered, but supabase-js issues a plain GET through the patched global
// fetch, and Next still puts that response in the Data Cache. A running server
// then answers from a snapshot taken at its first request and never sees a
// newly published entry. Verified against 14.2.5: without this line, a row
// inserted after the first hit stays invisible until the process restarts.
export const fetchCache = 'force-no-store';

/**
 * The proof strip on the landing page. Always 200 with an array: an empty list
 * tells the marquee to render nothing, which is the right failure mode for a
 * decorative section — a broken landing page is far worse than a missing strip.
 *
 * Read through the service role because `proof_entries` has RLS on with no
 * policies (see 20260731_proof_entries.sql). Nothing here is sensitive; the
 * whole point of the table is to be published.
 *
 * Cached at the edge for 5 minutes. The admin publishes a handful of rows a
 * week, so freshness costs nothing and the origin stays idle under traffic.
 */
export async function GET() {
  const headers = {
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900',
  };

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('proof_entries')
      .select('id, day, rank, image_path')
      .order('day', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(PROOF_LIMIT);

    if (error) {
      console.error('[proof] select failed:', error.message);
      return NextResponse.json([], { headers });
    }

    const rows = (data ?? []) as {
      id: number;
      day: string;
      rank: number;
      image_path: string;
    }[];

    const entries: ProofEntry[] = rows.map((row) => ({
      id: row.id,
      day: row.day,
      rank: row.rank,
      image_url: supabase.storage.from(PROOF_BUCKET).getPublicUrl(row.image_path).data.publicUrl,
    }));

    return NextResponse.json(entries, { headers });
  } catch (err) {
    console.error('[proof] threw:', err instanceof Error ? err.message : err);
    return NextResponse.json([], { headers });
  }
}
