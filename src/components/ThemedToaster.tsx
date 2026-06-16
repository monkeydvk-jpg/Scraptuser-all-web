'use client';

import { Toaster } from 'react-hot-toast';
import { useAppStore } from '@/lib/store';

/** Toaster whose styling follows the active theme tokens. */
export function ThemedToaster() {
  const { theme } = useAppStore();
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: theme.colors.frameBg,
          color: theme.colors.fg,
          border: `1px solid ${theme.colors.highlight}66`,
          borderRadius: '12px',
        },
        success: { iconTheme: { primary: theme.colors.success, secondary: theme.colors.frameBg } },
        error: { iconTheme: { primary: theme.colors.error, secondary: theme.colors.frameBg } },
      }}
    />
  );
}
