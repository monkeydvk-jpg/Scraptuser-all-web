'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import {
  LineChart, Zap, BarChart3, Compass, TrendingUp, ArrowRight,
  Lock, ShieldCheck, FileDown, Palette, Check,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useT } from '@/lib/useT';
import type { Lang } from '@/lib/i18n';

const FEATURES: { icon: LucideIcon; href: string; tKey: string; dKey: string; tint: string }[] = [
  { icon: Zap, href: '/generate', tKey: 'lp_feat_gen_t', dKey: 'lp_feat_gen_d', tint: 'lp-violet' },
  { icon: BarChart3, href: '/analytics', tKey: 'lp_feat_an_t', dKey: 'lp_feat_an_d', tint: 'lp-cyan' },
  { icon: Compass, href: '/keywords', tKey: 'lp_feat_kw_t', dKey: 'lp_feat_kw_d', tint: 'lp-violet' },
  { icon: TrendingUp, href: '/trends', tKey: 'lp_feat_tr_t', dKey: 'lp_feat_tr_d', tint: 'lp-cyan' },
];

const WHY: { icon: LucideIcon; tKey: string; dKey: string }[] = [
  { icon: Lock, tKey: 'lp_why_1_t', dKey: 'lp_why_1_d' },
  { icon: ShieldCheck, tKey: 'lp_why_2_t', dKey: 'lp_why_2_d' },
  { icon: FileDown, tKey: 'lp_why_3_t', dKey: 'lp_why_3_d' },
  { icon: Palette, tKey: 'lp_why_4_t', dKey: 'lp_why_4_d' },
];

const STEPS: { tKey: string; dKey: string }[] = [
  { tKey: 'lp_how_1_t', dKey: 'lp_how_1_d' },
  { tKey: 'lp_how_2_t', dKey: 'lp_how_2_d' },
  { tKey: 'lp_how_3_t', dKey: 'lp_how_3_d' },
];

export default function LandingPage() {
  const t = useT();
  const lang = useAppStore((s) => s.lang);
  const setLang = useAppStore((s) => s.setLang);

  // Scroll-reveal: add `.in` once each element enters the viewport.
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('.lp-reveal'));
    if (typeof IntersectionObserver === 'undefined') {
      els.forEach((el) => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }),
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="lp">
      <div className="lp-aura" aria-hidden />

      {/* top bar */}
      <header className="lp-bar">
        <Link href="/" className="lp-brand" aria-label="Stocklytics">
          <span className="lp-logo"><LineChart /></span>
          <span className="lp-brand-text">
            <b>Stocklytics</b>
            <small>Adobe Stock Suite</small>
          </span>
        </Link>
        <div className="lp-bar-right">
          <div className="lp-seg" role="group" aria-label="Language">
            {(['vi', 'en'] as Lang[]).map((l) => (
              <button key={l} className={'lp-seg-btn' + (lang === l ? ' on' : '')} aria-pressed={lang === l} onClick={() => setLang(l)}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <Link href="/generate" className="lp-btn lp-btn-primary">{t('lp_launch')} <ArrowRight /></Link>
        </div>
      </header>

      {/* hero */}
      <section className="lp-hero">
        <div className="lp-hero-copy lp-reveal">
          <span className="lp-eyebrow">{t('lp_hero_eyebrow')}</span>
          <h1 className="lp-h1">{t('lp_hero_title')}</h1>
          <p className="lp-lead">{t('lp_hero_sub')}</p>
          <div className="lp-hero-cta">
            <Link href="/generate" className="lp-btn lp-btn-primary lp-btn-lg">{t('lp_cta_primary')} <ArrowRight /></Link>
            <a href="#features" className="lp-btn lp-btn-ghost lp-btn-lg">{t('lp_cta_secondary')}</a>
          </div>
        </div>
        <div className="lp-hero-art lp-reveal" aria-hidden>
          <div className="lp-art-card">
            <div className="lp-art-row"><span className="lp-dot" /><span className="lp-dot" /><span className="lp-dot" /></div>
            <div className="lp-art-bars">
              {[68, 92, 44, 78, 56, 88, 36].map((h, i) => (
                <span key={i} style={{ height: h + '%' }} />
              ))}
            </div>
            <div className="lp-art-lines">
              <span style={{ width: '90%' }} /><span style={{ width: '72%' }} /><span style={{ width: '81%' }} /><span style={{ width: '60%' }} />
            </div>
          </div>
        </div>
      </section>

      {/* stats strip (real facts only) */}
      <section className="lp-stats lp-reveal">
        {[
          { n: '4', k: 'lp_stat_tools' },
          { n: '500', k: 'lp_stat_assets' },
          { n: '6', k: 'lp_stat_themes' },
          { n: 'VI/EN', k: 'lp_stat_login' },
        ].map((s, i) => (
          <div key={i} className="lp-stat">
            <span className="lp-stat-n">{s.n}</span>
            <span className="lp-stat-l">{t(s.k)}</span>
          </div>
        ))}
      </section>

      {/* features */}
      <section id="features" className="lp-section">
        <div className="lp-section-head lp-reveal">
          <h2>{t('lp_features_title')}</h2>
          <p>{t('lp_features_sub')}</p>
        </div>
        <div className="lp-grid lp-grid-4">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <Link key={f.href} href={f.href} className="lp-card lp-reveal" style={{ transitionDelay: i * 0.06 + 's' }}>
                <span className={'lp-icon ' + f.tint}><Icon /></span>
                <h3>{t(f.tKey)}</h3>
                <p>{t(f.dKey)}</p>
                <span className="lp-card-link">{t('lp_feat_open')} <ArrowRight /></span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* why */}
      <section className="lp-section">
        <div className="lp-section-head lp-reveal"><h2>{t('lp_why_title')}</h2></div>
        <div className="lp-grid lp-grid-4">
          {WHY.map((w, i) => {
            const Icon = w.icon;
            return (
              <div key={i} className="lp-why lp-reveal" style={{ transitionDelay: i * 0.06 + 's' }}>
                <span className="lp-icon lp-soft"><Icon /></span>
                <h3>{t(w.tKey)}</h3>
                <p>{t(w.dKey)}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* how it works */}
      <section className="lp-section">
        <div className="lp-section-head lp-reveal"><h2>{t('lp_how_title')}</h2></div>
        <div className="lp-grid lp-grid-3">
          {STEPS.map((s, i) => (
            <div key={i} className="lp-step lp-reveal" style={{ transitionDelay: i * 0.08 + 's' }}>
              <span className="lp-step-n">{i + 1}</span>
              <h3>{t(s.tKey)}</h3>
              <p>{t(s.dKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* final CTA */}
      <section className="lp-cta-band lp-reveal">
        <h2>{t('lp_final_title')}</h2>
        <p>{t('lp_final_sub')}</p>
        <Link href="/generate" className="lp-btn lp-btn-primary lp-btn-lg">{t('lp_cta_primary')} <ArrowRight /></Link>
      </section>

      {/* footer */}
      <footer className="lp-footer">
        <div className="lp-brand">
          <span className="lp-logo"><LineChart /></span>
          <span className="lp-brand-text"><b>Stocklytics</b><small>Adobe Stock Suite</small></span>
        </div>
        <nav className="lp-foot-nav" aria-label={t('lp_footer_tools')}>
          <Link href="/generate"><Zap /> {t('lp_feat_gen_t')}</Link>
          <Link href="/analytics"><BarChart3 /> {t('lp_feat_an_t')}</Link>
          <Link href="/keywords"><Compass /> {t('lp_feat_kw_t')}</Link>
          <Link href="/trends"><TrendingUp /> {t('lp_feat_tr_t')}</Link>
        </nav>
        <div className="lp-seg" role="group" aria-label="Language">
          {(['vi', 'en'] as Lang[]).map((l) => (
            <button key={l} className={'lp-seg-btn' + (lang === l ? ' on' : '')} aria-pressed={lang === l} onClick={() => setLang(l)}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        <span className="lp-copy"><Check style={{ width: 13, height: 13 }} /> © Stocklytics</span>
      </footer>
    </div>
  );
}
