import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';
import { breadcrumbSchema, softwareApplicationSchema } from '@/lib/structured-data';
import AnalyticsClient from './AnalyticsClient';

export const metadata: Metadata = buildMetadata({
  title: 'Adobe Stock Portfolio Analytics — Downloads & Earnings',
  description:
    'Analyse any Adobe Stock portfolio by creator or keyword: downloads, growth trends and estimated earnings. Free, no login.',
  path: '/analytics',
});

export default function Page() {
  return (
    <>
      <JsonLd
        schema={[
          softwareApplicationSchema(
            'Adobe Stock Portfolio Analytics',
            '/analytics',
            'Analyse any Adobe Stock portfolio by creator or keyword: downloads, growth trends and estimated earnings.',
          ),
          breadcrumbSchema('Portfolio Analytics', '/analytics'),
        ]}
      />
      <AnalyticsClient />
    </>
  );
}
