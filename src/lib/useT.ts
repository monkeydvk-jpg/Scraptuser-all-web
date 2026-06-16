'use client';

import { useAppStore } from '@/lib/store';
import { t as translate } from '@/lib/i18n';

/** Translate using the active language from the global store. */
export function useT() {
  const lang = useAppStore((s) => s.lang);
  return (key: string) => translate(lang, key);
}
