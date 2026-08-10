import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

/** Only the five indexed routes. Never list a noindex URL here. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    { url: `${SITE_URL}/`, lastModified, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${SITE_URL}/generate`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/keywords`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/trends`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/analytics`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
  ];
}
