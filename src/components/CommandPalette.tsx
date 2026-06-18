'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Zap, BarChart3, Compass, TrendingUp, Palette, Languages, CornerDownLeft } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { THEMES } from '@/types';
import { t as translate, type Lang } from '@/lib/i18n';

interface Cmd {
  id: string;
  group: string;
  label: string;
  sub?: string;
  icon: LucideIcon;
  run: () => void;
}

export function CommandPalette() {
  const router = useRouter();
  const { lang, setLang, currentTheme, setTheme, cmdOpen, setCmdOpen } = useAppStore();
  const t = (k: string) => translate(lang, k);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen(!useAppStore.getState().cmdOpen);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setCmdOpen]);

  useEffect(() => {
    if (cmdOpen) {
      setQ('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [cmdOpen]);

  const items = useMemo<Cmd[]>(() => {
    const nav: Cmd[] = [
      { id: 'g', group: t('cmd_nav'), label: t('nav_generate'), sub: '/generate', icon: Zap, run: () => router.push('/generate') },
      { id: 'a', group: t('cmd_nav'), label: t('nav_analytics'), sub: '/analytics', icon: BarChart3, run: () => router.push('/analytics') },
      { id: 'k', group: t('cmd_nav'), label: t('nav_keywords'), sub: '/keywords', icon: Compass, run: () => router.push('/keywords') },
      { id: 't', group: t('cmd_nav'), label: t('nav_trends'), sub: '/trends', icon: TrendingUp, run: () => router.push('/trends') },
    ];
    const themes: Cmd[] = Object.entries(THEMES).map(([id, th]) => ({
      id: `th-${id}`,
      group: t('cmd_theme_label'),
      label: th.name,
      sub: currentTheme === id ? 'current' : '',
      icon: Palette,
      run: () => setTheme(id),
    }));
    const langs: Cmd[] = (['vi', 'en'] as Lang[]).map((l) => ({
      id: `lg-${l}`,
      group: t('cmd_lang'),
      label: l === 'vi' ? t('cmd_lang_vi') : t('cmd_lang_en'),
      sub: lang === l ? 'current' : '',
      icon: Languages,
      run: () => setLang(l),
    }));
    return [...nav, ...themes, ...langs];
  }, [t, router, setTheme, setLang, currentTheme, lang]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? items.filter((it) => `${it.label} ${it.group}`.toLowerCase().includes(s)) : items;
  }, [items, q]);

  useEffect(() => {
    if (active >= filtered.length) setActive(0);
  }, [filtered, active]);

  const run = (i: number) => {
    const it = filtered[i];
    if (!it) return;
    it.run();
    setCmdOpen(false);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); run(active); }
    else if (e.key === 'Escape') { setCmdOpen(false); }
  };

  if (!cmdOpen) return null;

  // group consecutive items
  const groups: { name: string; items: { it: Cmd; idx: number }[] }[] = [];
  filtered.forEach((it, idx) => {
    let g = groups.find((x) => x.name === it.group);
    if (!g) { g = { name: it.group, items: [] }; groups.push(g); }
    g.items.push({ it, idx });
  });

  return (
    <div className="cmd-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setCmdOpen(false); }}>
      <div className="cmd-modal" role="dialog" aria-label="Command palette" onKeyDown={onKey}>
        <div className="cmd-input-row">
          <Search />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('cmd_hint')} aria-label={t('search')} />
        </div>
        <div className="cmd-list">
          {filtered.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--label-fg)', fontSize: 13 }}>{t('cmd_empty')}</div>
          )}
          {groups.map((g) => (
            <div key={g.name}>
              <div className="cmd-group-label">{g.name}</div>
              {g.items.map(({ it, idx }) => {
                const Icon = it.icon;
                return (
                  <div
                    key={it.id}
                    className={'cmd-item' + (active === idx ? ' active' : '')}
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => run(idx)}
                  >
                    <span className="ci-icon"><Icon /></span>
                    <div className="stack">
                      <span className="ci-label">{it.label}</span>
                      {it.sub && <span className="ci-sub">{it.sub}</span>}
                    </div>
                    <span className="ci-enter"><CornerDownLeft style={{ width: 15, height: 15 }} /></span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="cmd-foot">
          <span className="row"><span className="kbd">↑↓</span> {t('cmd_nav_navigate')}</span>
          <span className="row"><span className="kbd">↵</span> {t('cmd_nav_select')}</span>
          <span className="row"><span className="kbd">esc</span> {t('cmd_nav_close')}</span>
        </div>
      </div>
    </div>
  );
}
