import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';
import { breadcrumbSchema, softwareApplicationSchema } from '@/lib/structured-data';
import GenerateClient from './GenerateClient';

export const metadata: Metadata = buildMetadata({
  title: 'Adobe Stock Prompt Generator — Bulk AI Prompts, Free',
  description:
    'Scrape Adobe Stock titles and generate AI prompts in bulk with custom prefix, suffix, aspect ratio and parameters. Runs in your browser, no signup.',
  path: '/generate',
});

export default function Page() {
  return (
    <>
      <JsonLd
        schema={[
          softwareApplicationSchema(
            'Adobe Stock Prompt Generator',
            '/generate',
            'Scrape Adobe Stock titles and generate AI prompts in bulk with custom prefix, suffix, aspect ratio and parameters.',
          ),
          breadcrumbSchema('Prompt Generator', '/generate'),
        ]}
      />
      <GenerateClient />
    </>
  );
}
