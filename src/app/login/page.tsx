import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { LoginClient } from './LoginClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildMetadata({
  title: 'Sign in — Stocklytics',
  description: 'Sign in to your Stocklytics account.',
  path: '/login',
  noindex: true,
});

export default function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  return (
    <main className="app">
      <div className="bg-aura" />
      <Header />
      <LoginClient next={searchParams.next ?? ''} />
      <Footer />
    </main>
  );
}
