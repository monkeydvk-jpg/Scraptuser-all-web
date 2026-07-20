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
  const isProtected =
    path.startsWith('/watchlist') || path.startsWith('/assets') || path.startsWith('/admin');

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
  matcher: ['/watchlist/:path*', '/assets/:path*', '/admin/:path*', '/login'],
};
