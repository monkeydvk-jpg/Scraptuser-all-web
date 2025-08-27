'use client';

import { useAppStore } from '@/lib/store';
import { THEMES } from '@/types';
import { Palette } from 'lucide-react';

export function Header() {
  const { theme, currentTheme, setTheme } = useAppStore();
  
  return (
    <header 
      className="sticky top-0 z-50 backdrop-blur-md border-b"
      style={{ 
        backgroundColor: `${theme.colors.frameBg}95`,
        borderColor: `${theme.colors.highlight}30`
      }}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 
              className="text-2xl md:text-3xl font-bold flex items-center gap-2"
              style={{ color: theme.colors.highlight }}
            >
              🚀 Adobe Stock Prompt Generator Pro
            </h1>
            <p 
              className="text-sm md:text-base mt-1"
              style={{ color: theme.colors.labelFg }}
            >
              AI-Powered Content Scraping with Modern Web UI • V2.0
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Palette 
              className="w-5 h-5"
              style={{ color: theme.colors.labelFg }}
            />
            <select 
              value={currentTheme}
              onChange={(e) => setTheme(e.target.value)}
              className="px-3 py-2 rounded-lg border text-sm font-medium"
              style={{
                backgroundColor: theme.colors.entryBg,
                borderColor: theme.colors.highlight,
                color: theme.colors.entryFg
              }}
            >
              {Object.entries(THEMES).map(([key, themeData]) => (
                <option key={key} value={key}>
                  {themeData.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
}
