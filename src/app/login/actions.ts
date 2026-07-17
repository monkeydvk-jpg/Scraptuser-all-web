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
