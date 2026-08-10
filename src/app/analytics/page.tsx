import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import AnalyticsClient from './AnalyticsClient';

export const metadata: Metadata = buildMetadata({
  title: 'Adobe Stock Portfolio Analytics — Downloads & Earnings',
  description:
    'Analyse any Adobe Stock portfolio by creator or keyword: downloads, growth trends and estimated earnings. Free, no login.',
  path: '/analytics',
});

export default function Page() {
  return <AnalyticsClient />;
}
