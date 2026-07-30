/**
 * Access-log writer. SERVER ONLY — imports the service-role Supabase client.
 *
 * Every function here is failure-tolerant on purpose: analytics must never be
 * able to break a page render, a form submission, or an API response. On any
 * problem we log to the server console and move on.
 */
import { cookies, headers } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getUser } from '@/lib/supabase/serverAuth';

export type AccessEventType =
  | 'pageview'
  | 'login'
  | 'signup'
  | 'logout'
  | 'scrape'
  | 'keywords'
  | 'watchlist_add'
  | 'watchlist_remove'
  | 'asset_add'
  | 'asset_remove';

export interface AccessEventInput {
  eventType: AccessEventType;
  /** Pathname only, no query string. */
  path?: string | null;
  referrer?: string | null;
  /** Omit to resolve from the session; pass `null` to force anonymous. */
  userId?: string | null;
  visitorId?: string | null;
  meta?: Record<string, unknown> | null;
}

export const VISITOR_COOKIE = 'sl_vid';

/** One year. Long enough that "total visits" means something. */
const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Postgres text columns are unbounded; these caps stop abusive payloads. */
const MAX_PATH = 512;
const MAX_REFERRER = 1024;
const MAX_UA = 512;

const BOT_RE = /bot|crawl|spider|slurp|headless|preview|monitor|curl|wget|python-requests/i;

export function isBot(ua: string | null | undefined): boolean {
  if (!ua) return true; // No user-agent at all is not a real browser.
  return BOT_RE.test(ua);
}

export function visitorCookieOptions() {
  return {
    httpOnly: true as const,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: VISITOR_COOKIE_MAX_AGE,
    path: '/' as const,
  };
}

/** The visitor's id if they already have the cookie, else null. Never throws. */
export function readVisitorId(): string | null {
  try {
    return cookies().get(VISITOR_COOKIE)?.value ?? null;
  } catch {
    return null;
  }
}

const truncate = (v: string | null | undefined, max: number): string | null =>
  v == null || v === '' ? null : v.slice(0, max);

/**
 * Insert one access event. Resolves user + request metadata itself so call
 * sites stay one line. Swallows every error.
 */
export async function logEvent(input: AccessEventInput): Promise<void> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;

    const h = headers();
    const userAgent = h.get('user-agent');
    if (isBot(userAgent)) return;

    const userId = input.userId === undefined ? (await getUser())?.id ?? null : input.userId;
    const visitorId = input.visitorId === undefined ? readVisitorId() : input.visitorId;

    // x-forwarded-for is a comma-separated chain; the client is the first entry.
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || null;

    const { error } = await getSupabaseAdmin().from('access_events').insert({
      visitor_id: visitorId,
      user_id: userId,
      event_type: input.eventType,
      path: truncate(input.path, MAX_PATH),
      referrer: truncate(input.referrer, MAX_REFERRER),
      country: h.get('x-vercel-ip-country'),
      ip,
      user_agent: truncate(userAgent, MAX_UA),
      meta: input.meta ?? null,
    });
    if (error) console.error('[accessLog] insert failed:', error.message);
  } catch (err) {
    console.error('[accessLog] logEvent threw:', err instanceof Error ? err.message : err);
  }
}
