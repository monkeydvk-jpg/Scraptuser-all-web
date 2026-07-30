import { NextRequest, NextResponse } from 'next/server';
import { logEvent, readVisitorId, VISITOR_COOKIE, visitorCookieOptions } from '@/lib/accessLog';

export const dynamic = 'force-dynamic';

/**
 * Pageview beacon. Always answers 204 — the browser must never retry or see an
 * error, and a tracking outage must be invisible to the visitor.
 */
export async function POST(request: NextRequest) {
  const response = new NextResponse(null, { status: 204 });

  try {
    const body = (await request.json()) as { path?: unknown; referrer?: unknown };
    const path = typeof body.path === 'string' ? body.path : null;
    if (!path || !path.startsWith('/')) return response;

    // Mint the visitor id here: a route handler is the only place allowed to
    // set a cookie, which is why visitor_id is nullable everywhere else.
    let visitorId = readVisitorId();
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      response.cookies.set(VISITOR_COOKIE, visitorId, visitorCookieOptions());
    }

    await logEvent({
      eventType: 'pageview',
      path,
      referrer: typeof body.referrer === 'string' ? body.referrer : null,
      visitorId,
    });
  } catch (err) {
    console.error('[track] failed:', err instanceof Error ? err.message : err);
  }

  return response;
}
