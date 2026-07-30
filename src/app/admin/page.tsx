import { redirect } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getAdminUser } from '@/lib/adminAuth';
import { AdminClient, type AdminUserRow, type AccessEventRow, type AccessDailyRow } from './AdminClient';

export const dynamic = 'force-dynamic';

/**
 * How many unknown user_ids from the log window we resolve to emails per page
 * load. GoTrue's admin endpoints are rate-limited much harder than table reads,
 * and this page is force-dynamic, so an uncapped fan-out re-fires on every
 * refresh. Ids beyond the cap render as a short id fragment — visibly distinct
 * from an anonymous visitor, so the cap degrades honestly rather than silently.
 */
const MAX_USER_LOOKUPS = 20;

export default async function AdminPage() {
  const admin = await getAdminUser();
  if (!admin) redirect('/');

  let rows: AdminUserRow[] = [];
  let logRows: AccessEventRow[] = [];
  let dailyRows: AccessDailyRow[] = [];
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

    // events30d defaults to 0 here; the access-log block below fills it in
    // when it succeeds. Core account data (email/signup/contributors/assets)
    // must render even when the access-log tables are unavailable, so this
    // base row-set does not depend on any of the queries in that block.
    rows = usersRes.data.users.map((u) => ({
      id: u.id,
      email: u.email ?? null,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      contributors: wlCounts.get(u.id) ?? 0,
      assets: awCounts.get(u.id) ?? 0,
      events30d: 0,
    }));

    // Access-log reads are wrapped separately: a failure here (missing
    // migration, RLS, transient error) must not blank the user table above.
    // On failure rows/logRows/dailyRows keep their safe defaults set above
    // (events30d: 0, empty arrays) instead of a stale or wrong number.
    try {
      const [logRes, dailyRes, evUserRes] = await Promise.all([
        supabase
          .from('access_events')
          .select('id, created_at, user_id, event_type, path, country')
          .order('id', { ascending: false })
          .limit(100),
        supabase.from('access_daily').select('day, pageviews, visitors').order('day', { ascending: false }).limit(30),
        // Grouped server-side: selecting every user_id into the app would be
        // silently truncated by PostgREST's row cap and, with no ORDER BY,
        // truncated arbitrarily — making the admin column meaningless.
        supabase.rpc('access_user_event_counts'),
      ]);

      if (logRes.error) throw new Error(logRes.error.message);
      if (dailyRes.error) throw new Error(dailyRes.error.message);
      if (evUserRes.error) throw new Error(evUserRes.error.message);

      const evCounts = new Map<string, number>();
      (evUserRes.data ?? []).forEach((r: { user_id: string; n: number | string }) =>
        evCounts.set(r.user_id, Number(r.n)),
      );
      // Detail rows only survive 30 days, so this count is inherently a 30-day window.
      rows = rows.map((r) => ({ ...r, events30d: evCounts.get(r.id) ?? 0 }));

      const emailById = new Map(rows.map((r) => [r.id, r.email]));
      // rows above only covers the first 50 users (listUsers perPage), but the
      // log can reference any user_id. Without this, a real user outside that
      // page silently renders as "Guest" instead of their email.
      const logUserIds = Array.from(
        new Set(
          (logRes.data ?? [])
            .map((e) => e.user_id as string | null)
            .filter((id): id is string => !!id),
        ),
      );
      const missingIds = logUserIds.filter((id) => !emailById.has(id)).slice(0, MAX_USER_LOOKUPS);
      if (missingIds.length > 0) {
        const lookups = await Promise.all(
          missingIds.map(async (id) => {
            try {
              const { data } = await supabase.auth.admin.getUserById(id);
              return [id, data.user?.email ?? null] as const;
            } catch {
              return [id, null] as const;
            }
          }),
        );
        for (const [id, email] of lookups) emailById.set(id, email);
      }
      logRows = (logRes.data ?? []).map((e) => {
        const uid = (e.user_id as string | null) ?? null;
        const email = uid ? emailById.get(uid) ?? null : null;
        return {
          id: e.id as number,
          created_at: e.created_at as string,
          email,
          userIdShort: !email && uid ? uid.slice(0, 8) : null,
          event_type: e.event_type as string,
          path: (e.path as string | null) ?? null,
          country: (e.country as string | null) ?? null,
        };
      });

      dailyRows = (dailyRes.data ?? []) as AccessDailyRow[];
    } catch (logErr) {
      console.error(
        '[admin] access-log section failed, rendering user table without activity data:',
        logErr instanceof Error ? logErr.message : logErr,
      );
    }
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
