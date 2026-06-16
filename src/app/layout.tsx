import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import { ThemedToaster } from '@/components/ThemedToaster';
import { CommandPalette } from '@/components/CommandPalette';
import { ThemeApplier } from '@/components/ThemeApplier';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-body' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-display' });

export const metadata: Metadata = {
  title: 'Stocklytics — Adobe Stock Suite',
  description: 'Prompt generation, portfolio analytics, keyword insights & trends for Adobe Stock.',
  keywords: ['adobe stock', 'prompt generator', 'analytics', 'keyword insights', 'trends'],
  authors: [{ name: 'Stocklytics' }],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable} antialiased`}
      >
        <ThemeApplier />
        {children}
        <CommandPalette />
        <ThemedToaster />
      </body>
    </html>
  );
}
