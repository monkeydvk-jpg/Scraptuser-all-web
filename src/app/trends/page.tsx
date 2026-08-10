import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import TrendsClient from './TrendsClient';

export const metadata: Metadata = buildMetadata({
  title: 'Adobe Stock Trends — Trending Keywords & Assets',
  description:
    'Track hot Adobe Stock keywords and assets by topic, estimated from download velocity. Auto-refreshed hourly. Free, no login.',
  path: '/trends',
});

export default function Page() {
  return <TrendsClient />;
}
