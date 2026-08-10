import type { Metadata } from 'next';

/** Canonical origin. Overridden per-environment; falls back to production. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://stocklytic.bond').replace(/\/$/, '');

export const SITE_NAME = 'Stocklytics';

export interface BuildMetadataOptions {
  /** Exact <title>. Must be <= 60 chars. */
  title: string;
  /** Exact meta description. Must be <= 155 chars. */
  description: string;
  /** Route path beginning with "/", used for the absolute canonical. */
  path: string;
  /** Auth-gated or private pages. Emits noindex,nofollow. */
  noindex?: boolean;
}

/**
 * Single source of truth for per-route metadata: canonical, OpenGraph,
 * Twitter and robots directives. See spec 3.2.
 */
export function buildMetadata({ title, description, path, noindex = false }: BuildMetadataOptions): Metadata {
  const url = `${SITE_URL}${path}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      siteName: SITE_NAME,
      title,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    robots: noindex
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}
