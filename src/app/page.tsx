import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';
import { faqPageSchema } from '@/lib/structured-data';
import PageClient from './PageClient';

export const metadata: Metadata = buildMetadata({
  title: 'Stocklytics — Free Adobe Stock Keyword & Prompt Tools',
  description:
    'Free Adobe Stock toolkit: bulk AI prompt generation, portfolio analytics, opportunity keyword research and trend tracking. No login required.',
  path: '/',
});

export default function Page() {
  return (
    <>
      <JsonLd schema={faqPageSchema()} />
      <PageClient />
    </>
  );
}
