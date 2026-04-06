'use client';

import { useAppStore } from '@/lib/store';
import { THEMES } from '@/types';
import { Palette, Zap, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Header() {
  const { theme, currentTheme, setTheme } = useAppStore();
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Prompt Generator', icon: <Zap className="w-4 h-4" /> },
    { href: '/analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
  ];
  
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
              className="text-xl md:text-2xl font-bold flex items-center gap-2"
              style={{ color: theme.colors.highlight }}
            >
              🚀 Adobe Stock Tools Pro
            </h1>
            <nav className="flex items-center gap-1 mt-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                    style={{
                      backgroundColor: isActive ? theme.colors.highlight : 'transparent',
                      color: isActive ? '#fff' : theme.colors.labelFg,
                    }}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          
          <div className="flex items-center gap-3">
            <Palette 
              className="w-5 h-5 hidden md:block"
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
