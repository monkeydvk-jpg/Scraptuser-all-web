# Account Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Email + password accounts (open signup, no email confirmation) with per-user Watchlist and Assets data; other tabs stay public.

**Architecture:** Supabase Auth via `@supabase/ssr` cookie sessions, instantiated **server-side only with the existing service-role key** — no anon key ever reaches the browser. Middleware guards `/watchlist` + `/assets`; server components/actions resolve `user.id` and use it instead of `DOGFOOD_USER_ID`; a hardening migration enables RLS (no policies) on all data tables. The header account menu learns the session from a tiny `/api/auth/me` route.

**Tech Stack:** Next.js 14 App Router (middleware, server actions, `useFormState`), `@supabase/ssr`, existing `getSupabaseAdmin()`, lucide-react, existing i18n.

**Spec:** `docs/superpowers/specs/2026-07-17-auth-accounts-design.md`

## Global Constraints

- No `NEXT_PUBLIC_SUPABASE_ANON_KEY` and no browser Supabase client — all Supabase access is server-side (security decision; tables have no RLS policies).
- No new env vars; reuse `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.
- Auth server actions must NOT throw for expected failures (wrong password, duplicate email, weak password) — return `{ error: <i18n key> }` rendered inline (thrown errors produce the generic "Application error … Digest" page in production).
- All user-facing strings through `src/lib/i18n.ts` with vi + en.
- No test harness; verify with `npm run type-check`, `npm run build`, then manual (Task 7/8).
- Out of scope: password reset/change, OAuth, admin user management.

---

### Task 1: Dependency + server auth helper

**Files:**
- Modify: `package.json` (via `npm install @supabase/ssr`)
- Create: `src/lib/supabase/serverAuth.ts`

**Interfaces:**
- Produces: `createAuthClient(): SupabaseClient` (cookie-bound, service key) and `getUser(): Promise<User | null>` (never throws). Consumed by login actions, `/api/auth/me`, watchlist/assets pages + actions.

- [ ] **Step 1: Install the dependency**

Run: `npm install @supabase/ssr`
Expected: exits 0, `@supabase/ssr` appears in `package.json` dependencies.

- [ ] **Step 2: Create `src/lib/supabase/serverAuth.ts`**

```ts
/**
 * Cookie-session Supabase client for SERVER code only (server components,
 * server actions, route handlers). Uses the SERVICE ROLE key on purpose:
 * this app never ships an anon key to the browser (tables have no RLS
 * policies), so the key must stay server-side — same rule as supabaseAdmin.
 */
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient, User } from '@supabase/supabase-js';

export function createAuthClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      'Supabase chưa cấu hình: thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY.',
    );
  }

  const cookieStore = cookies();
  return createServerClient(url, serviceKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components may not write cookies; middleware refreshes the
          // session, so swallowing the write is safe here.
        }
      },
    },
  });
}

/** Current session user, or null when logged out / env missing. Never throws. */
export async function getUser(): Promise<User | null> {
  try {
    const { data } = await createAuthClient().auth.getUser();
    return data.user;
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: Verify types**

Run: `npm run type-check`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/lib/supabase/serverAuth.ts
git commit -m "feat(auth): @supabase/ssr server client helper"
```

---

### Task 2: i18n strings for auth

**Files:**
- Modify: `src/lib/i18n.ts` (append before the closing `};` of `STR`)

**Interfaces:**
- Produces: keys used by Tasks 3–5: `login_title`, `login_sub`, `login_tab_signin`, `login_tab_signup`, `login_email_ph`, `login_password_ph`, `login_btn_signin`, `login_btn_signup`, `login_err_invalid`, `login_err_exists`, `login_err_weak_password`, `login_err_generic`, `acc_signin`, `acc_signout`, `acc_signed_in_as`.

- [ ] **Step 1: Append the keys**

Immediately after the `as_error_generic` entry (before the closing `};`), add:

```ts
  // ── Auth / accounts ──
  login_title: { vi: 'Tài khoản', en: 'Account' },
  login_sub: {
    vi: 'Đăng nhập để có Watchlist và danh sách Asset của riêng bạn.',
    en: 'Sign in to get your own Watchlist and tracked Assets.',
  },
  login_tab_signin: { vi: 'Đăng nhập', en: 'Sign in' },
  login_tab_signup: { vi: 'Đăng ký', en: 'Sign up' },
  login_email_ph: { vi: 'Email', en: 'Email' },
  login_password_ph: { vi: 'Mật khẩu (≥ 6 ký tự)', en: 'Password (≥ 6 characters)' },
  login_btn_signin: { vi: 'Đăng nhập', en: 'Sign in' },
  login_btn_signup: { vi: 'Tạo tài khoản', en: 'Create account' },
  login_err_invalid: { vi: 'Email hoặc mật khẩu không đúng.', en: 'Wrong email or password.' },
  login_err_exists: { vi: 'Email này đã có tài khoản — hãy đăng nhập.', en: 'This email already has an account — sign in instead.' },
  login_err_weak_password: { vi: 'Mật khẩu phải có ít nhất 6 ký tự.', en: 'Password must be at least 6 characters.' },
  login_err_generic: { vi: 'Có lỗi xảy ra, thử lại sau.', en: 'Something went wrong, try again.' },
  acc_signin: { vi: 'Đăng nhập', en: 'Sign in' },
  acc_signout: { vi: 'Đăng xuất', en: 'Sign out' },
  acc_signed_in_as: { vi: 'Đang đăng nhập', en: 'Signed in as' },
```

- [ ] **Step 2: Verify + commit**

Run: `npm run type-check` → exits 0.

```bash
git add src/lib/i18n.ts
git commit -m "feat(auth): vi/en strings for login + account menu"
```

---

### Task 3: Login page (actions + UI)

**Files:**
- Create: `src/app/login/actions.ts`
- Create: `src/app/login/page.tsx`
- Create: `src/app/login/LoginClient.tsx`

**Interfaces:**
- Consumes: `createAuthClient` (Task 1), `getSupabaseAdmin` from `src/lib/supabaseAdmin`, i18n keys (Task 2).
- Produces: server actions `signIn(prev: AuthFormState, formData: FormData): Promise<AuthFormState>`, `signUp(...)` same signature, `signOut(): Promise<void>`; type `AuthFormState = { error: string | null }`. `signOut` is also used by Task 4's AccountMenu. Form fields: `email`, `password`, `next` (hidden).

- [ ] **Step 1: Create `src/app/login/actions.ts`**

```ts
'use server';

import { redirect } from 'next/navigation';
import { createAuthClient } from '@/lib/supabase/serverAuth';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

/** Inline form errors carry an i18n KEY, rendered by LoginClient via t(). */
export interface AuthFormState {
  error: string | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Only allow same-site relative redirect targets. */
function safeNext(raw: unknown): string {
  const next = String(raw ?? '');
  return next.startsWith('/') && !next.startsWith('//') ? next : '/watchlist';
}

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  if (!EMAIL_RE.test(email) || !password) return { error: 'login_err_invalid' };

  const supabase = createAuthClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: 'login_err_invalid' };

  redirect(safeNext(formData.get('next')));
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  if (!EMAIL_RE.test(email)) return { error: 'login_err_invalid' };
  if (password.length < 6) return { error: 'login_err_weak_password' };

  // Admin create with email_confirm so no SMTP / confirmation flow is needed.
  const { error: createErr } = await getSupabaseAdmin().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr) {
    const msg = createErr.message.toLowerCase();
    return { error: msg.includes('already') ? 'login_err_exists' : 'login_err_generic' };
  }

  const supabase = createAuthClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: 'login_err_generic' };

  redirect(safeNext(formData.get('next')));
}

export async function signOut(): Promise<void> {
  const supabase = createAuthClient();
  await supabase.auth.signOut();
  redirect('/');
}
```

- [ ] **Step 2: Create `src/app/login/page.tsx`**

```tsx
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { LoginClient } from './LoginClient';

export const dynamic = 'force-dynamic';

export default function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  return (
    <main className="app">
      <div className="bg-aura" />
      <Header />
      <LoginClient next={searchParams.next ?? ''} />
      <Footer />
    </main>
  );
}
```

- [ ] **Step 3: Create `src/app/login/LoginClient.tsx`**

```tsx
'use client';

import { useState, type ReactNode } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { LogIn, UserPlus } from 'lucide-react';
import { useT } from '@/lib/useT';
import { signIn, signUp, type AuthFormState } from './actions';

const INITIAL: AuthFormState = { error: null };

function SubmitButton({ label, icon }: { label: string; icon: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn btn-primary"
      disabled={pending}
      style={{ width: '100%', justifyContent: 'center' }}
    >
      {icon} {pending ? '…' : label}
    </button>
  );
}

export function LoginClient({ next }: { next: string }) {
  const t = useT();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [signInState, signInAction] = useFormState(signIn, INITIAL);
  const [signUpState, signUpAction] = useFormState(signUp, INITIAL);
  const state = mode === 'signin' ? signInState : signUpState;

  return (
    <div className="page-wrap anim-up" style={{ maxWidth: 460 }}>
      <div className="page-head">
        <h1>{t('login_title')}</h1>
        <p>{t('login_sub')}</p>
      </div>

      <div className="card anim-up">
        <div className="segmented" style={{ marginBottom: 14 }}>
          <button
            type="button"
            className={'seg' + (mode === 'signin' ? ' on' : '')}
            onClick={() => setMode('signin')}
            aria-pressed={mode === 'signin'}
          >
            {t('login_tab_signin')}
          </button>
          <button
            type="button"
            className={'seg' + (mode === 'signup' ? ' on' : '')}
            onClick={() => setMode('signup')}
            aria-pressed={mode === 'signup'}
          >
            {t('login_tab_signup')}
          </button>
        </div>

        <form action={mode === 'signin' ? signInAction : signUpAction} className="stack" style={{ gap: 10 }}>
          <input type="hidden" name="next" value={next} />
          <input
            className="input"
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder={t('login_email_ph')}
            aria-label={t('login_email_ph')}
          />
          <input
            className="input"
            type="password"
            name="password"
            required
            minLength={6}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            placeholder={t('login_password_ph')}
            aria-label={t('login_password_ph')}
          />
          {state.error && (
            <p role="alert" style={{ margin: 0, color: 'var(--error)', fontSize: 13 }}>
              {t(state.error)}
            </p>
          )}
          <SubmitButton
            label={mode === 'signin' ? t('login_btn_signin') : t('login_btn_signup')}
            icon={mode === 'signin' ? <LogIn /> : <UserPlus />}
          />
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify + commit**

Run: `npm run type-check` → exits 0.

```bash
git add src/app/login
git commit -m "feat(auth): /login page with signin/signup server actions"
```

---

### Task 4: Session endpoint + header account menu

**Files:**
- Create: `src/app/api/auth/me/route.ts`
- Create: `src/components/AccountMenu.tsx`
- Modify: `src/components/Header.tsx` (replace the hardcoded "SA" avatar)

**Interfaces:**
- Consumes: `getUser` (Task 1), `signOut` (Task 3), i18n keys (Task 2).
- Produces: `GET /api/auth/me` → `{ email: string | null }`; `<AccountMenu />` component.

- [ ] **Step 1: Create `src/app/api/auth/me/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase/serverAuth';

export const dynamic = 'force-dynamic';

/** Session probe for the client-side header menu. Never exposes more than the email. */
export async function GET() {
  const user = await getUser();
  return NextResponse.json({ email: user?.email ?? null });
}
```

- [ ] **Step 2: Create `src/components/AccountMenu.tsx`**

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { LogIn, LogOut } from 'lucide-react';
import { useT } from '@/lib/useT';
import { signOut } from '@/app/login/actions';

/**
 * Header account widget. Reads the session via /api/auth/me so no Supabase
 * key is needed in the browser; reuses the ThemePicker dropdown styling.
 */
export function AccountMenu() {
  const t = useT();
  const [email, setEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (alive) setEmail(typeof d.email === 'string' ? d.email : null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  if (!email) {
    return (
      <Link href="/login" className="btn btn-ghost" style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>
        <LogIn style={{ width: 15, height: 15 }} /> {t('acc_signin')}
      </Link>
    );
  }

  return (
    <div className="tp" ref={ref}>
      <button
        className="avatar"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        title={email}
        style={{ border: 'none', cursor: 'pointer' }}
      >
        {email[0].toUpperCase()}
      </button>
      {open && (
        <div className="tp-menu" role="menu" style={{ minWidth: 220 }}>
          <div className="tp-title">{t('acc_signed_in_as')}</div>
          <div style={{ padding: '4px 10px 8px', fontSize: 12.5, wordBreak: 'break-all' }}>{email}</div>
          <form action={signOut}>
            <button
              type="submit"
              className="tp-item"
              style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer' }}
            >
              <LogOut style={{ width: 14, height: 14 }} />
              <span className="tp-name">{t('acc_signout')}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Wire into `src/components/Header.tsx`**

Add the import:

```ts
import { AccountMenu } from '@/components/AccountMenu';
```

Replace:

```tsx
            <div className="avatar" title="Studio Aurora" aria-label="Account">
              SA
            </div>
```

with:

```tsx
            <AccountMenu />
```

- [ ] **Step 4: Verify + commit**

Run: `npm run type-check` → exits 0.

```bash
git add src/app/api/auth/me/route.ts src/components/AccountMenu.tsx src/components/Header.tsx
git commit -m "feat(auth): header account menu backed by /api/auth/me"
```

---

### Task 5: Per-user watchlist + assets

**Files:**
- Modify: `src/app/watchlist/page.tsx`
- Modify: `src/app/watchlist/actions.ts`
- Modify: `src/app/assets/page.tsx`
- Modify: `src/app/assets/actions.ts`

**Interfaces:**
- Consumes: `getUser` (Task 1). `DOGFOOD_USER_ID` usage is removed from runtime code (constant stays in `src/lib/watchlist.ts` as a migration reference).

- [ ] **Step 1: `src/app/watchlist/page.tsx` — resolve the user**

Replace the import of `DOGFOOD_USER_ID`:

```ts
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/supabase/serverAuth';
```

(keep the `WatchlistGrowthRow, PendingContributor` type import). At the top of the component body, before the env check:

```ts
  const user = await getUser();
  if (!user) redirect('/login?next=/watchlist');
```

and replace both usages of `DOGFOOD_USER_ID` with `user.id` (`p_user_id: user.id` and `.eq('user_id', user.id)`).

- [ ] **Step 2: `src/app/watchlist/actions.ts` — scope to the user**

Replace the `DOGFOOD_USER_ID` import with `import { getUser } from '@/lib/supabase/serverAuth';`. In `addContributor`, after the empty-id guard:

```ts
  const user = await getUser();
  if (!user) throw new Error('Chưa đăng nhập');
```

and use `user_id: user.id` in the upsert. In `removeContributor`, same guard, and `.eq('user_id', user.id)`.

- [ ] **Step 3: `src/app/assets/page.tsx` + `src/app/assets/actions.ts`**

Same transformation: page redirects to `/login?next=/assets` when no user and uses `user.id` for `p_user_id` and the pending select; both actions resolve `getUser()`, throw `'Chưa đăng nhập'` when null, and use `user.id`.

- [ ] **Step 4: Verify + commit**

Run: `npm run type-check` → exits 0.

```bash
git add src/app/watchlist src/app/assets
git commit -m "feat(auth): watchlist + assets scoped to the signed-in user"
```

---

### Task 6: Middleware guard + RLS migration

**Files:**
- Create: `src/middleware.ts`
- Create: `supabase/migrations/20260717_auth_rls.sql`

**Interfaces:**
- Produces: route protection for `/watchlist`, `/assets`; `/login` redirects away when already signed in.

- [ ] **Step 1: Create `src/middleware.ts`**

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Refreshes the Supabase session cookie and guards the per-user pages.
 * Uses the service-role key (server-side only) — this app ships no anon key.
 */
export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // Without Supabase config the pages render their own config-error card.
  if (!url || !serviceKey) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, serviceKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = path.startsWith('/watchlist') || path.startsWith('/assets');

  if (!user && isProtected) {
    const to = request.nextUrl.clone();
    to.pathname = '/login';
    to.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(to);
  }
  if (user && path === '/login') {
    const to = request.nextUrl.clone();
    to.pathname = '/watchlist';
    to.search = '';
    return NextResponse.redirect(to);
  }
  return response;
}

export const config = {
  matcher: ['/watchlist/:path*', '/assets/:path*', '/login'],
};
```

- [ ] **Step 2: Create `supabase/migrations/20260717_auth_rls.sql`**

```sql
-- Harden the data tables now that auth exists: enable RLS with NO policies.
-- Only the service role (which bypasses RLS) may access these tables; the
-- app never ships an anon key, and if one ever leaks it can read nothing.
alter table public.watchlist               enable row level security;
alter table public.contributor_daily_stats enable row level security;
alter table public.asset_watchlist         enable row level security;
alter table public.asset_daily_stats       enable row level security;

-- One-time data hand-over: after the owner registers, move the dogfood rows
-- to the real account (find the uuid in Supabase Auth → Users, then run):
-- update public.watchlist       set user_id = '<real-user-uuid>' where user_id = '00000000-0000-0000-0000-000000000001';
-- update public.asset_watchlist set user_id = '<real-user-uuid>' where user_id = '00000000-0000-0000-0000-000000000001';
```

- [ ] **Step 3: Verify + commit**

Run: `npm run type-check` → exits 0.
Run: `npm run build` → succeeds; route list shows `ƒ Middleware`.

```bash
git add src/middleware.ts supabase/migrations/20260717_auth_rls.sql
git commit -m "feat(auth): middleware route guard + RLS hardening migration"
```

---

### Task 7: Local verification

**Files:** none.

- [ ] **Step 1: Apply `supabase/migrations/20260717_auth_rls.sql`** in the Supabase SQL editor (or flag to the user).

- [ ] **Step 2: Exercise locally** (`npm run dev`):
- `/watchlist` and `/assets` while logged out → redirected to `/login?next=…`.
- Register a new account (email + password ≥ 6 chars) → lands on `/watchlist`, header shows the avatar with the email initial.
- Wrong password on sign-in → inline red error, NOT a crash page.
- Duplicate registration → inline "đã có tài khoản" error.
- Add an asset → appears; it belongs to this user (check `asset_watchlist.user_id`).
- Logout via avatar menu → back to `/`, header shows "Đăng nhập"; `/assets` redirects to login again.
- Trigger the cron manually (bearer `CRON_SECRET`) → still snapshots all watched ids.

- [ ] **Step 3: Reassign dogfood data** — run the two `update … set user_id` statements from the migration comment with the owner's real uuid, verify the old cat asset shows under the owner's account.

---

### Task 8: Deploy + production verification

**Files:** none.

- [ ] **Step 1: Push** `git push origin master` (Vercel auto-builds; env vars already set, none added).
- [ ] **Step 2: Verify production**: `/assets` logged out → redirect to `/login`; register the owner account; confirm data appears after the Task 7 reassignment; header menu works; other tabs load without login.
