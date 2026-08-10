import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import GenerateClient from './GenerateClient';

export const metadata: Metadata = buildMetadata({
  title: 'Adobe Stock Prompt Generator — Bulk AI Prompts, Free',
  description:
    'Scrape Adobe Stock titles and generate AI prompts in bulk with custom prefix, suffix, aspect ratio and parameters. Runs in your browser, no signup.',
  path: '/generate',
});

export default function Page() {
  return <GenerateClient />;
}
