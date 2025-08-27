import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '🚀 Adobe Stock Prompt Generator Pro',
  description: 'AI-Powered Content Scraping with Modern Web UI - V2.0',
  keywords: ['adobe stock', 'prompt generator', 'content scraping', 'ai tools'],
  authors: [{ name: 'Adobe Stock Scraper Team' }],
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        {children}
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#161b22',
              color: '#c9d1d9',
              border: '1px solid #1f6feb',
            },
          }}
        />
      </body>
    </html>
  );
}
