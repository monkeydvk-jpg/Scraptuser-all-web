import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { redirect } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getUser } from '@/lib/supabase/serverAuth';
import type { WatchlistGrowthRow, PendingContributor } from '@/lib/watchlist';
import { WatchlistClient } from './WatchlistClient';

export const dynamic = 'force-dynamic';

export default async function WatchlistPage() {
  const user = await getUser();
  if (!user) redirect('/login?next=/watchlist');

  let rows: WatchlistGrowthRow[] = [];
  let pending: PendingContributor[] = [];
  let errorMsg: string | null = null;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    errorMsg = 'config';
  } else {
    try {
      const supabase = getSupabaseAdmin();
      const [growthRes, watchRes] = await Promise.all([
        supabase.rpc('get_watchlist_growth', { p_user_id: user.id }),
        supabase
          .from('watchlist')
          .select('contributor_id, contributor_name, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ]);

      if (growthRes.error) throw new Error(growthRes.error.message);
      if (watchRes.error) throw new Error(watchRes.error.message);

      rows = (growthRes.data as WatchlistGrowthRow[] | null) ?? [];
      const tracked = new Set(rows.map((r) => r.contributor_id));
      pending = ((watchRes.data as PendingContributor[] | null) ?? []).filter(
        (w) => !tracked.has(w.contributor_id),
      );
    } catch (err) {
      errorMsg = err instanceof Error ? err.message : String(err);
    }
  }

  return (
    <main className="app">
      <div className="bg-aura" />
      <Header />
      <WatchlistClient rows={rows} pending={pending} errorMsg={errorMsg} />
      <Footer />
    </main>
  );
}
