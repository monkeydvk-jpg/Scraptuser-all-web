import { redirect } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getAdminUser } from '@/lib/adminAuth';
import { AdminClient, type AdminUserRow, type AccessEventRow, type AccessDailyRow } from './AdminClient';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const admin = await getAdminUser();
  if (!admin) redirect('/');

  let rows: AdminUserRow[] = [];
  let logRows: AccessEventRow[] = [];
  let dailyRows: AccessDailyRow[] = [];
  let errorMsg: string | null = null;

  try {
    const supabase = getSupabaseAdmin();
    const [usersRes, wlRes, awRes, logRes, dailyRes, evUserRes] = await Promise.all([
      supabase.auth.admin.listUsers({ page: 1, perPage: 50 }),
      supabase.from('watchlist').select('user_id'),
      supabase.from('asset_watchlist').select('user_id'),
      supabase
        .from('access_events')
        .select('id, created_at, user_id, event_type, path, country')
        .order('id', { ascending: false })
        .limit(100),
      supabase.from('access_daily').select('day, pageviews, visitors').order('day', { ascending: false }).limit(30),
      // Only non-null user ids: counted in JS, matching how wl/aw counts work.
      supabase.from('access_events').select('user_id').not('user_id', 'is', null),
    ]);

    if (usersRes.error) throw new Error(usersRes.error.message);
    if (wlRes.error) throw new Error(wlRes.error.message);
    if (awRes.error) throw new Error(awRes.error.message);
    if (logRes.error) throw new Error(logRes.error.message);
    if (dailyRes.error) throw new Error(dailyRes.error.message);
    if (evUserRes.error) throw new Error(evUserRes.error.message);

    const countBy = (list: { user_id: string }[] | null) => {
      const m = new Map<string, number>();
      (list ?? []).forEach((r) => m.set(r.user_id, (m.get(r.user_id) ?? 0) + 1));
      return m;
    };
    const wlCounts = countBy(wlRes.data as { user_id: string }[] | null);
    const awCounts = countBy(awRes.data as { user_id: string }[] | null);
    const evCounts = countBy(evUserRes.data as { user_id: string }[] | null);

    rows = usersRes.data.users.map((u) => ({
      id: u.id,
      email: u.email ?? null,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      contributors: wlCounts.get(u.id) ?? 0,
      assets: awCounts.get(u.id) ?? 0,
      // Detail rows only survive 30 days, so this count is inherently a 30-day window.
      events30d: evCounts.get(u.id) ?? 0,
    }));

    const emailById = new Map(rows.map((r) => [r.id, r.email]));
    logRows = (logRes.data ?? []).map((e) => ({
      id: e.id as number,
      created_at: e.created_at as string,
      email: e.user_id ? emailById.get(e.user_id as string) ?? null : null,
      event_type: e.event_type as string,
      path: (e.path as string | null) ?? null,
      country: (e.country as string | null) ?? null,
    }));

    dailyRows = (dailyRes.data ?? []) as AccessDailyRow[];
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : String(err);
  }

  return (
    <main className="app">
      <div className="bg-aura" />
      <Header />
      <AdminClient
        rows={rows}
        logRows={logRows}
        dailyRows={dailyRows}
        selfId={admin.id}
        errorMsg={errorMsg}
      />
      <Footer />
    </main>
  );
}
