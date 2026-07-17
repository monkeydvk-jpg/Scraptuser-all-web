import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { redirect } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getUser } from '@/lib/supabase/serverAuth';
import type { AssetGrowthRow, PendingAsset } from '@/lib/assetWatchlist';
import { AssetsClient } from './AssetsClient';

export const dynamic = 'force-dynamic';

export default async function AssetsPage() {
  const user = await getUser();
  if (!user) redirect('/login?next=/assets');

  let rows: AssetGrowthRow[] = [];
  let pending: PendingAsset[] = [];
  let errorMsg: string | null = null;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    errorMsg = 'config';
  } else {
    try {
      const supabase = getSupabaseAdmin();
      const [growthRes, watchRes] = await Promise.all([
        supabase.rpc('get_asset_watchlist_growth', { p_user_id: user.id }),
        supabase
          .from('asset_watchlist')
          .select('asset_id, asset_title, memo_name, thumbnail_url, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ]);

      if (growthRes.error) throw new Error(growthRes.error.message);
      if (watchRes.error) throw new Error(watchRes.error.message);

      rows = (growthRes.data as AssetGrowthRow[] | null) ?? [];
      const tracked = new Set(rows.map((r) => r.asset_id));
      pending = ((watchRes.data as PendingAsset[] | null) ?? []).filter(
        (w) => !tracked.has(w.asset_id),
      );
    } catch (err) {
      errorMsg = err instanceof Error ? err.message : String(err);
    }
  }

  return (
    <main className="app">
      <div className="bg-aura" />
      <Header />
      <AssetsClient rows={rows} pending={pending} errorMsg={errorMsg} />
      <Footer />
    </main>
  );
}
