'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { applyTheme } from '@/lib/applyTheme';

/** Applies the active theme's CSS variables to :root whenever it changes. */
export function ThemeApplier() {
  const theme = useAppStore((s) => s.theme);
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
  return null;
}
