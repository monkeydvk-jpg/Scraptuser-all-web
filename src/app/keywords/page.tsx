import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';
import { breadcrumbSchema, softwareApplicationSchema } from '@/lib/structured-data';
import KeywordsClient from './KeywordsClient';

export const metadata: Metadata = buildMetadata({
  title: 'Adobe Stock Keyword Research Tool — Opportunity Score',
  description:
    'Rank Adobe Stock keywords by opportunity — high demand, low competition. Free keyword research built for stock contributors.',
  path: '/keywords',
});

export default function Page() {
  return (
    <>
      <JsonLd
        schema={[
          softwareApplicationSchema(
            'Adobe Stock Keyword Research Tool',
            '/keywords',
            'Rank Adobe Stock keywords by opportunity — high demand, low competition.',
          ),
          breadcrumbSchema('Keyword Research', '/keywords'),
        ]}
      />
      <KeywordsClient />
    </>
  );
}
