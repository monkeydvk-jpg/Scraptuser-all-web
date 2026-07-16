/**
 * Server-only Supabase client using the SERVICE ROLE key.
 *
 * Lazily instantiated via `getSupabaseAdmin()` so that `next build` never
 * requires the env vars to be present (routes/pages that import this are
 * `force-dynamic` and only touch it at request time).
 *
 * ⚠️ NEVER import this into a client component — the service role key bypasses
 * Row-Level Security. It is only safe on the server (cron route, server actions).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Supabase chưa cấu hình: thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY.',
    );
  }

  client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
