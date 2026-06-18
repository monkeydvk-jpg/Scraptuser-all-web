'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Zap, BarChart3, Compass, TrendingUp, LineChart, Palette, Search, Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { THEMES } from '@/types';
import { t as translate, type Lang } from '@/lib/i18n';

const NAV: { href: string; key: string; icon: LucideIcon }[] = [
  { href: '/generate', key: 'nav_generate', icon: Zap },
  { href: '/analytics', key: 'nav_analytics', icon: BarChart3 },
  { href: '/keywords', key: 'nav_keywords', icon: Compass },
  { href: '/trends', key: 'nav_trends', icon: TrendingUp },
];

function ThemePicker() {
  const { currentTheme, setTheme, lang } = useAppStore();
  const t = (k: string) => translate(lang, k);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  return (
    <div className="tp" ref={ref}>
      <button className="tp-btn" onClick={() => setOpen((o) => !o)} aria-label={t('cmd_theme_label')} aria-haspopup="true">
        <Palette />
      </button>
      {open && (
        <div className="tp-menu" role="menu">
          <div className="tp-title">{t('cmd_theme_label')}</div>
          {Object.entries(THEMES).map(([id, th]) => (
            <div
              key={id}
              className={'tp-item' + (currentTheme === id ? ' on' : '')}
              role="menuitemradio"
              aria-checked={currentTheme === id}
              onClick={() => {
                setTheme(id);
                setOpen(false);
              }}
            >
              <span className="tp-swatch">
                <i style={{ background: th.colors.highlight }} />
                <i style={{ background: th.colors.accent }} />
                <i style={{ background: th.colors.frameBg }} />
              </span>
              <span className="tp-name">{th.name}</span>
              {currentTheme === id && (
                <span className="tp-check">
                  <Check />
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Header() {
  const pathname = usePathname();
  const { lang, setLang, setCmdOpen } = useAppStore();
  const t = (k: string) => translate(lang, k);

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/" className="logo-text-tag row" style={{ gap: 11, textDecoration: 'none', color: 'var(--fg)' }}>
            <span
              className="logo-mark"
              style={{ width: 34, height: 34, borderRadius: 11, background: 'var(--gradient)', boxShadow: '0 6px 18px -6px var(--glow)', flex: 'none' }}
            >
              <LineChart style={{ width: 20, height: 20, color: '#fff' }} strokeWidth={2.2} />
            </span>
            <span className="stack" style={{ lineHeight: 1.05 }}>
              <span className="display" style={{ fontSize: 18, fontWeight: 600 }}>Stocklytics</span>
              <span style={{ fontSize: 10.5, color: 'var(--label-fg)' }}>{t('tagline')}</span>
            </span>
          </Link>

          <nav className="nav-pills" aria-label="Primary">
            {NAV.map((n) => {
              const Icon = n.icon;
              const active = pathname === n.href;
              return (
                <Link key={n.href} href={n.href} className={'pill' + (active ? ' active' : '')} aria-current={active ? 'page' : undefined}>
                  <Icon /> {t(n.key)}
                </Link>
              );
            })}
          </nav>

          <div className="topbar-right">
            <button className="cmd-trigger" onClick={() => setCmdOpen(true)} aria-label={t('search')}>
              <Search style={{ width: 16, height: 16, flex: 'none' }} />
              <span className="cmd-trigger-text">{t('cmd_hint')}</span>
              <span className="kbd">⌘K</span>
            </button>
            <div className="segmented sm">
              {(['vi', 'en'] as Lang[]).map((l) => (
                <button key={l} className={'seg' + (lang === l ? ' on' : '')} onClick={() => setLang(l)} aria-pressed={lang === l}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <ThemePicker />
            <div className="avatar" title="Studio Aurora" aria-label="Account">
              SA
            </div>
          </div>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="mobile-nav" aria-label="Primary mobile">
        {NAV.map((n) => {
          const Icon = n.icon;
          const active = pathname === n.href;
          return (
            <Link key={n.href} href={n.href} className={'mn-item' + (active ? ' on' : '')} aria-current={active ? 'page' : undefined}>
              <Icon /> {t(n.key).split(' ')[0]}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
