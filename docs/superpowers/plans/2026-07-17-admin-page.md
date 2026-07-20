# Admin Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Read-only `/admin` dashboard (user list + per-user tracking counts) gated by the `ADMIN_EMAILS` env var, reachable from the avatar menu for admins only.

**Architecture:** All server-side via the existing `getSupabaseAdmin()` / `getUser()` helpers. A tiny `adminAuth` lib owns the email check; middleware requires login for `/admin`; the page re-checks admin-ness and redirects home otherwise; `/api/auth/me` gains `isAdmin` so `AccountMenu` can show the "Quản trị" link.

**Tech Stack:** Next.js 14 App Router, Supabase Auth Admin API (`listUsers`), existing i18n + UI patterns.

**Spec:** `docs/superpowers/specs/2026-07-17-admin-page-design.md`

## Global Constraints

- Read-only v1: no delete-user, no password reset.
- Admin designation ONLY via `ADMIN_EMAILS` (comma-separated, case-insensitive). Missing/empty var → nobody is admin (fail closed).
- No Supabase key in the browser; all data fetched server-side.
- All user-facing strings in `src/lib/i18n.ts` with vi + en.
- No test harness: verify via `npm run type-check`, `npm run build`, manual checks.

---

### Task 1: adminAuth lib + env plumbing

**Files:**
- Create: `src/lib/adminAuth.ts`
- Modify: `.env.local` (append `ADMIN_EMAILS`)
- Modify: `.env.example` (append documented placeholder)

**Interfaces:**
- Produces: `isAdminEmail(email: string | null | undefined): boolean`; `getAdminUser(): Promise<User | null>`. Consumed by `/api/auth/me` (Task 2) and `/admin` page (Task 3).

- [ ] **Step 1: Create `src/lib/adminAuth.ts`**

```ts
/**
 * Admin designation: an account is admin iff its email is listed in the
 * ADMIN_EMAILS env var (comma-separated, case-insensitive). Missing or empty
 * var means NOBODY is admin — fail closed.
 */
import type { User } from '@supabase/supabase-js';
import { getUser } from '@/lib/supabase/serverAuth';

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.trim().toLowerCase());
}

/** Session user when they are an admin, else null. Never throws. */
export async function getAdminUser(): Promise<User | null> {
  const user = await getUser();
  return user && isAdminEmail(user.email) ? user : null;
}
```

- [ ] **Step 2: Append to `.env.local`**

```
# Comma-separated emails allowed into /admin.
ADMIN_EMAILS="dinhvancntt@gmail.com"
```

- [ ] **Step 3: Append to `.env.example`**

```
# Comma-separated list of emails allowed into the /admin dashboard.
ADMIN_EMAILS="admin@example.com"
```

- [ ] **Step 4: Verify + commit**

Run: `npm run type-check` → exits 0.

```bash
git add src/lib/adminAuth.ts .env.example
git commit -m "feat(admin): ADMIN_EMAILS designation helper"
```

---

### Task 2: isAdmin in /api/auth/me + menu link + i18n

**Files:**
- Modify: `src/app/api/auth/me/route.ts`
- Modify: `src/components/AccountMenu.tsx`
- Modify: `src/lib/i18n.ts` (append keys)

**Interfaces:**
- Consumes: `isAdminEmail` (Task 1).
- Produces: `GET /api/auth/me` → `{ email: string | null, isAdmin: boolean }`; i18n keys `acc_admin`, `adm_*` (used in Task 3).

- [ ] **Step 1: Extend the route**

Replace the body of `src/app/api/auth/me/route.ts` with:

```ts
import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase/serverAuth';
import { isAdminEmail } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

/** Session probe for the client-side header menu. Never exposes more than the email. */
export async function GET() {
  const user = await getUser();
  return NextResponse.json({
    email: user?.email ?? null,
    isAdmin: isAdminEmail(user?.email),
  });
}
```

- [ ] **Step 2: AccountMenu — track isAdmin and add the link**

In `src/components/AccountMenu.tsx`:

Imports: add `Shield` to the lucide import and `Link` is already imported.

```ts
import { LogIn, LogOut, Shield } from 'lucide-react';
```

Add state next to `email`:

```ts
const [isAdmin, setIsAdmin] = useState(false);
```

In the fetch `.then`, after `setEmail(...)`:

```ts
if (alive) setIsAdmin(d.isAdmin === true);
```

In the dropdown, insert between the email line and the sign-out form:

```tsx
{isAdmin && (
  <Link
    href="/admin"
    className="tp-item"
    style={{ textDecoration: 'none', color: 'inherit' }}
    onClick={() => setOpen(false)}
  >
    <Shield style={{ width: 14, height: 14 }} />
    <span className="tp-name">{t('acc_admin')}</span>
  </Link>
)}
```

- [ ] **Step 3: Append i18n keys** (after `acc_signed_in_as`, before `};`)

```ts
  acc_admin: { vi: 'Quản trị', en: 'Admin' },
  adm_title: { vi: 'Quản trị người dùng', en: 'User administration' },
  adm_sub: {
    vi: 'Danh sách tài khoản đã đăng ký và mức độ sử dụng. Chỉ admin (ADMIN_EMAILS) xem được trang này.',
    en: 'Registered accounts and their usage. Only admins (ADMIN_EMAILS) can see this page.',
  },
  adm_total_users: { vi: 'Tổng tài khoản', en: 'Total accounts' },
  adm_total_contribs: { vi: 'Lượt theo dõi contributor', en: 'Contributor follows' },
  adm_total_assets: { vi: 'Lượt theo dõi asset', en: 'Asset follows' },
  adm_col_email: { vi: 'Email', en: 'Email' },
  adm_col_created: { vi: 'Ngày đăng ký', en: 'Signed up' },
  adm_col_last_signin: { vi: 'Đăng nhập cuối', en: 'Last sign-in' },
  adm_col_contribs: { vi: 'Contributors', en: 'Contributors' },
  adm_col_assets: { vi: 'Assets', en: 'Assets' },
  adm_you: { vi: 'bạn', en: 'you' },
  adm_never: { vi: 'chưa từng', en: 'never' },
  adm_error_title: { vi: 'Không tải được danh sách user', en: 'Could not load the user list' },
  adm_note_limit: {
    vi: 'Hiển thị tối đa 50 tài khoản đầu tiên.',
    en: 'Showing at most the first 50 accounts.',
  },
```

- [ ] **Step 4: Verify + commit**

Run: `npm run type-check` → exits 0.

```bash
git add src/app/api/auth/me/route.ts src/components/AccountMenu.tsx src/lib/i18n.ts
git commit -m "feat(admin): isAdmin flag + avatar-menu admin link"
```

---

### Task 3: /admin page + middleware guard

**Files:**
- Create: `src/app/admin/page.tsx`
- Create: `src/app/admin/AdminClient.tsx`
- Modify: `src/middleware.ts` (protect `/admin`)

**Interfaces:**
- Consumes: `getAdminUser` (Task 1), i18n keys (Task 2), `getSupabaseAdmin`.
- Produces: route `/admin`; type `AdminUserRow { id: string; email: string | null; created_at: string; last_sign_in_at: string | null; contributors: number; assets: number }` (defined in `AdminClient.tsx`, imported by the page).

- [ ] **Step 1: Create `src/app/admin/AdminClient.tsx`**

```tsx
'use client';

import { Users, Eye, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import { useT } from '@/lib/useT';

export interface AdminUserRow {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  contributors: number;
  assets: number;
}

interface Props {
  rows: AdminUserRow[];
  selfId: string;
  /** null = ok; otherwise a raw error message. */
  errorMsg: string | null;
}

const fmtDate = (iso: string | null) => (iso ? iso.slice(0, 10) : null);

function StatChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="card" style={{ flex: '1 1 160px', padding: '14px 16px' }}>
      <div className="row" style={{ gap: 10 }}>
        <span className="icon-badge">{icon}</span>
        <div className="stack" style={{ gap: 2 }}>
          <span className="num" style={{ fontSize: 20, fontWeight: 700 }}>{value}</span>
          <span style={{ fontSize: 12, color: 'var(--label-fg)' }}>{label}</span>
        </div>
      </div>
    </div>
  );
}

export function AdminClient({ rows, selfId, errorMsg }: Props) {
  const t = useT();
  const totalContribs = rows.reduce((s, r) => s + r.contributors, 0);
  const totalAssets = rows.reduce((s, r) => s + r.assets, 0);

  return (
    <div className="page-wrap anim-up">
      <div className="page-head">
        <h1>{t('adm_title')}</h1>
        <p>{t('adm_sub')}</p>
      </div>

      {errorMsg && (
        <div className="card anim-up">
          <div className="state-box">
            <div
              className="state-icon"
              style={{ background: 'var(--error-15)', borderColor: 'transparent', color: 'var(--error)' }}
            >
              <AlertTriangle />
            </div>
            <h3>{t('adm_error_title')}</h3>
            <p className="mono" style={{ fontSize: 12, color: 'var(--label-fg)', wordBreak: 'break-word' }}>
              {errorMsg}
            </p>
          </div>
        </div>
      )}

      {!errorMsg && (
        <>
          <div className="row wrap anim-up" style={{ gap: 12, marginBottom: 18 }}>
            <StatChip icon={<Users />} label={t('adm_total_users')} value={rows.length} />
            <StatChip icon={<Eye />} label={t('adm_total_contribs')} value={totalContribs} />
            <StatChip icon={<ImageIcon />} label={t('adm_total_assets')} value={totalAssets} />
          </div>

          <div className="card anim-up" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>{t('adm_col_email')}</th>
                    <th style={{ textAlign: 'right' }}>{t('adm_col_created')}</th>
                    <th style={{ textAlign: 'right' }}>{t('adm_col_last_signin')}</th>
                    <th style={{ textAlign: 'right' }}>{t('adm_col_contribs')}</th>
                    <th style={{ textAlign: 'right' }}>{t('adm_col_assets')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} style={{ cursor: 'default' }}>
                      <td>
                        <span style={{ fontWeight: 600 }}>{r.email ?? r.id}</span>
                        {r.id === selfId && (
                          <span
                            className="num"
                            style={{ marginLeft: 8, fontSize: 11, color: 'var(--label-fg)' }}
                          >
                            ({t('adm_you')})
                          </span>
                        )}
                      </td>
                      <td className="num" style={{ textAlign: 'right' }}>{fmtDate(r.created_at)}</td>
                      <td className="num" style={{ textAlign: 'right' }}>
                        {fmtDate(r.last_sign_in_at) ?? t('adm_never')}
                      </td>
                      <td className="num" style={{ textAlign: 'right' }}>{r.contributors}</td>
                      <td className="num" style={{ textAlign: 'right' }}>{r.assets}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p style={{ marginTop: 10, fontSize: 12, color: 'var(--label-fg)' }}>{t('adm_note_limit')}</p>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/app/admin/page.tsx`**

```tsx
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
```

- [ ] **Step 3: Middleware — require login for `/admin`**

In `src/middleware.ts` change:

```ts
  const isProtected = path.startsWith('/watchlist') || path.startsWith('/assets');
```

to:

```ts
  const isProtected =
    path.startsWith('/watchlist') || path.startsWith('/assets') || path.startsWith('/admin');
```

and the matcher to:

```ts
export const config = {
  matcher: ['/watchlist/:path*', '/assets/:path*', '/admin/:path*', '/login'],
};
```

- [ ] **Step 4: Verify + commit**

Run: `npm run type-check` → exits 0.
Run: `npm run build` → succeeds; `/admin` listed as ƒ (Dynamic).

```bash
git add src/app/admin src/middleware.ts
git commit -m "feat(admin): read-only /admin dashboard"
```

---

### Task 4: Verification + deploy

**Files:** none.

- [ ] **Step 1: Local checks** (`npm run dev`):
- Logged out: `/admin` → redirect `/login?next=/admin`.
- Logged in as non-admin (register a temp account): `/admin` → redirect `/`; avatar menu has NO "Quản trị" item. Delete the temp account afterwards via the Auth admin API.
- `curl /api/auth/me` (logged out) → `{ "email": null, "isAdmin": false }`.
- Admin checks require the admin's own login — verify on production instead.

- [ ] **Step 2: Env on Vercel + deploy**

```bash
printf '%s' "dinhvancntt@gmail.com" | vercel env add ADMIN_EMAILS production
git push origin master
vercel --prod --yes --scope monkeydvk-jpgs-projects
```

- [ ] **Step 3: Production checks**
- `/admin` logged out → 307 to `/login?next=%2Fadmin`.
- `/api/auth/me` → `{"email":null,"isAdmin":false}`.
- Ask the user (the admin) to open `/admin` and confirm the list shows their account with correct counts and the menu shows "Quản trị".
