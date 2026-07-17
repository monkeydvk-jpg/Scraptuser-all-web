import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { LoginClient } from './LoginClient';

export const dynamic = 'force-dynamic';

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
