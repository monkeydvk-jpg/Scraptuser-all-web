import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import { ThemedToaster } from '@/components/ThemedToaster';
import { CommandPalette } from '@/components/CommandPalette';
import { ThemeApplier } from '@/components/ThemeApplier';
import { TrackPageview } from '@/components/TrackPageview';
import { JsonLd } from '@/components/JsonLd';
import { organizationSchema, webSiteSchema } from '@/lib/structured-data';
import { SITE_NAME, SITE_URL } from '@/lib/seo';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-body' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-display' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Stocklytics — Free Adobe Stock Keyword & Prompt Tools',
    template: '%s',
  },
  description:
    'Free Adobe Stock toolkit: bulk AI prompt generation, portfolio analytics, opportunity keyword research and trend tracking. No login required.',
  applicationName: SITE_NAME,
  referrer: 'origin-when-cross-origin',
  formatDetection: { telephone: false, address: false, email: false },
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
        <JsonLd schema={[organizationSchema, webSiteSchema]} />
        <ThemeApplier />
        <TrackPageview />
        {children}
        <CommandPalette />
        <ThemedToaster />
      </body>
    </html>
  );
}
