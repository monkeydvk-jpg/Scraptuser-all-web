import { redirect } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getAdminUser } from '@/lib/adminAuth';
import { AdminClient, type AdminUserRow } from './AdminClient';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const admin = await getAdminUser();
  if (!admin) redirect('/');

  let rows: AdminUserRow[] = [];
  let errorMsg: string | null = null;

  try {
    const supabase = getSupabaseAdmin();
    const [usersRes, wlRes, awRes] = await Promise.all([
      supabase.auth.admin.listUsers({ page: 1, perPage: 50 }),
      supabase.from('watchlist').select('user_id'),
      supabase.from('asset_watchlist').select('user_id'),
    ]);

    if (usersRes.error) throw new Error(usersRes.error.message);
    if (wlRes.error) throw new Error(wlRes.error.message);
    if (awRes.error) throw new Error(awRes.error.message);

    const countBy = (list: { user_id: string }[] | null) => {
      const m = new Map<string, number>();
      (list ?? []).forEach((r) => m.set(r.user_id, (m.get(r.user_id) ?? 0) + 1));
      return m;
    };
    const wlCounts = countBy(wlRes.data as { user_id: string }[] | null);
    const awCounts = countBy(awRes.data as { user_id: string }[] | null);

    rows = usersRes.data.users.map((u) => ({
      id: u.id,
      email: u.email ?? null,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      contributors: wlCounts.get(u.id) ?? 0,
      assets: awCounts.get(u.id) ?? 0,
    }));
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : String(err);
  }

  return (
    <main className="app">
      <div className="bg-aura" />
      <Header />
      <AdminClient rows={rows} selfId={admin.id} errorMsg={errorMsg} />
      <Footer />
    </main>
  );
}
