'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Fires one beacon per client-side navigation.
 *
 * `lastPath` lives at module scope, not in a ref: React strict mode remounts
 * the component in development, and a ref would reset with it and double-count.
 */
let lastPath: string | null = null;

export function TrackPageview() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname === lastPath) return;
    lastPath = pathname;

    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname, referrer: document.referrer || null }),
      keepalive: true, // survives the navigation that triggered it
    }).catch(() => {
      // A failed beacon is not worth telling the user about.
    });
  }, [pathname]);

  return null;
}
