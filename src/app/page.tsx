'use client';

import { useAppStore } from '@/lib/store';
import { THEMES } from '@/types';
import { Header } from '@/components/Header';
import { URLCard } from '@/components/URLCard';
import { FormatCard } from '@/components/FormatCard';
import { ControlCard } from '@/components/ControlCard';
import { PreviewCard } from '@/components/PreviewCard';
import { StatsCard } from '@/components/StatsCard';
import { Footer } from '@/components/Footer';
import { useEffect } from 'react';

export default function Home() {
  const { theme, currentTheme, setTheme } = useAppStore();

  // Apply theme to document body
  useEffect(() => {
    document.body.style.backgroundColor = theme.colors.bg;
    document.body.style.color = theme.colors.fg;
  }, [theme]);

  return (
    <main 
      className="min-h-screen transition-all duration-300"
      style={{ backgroundColor: theme.colors.bg, color: theme.colors.fg }}
    >
      {/* Header */}
      <Header />
      
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Controls */}
          <div className="lg:col-span-2 space-y-6">
            <URLCard />
            <FormatCard />
            <ControlCard />
          </div>
          
          {/* Right Column - Preview and Stats */}
          <div className="space-y-6">
            <PreviewCard />
            <StatsCard />
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <Footer />
    </main>
  );
}
