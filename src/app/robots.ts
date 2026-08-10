import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // JSON endpoints only — no search value. Auth-gated pages are handled
      // by noindex, NOT by Disallow: a blocked page can still be indexed
      // from external links because Googlebot never sees the noindex.
      disallow: '/api/',
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
