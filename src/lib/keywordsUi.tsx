/**
 * Presentation helpers for the Keyword Insights UI:
 * number formatters, score→color ramp, content-type meta, and a bridge that
 * exposes the active Zustand theme as CSS custom properties so the ported
 * (CSS-variable based) markup stays theme-aware.
 */
import type { CSSProperties } from 'react';
import { Grid3x3, Image, PenTool, Layers, Video, FileText, Box } from 'lucide-react';
import type { Theme } from '@/types';

/** Compact number: 1.2K / 3.4M. */
export const fmt = (n: number | null | undefined): string => {
  if (n == null) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(n >= 10_000 ? 0 : 1) + 'K';
  return String(Math.round(n));
};

export const fmtFull = (n: number | null | undefined): string =>
  n == null ? '—' : n.toLocaleString('en-US');

/** Opportunity-score → theme-aware color ramp (low → high). */
export function scoreColor(score: number, theme: Theme): string {
  if (score >= 80) return theme.colors.success;
  if (score >= 62) return theme.colors.accent;
  if (score >= 45) return theme.colors.warning;
  return theme.colors.error;
}

/** Categorical palette for content types (kept stable across themes). */
export const CONTENT_TYPES = [
  { id: 'all', key: 'ct_all', icon: Grid3x3, color: '#58a6ff' },
  { id: 'photo', key: 'ct_photo', icon: Image, color: '#58a6ff' },
  { id: 'illus', key: 'ct_illus', icon: PenTool, color: '#bc8cff' },
  { id: 'vector', key: 'ct_vector', icon: Layers, color: '#3fb950' },
  { id: 'video', key: 'ct_video', icon: Video, color: '#f778ba' },
  { id: 'template', key: 'ct_tmpl', icon: FileText, color: '#d29922' },
  { id: '3d', key: 'ct_3d', icon: Box, color: '#ff7b72' },
] as const;

/** UI content-filter ids (pills) → key used by aggregation/charts. */
export const PILL_TO_FILTER: Record<string, string> = {
  all: 'all',
  photo: 'image/jpeg',
  illus: 'image/png',
  vector: 'image/svg+xml',
  video: 'video',
  template: 'application',
  '3d': '3d',
};

export const contentMeta = (id: string) => CONTENT_TYPES.find((c) => c.id === id);

/**
 * Theming is now applied globally on :root by lib/applyTheme.ts, so this is a
 * no-op kept for call-site compatibility. (Pages still spread it harmlessly.)
 */
export function ksThemeVars(_theme: Theme): CSSProperties {
  return {} as CSSProperties;
}
