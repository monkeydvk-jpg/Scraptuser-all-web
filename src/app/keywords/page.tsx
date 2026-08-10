import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import KeywordsClient from './KeywordsClient';

export const metadata: Metadata = buildMetadata({
  title: 'Adobe Stock Keyword Research Tool — Opportunity Score',
  description:
    'Rank Adobe Stock keywords by opportunity — high demand, low competition. Free keyword research built for stock contributors.',
  path: '/keywords',
});

export default function Page() {
  return <KeywordsClient />;
}
