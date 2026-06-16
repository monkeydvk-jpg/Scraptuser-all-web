/**
 * Stocklytics theme application.
 * Sets all chrome colors as CSS custom properties on :root so the whole app
 * re-skins per theme. Components read var(--token) — never hardcode chrome.
 *
 * Sets the canonical handoff token names PLUS a few legacy aliases used by
 * earlier components (so they keep working during the redesign migration).
 */
import type { Theme } from '@/types';

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}
export function rgba(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const c = theme.colors;
  const dark = theme.dark;
  const root = document.documentElement;
  const set = (k: string, v: string) => root.style.setProperty(k, v);

  // Canonical tokens
  set('--bg', c.bg);
  set('--frame-bg', c.frameBg);
  set('--entry-bg', c.entryBg);
  set('--button-bg', c.buttonBg);
  set('--fg', c.fg);
  set('--label-fg', c.labelFg);
  set('--highlight', c.highlight);
  set('--accent', c.accent);
  set('--success', c.success);
  set('--warning', c.warning);
  set('--error', c.error);
  set('--gold', c.gold);

  // Derived / glass tokens
  set('--frame-glass', rgba(c.frameBg, dark ? 0.72 : 0.82));
  set('--frame-glass-strong', rgba(c.frameBg, dark ? 0.88 : 0.95));
  set('--topbar-glass', rgba(c.bg, dark ? 0.62 : 0.7));
  set('--entry-glass', rgba(c.entryBg, dark ? 0.7 : 0.9));
  set('--border', rgba(c.highlight, dark ? 0.2 : 0.16));
  set('--border-soft', rgba(c.fg, 0.08));
  set('--border-strong', rgba(c.highlight, dark ? 0.34 : 0.28));
  set('--hover-tint', rgba(c.highlight, dark ? 0.1 : 0.07));
  set('--row-hover', rgba(c.accent, dark ? 0.07 : 0.06));

  set('--highlight-12', rgba(c.highlight, 0.12));
  set('--highlight-20', rgba(c.highlight, 0.2));
  set('--accent-12', rgba(c.accent, 0.12));
  set('--accent-18', rgba(c.accent, 0.18));
  set('--success-15', rgba(c.success, 0.16));
  set('--warning-15', rgba(c.warning, 0.18));
  set('--error-15', rgba(c.error, 0.16));
  set('--gold-15', rgba(c.gold, 0.16));
  set('--gold-glow', rgba(c.gold, 0.32));

  set('--glow', rgba(c.highlight, dark ? 0.45 : 0.3));
  set('--accent-glow', rgba(c.accent, dark ? 0.4 : 0.28));
  set('--shadow', dark ? '0 16px 40px -12px rgba(0,0,0,0.55)' : '0 16px 40px -16px rgba(20,30,60,0.18)');
  set('--shadow-sm', dark ? '0 6px 18px -8px rgba(0,0,0,0.5)' : '0 6px 18px -10px rgba(20,30,60,0.14)');
  set('--gradient', `linear-gradient(120deg, ${c.highlight}, ${c.accent})`);
  set('--gradient-soft', `linear-gradient(120deg, ${rgba(c.highlight, 0.16)}, ${rgba(c.accent, 0.16)})`);

  // Legacy aliases (used by pre-redesign components; remove once all migrated)
  set('--text', c.fg);
  set('--text-dim', c.labelFg);
  set('--text-faint', rgba(c.fg, 0.55));
  set('--card', rgba(c.frameBg, dark ? 0.72 : 0.82));
  set('--card-2', c.buttonBg);
  set('--bg-2', c.bg);
  set('--border-2', rgba(c.highlight, dark ? 0.34 : 0.28));

  root.dataset.theme = theme.name.toLowerCase();
  root.style.colorScheme = dark ? 'dark' : 'light';
}
