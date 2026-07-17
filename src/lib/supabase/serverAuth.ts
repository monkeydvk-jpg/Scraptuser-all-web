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
