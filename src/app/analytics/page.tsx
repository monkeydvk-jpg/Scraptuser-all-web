'use client';

import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { saveAs } from 'file-saver';
import { Search, Users, BarChart3, Layers, Download, Gauge, Sparkles, RefreshCw, AlertTriangle, ExternalLink, ArrowUpDown, FileText, Table } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useT } from '@/lib/useT';
import { fmt, contentMeta } from '@/lib/keywordsUi';
import { BarTimeline, Donut } from '@/components/charts/StkCharts';
import type { PortfolioOverview } from '@/lib/portfolioStats';

type Phase = 'empty' | 'loading' | 'error' | 'results';

export default function AnalyticsPage() {
  const t = useT();
  const { theme } = useAppStore();
  const [query, setQuery] = useState('');
  const [phase, setPhase] = useState<Phase>('empty');
  const [data, setData] = useState<PortfolioOverview | null>(null);
  const [progress, setProgress] = useState(0);
  const [scanned, setScanned] = useState(0);
  const [topN, setTopN] = useState<100 | 500>(100);
  const [sortKey, setSortKey] = useState<'dl' | 'title'>('dl');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastQ = useRef('');

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const start = async (q: string) => {
    const query2 = (q || query).trim();
    if (!query2) return;
    setQuery(query2);
    lastQ.current = query2;
    const type = /^\d+$/.test(query2) ? 'creator' : 'keyword';
    setPhase('loading');
    setProgress(0);
    setScanned(0);
    if (timer.current) clearInterval(timer.current);
    const started = performance.now();
    const est = 9000;
    timer.current = setInterval(() => {
      const p = Math.min(96, ((performance.now() - started) / est) * 100);
      setProgress(p);
      setScanned(Math.round((p / 100) * 2000));
    }, 120);
    try {
      const res = await axios.post<PortfolioOverview>('/api/analytics/overview', { query: query2, type, maxAssets: 2000 });
      if (timer.current) clearInterval(timer.current);
      if (res.data.success) {
        setData(res.data);
        setPhase('results');
      } else {
        setPhase('error');
      }
    } catch {
      if (timer.current) clearInterval(timer.current);
      setPhase('error');
    }
  };

  const sc = data?.scorecard;
  const kpis = sc
    ? [
        { icon: Layers, value: fmt(data!.meta?.totalResults || sc.totalAssets), label: t('an_kpi_assets'), tint: '' },
        { icon: Download, value: fmt(sc.totalDownloads), label: t('an_kpi_downloads'), tint: 'tint-success' },
        { icon: Gauge, value: fmt(sc.avgDownloads), label: t('an_kpi_avg'), tint: 'tint-warning' },
        { icon: BarChart3, value: fmt(sc.avgMonthlyDownloads), label: t('an_kpi_monthly'), tint: 'tint-gold' },
      ]
    : [];

  const timeline = (data?.timeline ?? []).slice(-12).map((p) => ({ m: p.period.slice(5), v: p.downloads }));
  const byType = data?.byType ?? {};
  const totalDl = Object.values(byType).reduce((a, b) => a + b, 0) || 1;
  const donut = Object.entries(byType)
    .sort((a, b) => b[1] - a[1])
    .map(([id, v]) => ({ label: contentMeta(id) ? t(contentMeta(id)!.key) : id, value: Math.round((v / totalDl) * 100), color: contentMeta(id)?.color || theme.colors.accent }))
    .filter((d) => d.value > 0);

  const topList = (() => {
    const base = data?.topDownloaded ?? [];
    const sorted = sortKey === 'title'
      ? [...base].sort((a, b) => a.title.localeCompare(b.title))
      : [...base].sort((a, b) => b.nb_downloads - a.nb_downloads);
    return sorted.slice(0, topN);
  })();

  const exportName = (ext: string) => {
    const q = (data?.meta?.query || 'export').replace(/[^a-z0-9_-]+/gi, '_');
    return `top${topN}_${q}.${ext}`;
  };
  const exportTxt = () => {
    if (!topList.length) return;
    const body = topList.map((a, i) => `${i + 1}. ${a.title}  —  ${a.nb_downloads} downloads  —  https://stock.adobe.com/${a.id}`).join('\n');
    saveAs(new Blob([body], { type: 'text/plain;charset=utf-8' }), exportName('txt'));
  };
  const exportCsv = () => {
    if (!topList.length) return;
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = [
      ['rank', 'id', 'title', 'downloads', 'url'],
      ...topList.map((a, i) => [i + 1, a.id, a.title, a.nb_downloads, `https://stock.adobe.com/${a.id}`]),
    ];
    const csv = '﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n');
    saveAs(new Blob([csv], { type: 'text/csv;charset=utf-8' }), exportName('csv'));
  };

  return (
    <main className="app">
      <div className="bg-aura" />
      <Header />
      <div className="page-wrap anim-up">
        <div className="page-head">
          <h1>{t('an_title')}</h1>
          <p>{t('an_sub')}</p>
        </div>

        {/* search */}
        <div className="row" style={{ gap: 10, marginBottom: 22, maxWidth: 560 }}>
          <div className="input-with-icon" style={{ flex: 1 }}>
            <Users />
            <input className="input input-mono" value={query} placeholder={t('an_search_ph')}
              onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') start(query); }} />
          </div>
          <button className="btn btn-primary" onClick={() => start(query || '206854500')}>
            <Search /> {t('an_analyze')}
          </button>
        </div>

        {phase === 'empty' && (
          <div className="card anim-up">
            <div className="state-box">
              <div className="state-icon"><BarChart3 /></div>
              <h3>{t('an_empty_title')}</h3>
              <p>{t('an_empty_sub')}</p>
              <div className="row wrap" style={{ gap: 8, marginTop: 6, justifyContent: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--label-fg)', alignSelf: 'center' }}>{t('an_try')}:</span>
                {['206854500', 'minimalist', 'business', 'aerial'].map((q) => (
                  <button key={q} className="chip" onClick={() => start(q)}>{q}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {phase === 'loading' && (
          <div className="stack" style={{ gap: 18 }}>
            <div className="card">
              <div className="row spread" style={{ marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{t('st_loading')}</span>
                <span className="num" style={{ fontSize: 13, color: 'var(--accent)' }}>{fmt(scanned)} / 2K {t('st_scanned')}</span>
              </div>
              <div className="progress"><span style={{ width: progress + '%' }} /></div>
            </div>
            <div className="grid kpi-grid">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="card kpi">
                  <div className="skel" style={{ width: 34, height: 34, borderRadius: 10 }} />
                  <div className="skel" style={{ width: '60%', height: 26 }} />
                  <div className="skel" style={{ width: '40%', height: 12 }} />
                </div>
              ))}
            </div>
            <div className="grid two-col">
              <div className="card" style={{ height: 260 }}><div className="skel" style={{ width: '100%', height: '100%' }} /></div>
              <div className="card" style={{ height: 260 }}><div className="skel" style={{ width: '100%', height: '100%' }} /></div>
            </div>
          </div>
        )}

        {phase === 'error' && (
          <div className="card anim-up">
            <div className="state-box">
              <div className="state-icon" style={{ background: 'var(--error-15)', borderColor: 'transparent', color: 'var(--error)' }}><AlertTriangle /></div>
              <h3>{t('err_title')}</h3>
              <p>{t('err_desc')}</p>
              <button className="btn btn-ghost" onClick={() => start(lastQ.current)}><RefreshCw /> {t('err_retry')}</button>
            </div>
          </div>
        )}

        {phase === 'results' && data && sc && (
          <div className="stack" style={{ gap: 18 }}>
            <div className="meta-strip anim-up">
              <span>{data.meta?.mode === 'creator' ? 'Creator' : 'Keyword'} <b>{data.meta?.query}</b></span>
              <span className="meta-dot" />
              <span>{t('meta_scanned')} <b>{fmt(data.meta?.scannedAssets || 0)}</b> {t('meta_of')} {fmt(data.meta?.totalResults || 0)}</span>
              <span className="meta-dot" />
              <span>{t('meta_time')} <b>{data.meta?.processingTime}s</b></span>
            </div>

            <div className="grid kpi-grid stagger">
              {kpis.map((k, i) => {
                const Icon = k.icon;
                return (
                  <div key={i} className="card kpi lift anim-up" style={{ animationDelay: i * 0.05 + 's' }}>
                    <div className="kpi-top"><span className={'icon-badge ' + k.tint}><Icon /></span></div>
                    <div className="kpi-val">{k.value}</div>
                    <div className="kpi-label">{k.label}</div>
                  </div>
                );
              })}
            </div>

            <div className="grid two-col">
              <div className="card anim-up">
                <div className="card-head"><span className="icon-badge"><BarChart3 /></span><span className="ttl">{t('an_timeline')}</span></div>
                {timeline.length ? <BarTimeline data={timeline} /> : <p style={{ color: 'var(--label-fg)' }}>—</p>}
              </div>
              <div className="card anim-up">
                <div className="card-head"><span className="icon-badge"><Layers /></span><span className="ttl">{t('an_mix')}</span></div>
                {donut.length ? <Donut data={donut} /> : <p style={{ color: 'var(--label-fg)' }}>—</p>}
              </div>
            </div>

            <div className="card anim-up">
              <div className="card-head"><span className="icon-badge tint-gold"><Sparkles /></span><span className="ttl">{t('an_top')}</span></div>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))', gap: 14 }}>
                {(data.topMovers ?? []).map((a, i) => (
                  <a key={a.id} href={`https://stock.adobe.com/${a.id}`} target="_blank" rel="noreferrer" className="stack" style={{ gap: 9, textDecoration: 'none', color: 'inherit' }}>
                    <div className="thumb lift" style={{ aspectRatio: '4 / 3' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className="ph" src={a.thumbnail_240_url} alt="" loading="lazy" style={{ objectFit: 'cover' }} />
                      <span className="ext-badge"><ExternalLink style={{ width: 13, height: 13 }} /></span>
                    </div>
                    <div className="row spread" style={{ gap: 8 }}>
                      <span style={{ fontSize: 12.5, lineHeight: 1.3 }}>{a.title.slice(0, 60) || '—'}</span>
                      {i < 3 && <span className="rank gold" style={{ width: 22, height: 22, fontSize: 11 }}>{i + 1}</span>}
                    </div>
                    <span className="num" style={{ fontSize: 12, color: 'var(--label-fg)' }}>
                      <Download style={{ width: 12, height: 12, verticalAlign: -1, marginRight: 4 }} />{fmt(a.nb_downloads)}
                    </span>
                  </a>
                ))}
              </div>
            </div>

            <div className="card anim-up">
              <div className="card-head">
                <span className="icon-badge tint-success"><Download /></span>
                <span className="ttl">{t('an_topdl')}</span>
                <span className="sub">{t('an_topdl_sub')}</span>
                <div className="row wrap" style={{ marginLeft: 'auto', gap: 6 }}>
                  {([100, 500] as const).map((n) => (
                    <button
                      key={n}
                      className={'chip' + (topN === n ? ' sel' : '')}
                      aria-pressed={topN === n}
                      onClick={() => setTopN(n)}
                    >
                      Top {n}
                    </button>
                  ))}
                  <button
                    className="chip"
                    onClick={() => setSortKey((k) => (k === 'dl' ? 'title' : 'dl'))}
                    title={t('an_sort')}
                  >
                    <ArrowUpDown style={{ width: 13, height: 13 }} /> {sortKey === 'dl' ? t('an_sort_dl') : t('an_sort_title')}
                  </button>
                  <button className="btn btn-ghost" style={{ padding: '7px 12px', fontSize: 12.5 }} onClick={exportTxt} disabled={!topList.length}>
                    <FileText style={{ width: 14, height: 14 }} /> TXT
                  </button>
                  <button className="btn btn-ghost" style={{ padding: '7px 12px', fontSize: 12.5 }} onClick={exportCsv} disabled={!topList.length}>
                    <Table style={{ width: 14, height: 14 }} /> CSV
                  </button>
                </div>
              </div>
              {topList.length === 0 ? (
                <p style={{ color: 'var(--label-fg)' }}>—</p>
              ) : (
                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))', gap: 14 }}>
                  {topList.map((a, i) => (
                    <a key={a.id} href={`https://stock.adobe.com/${a.id}`} target="_blank" rel="noreferrer" className="stack" style={{ gap: 9, textDecoration: 'none', color: 'inherit' }}>
                      <div className="thumb lift" style={{ aspectRatio: '4 / 3' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img className="ph" src={a.thumbnail_240_url} alt="" loading="lazy" style={{ objectFit: 'cover' }} />
                        <span className="ext-badge"><ExternalLink style={{ width: 13, height: 13 }} /></span>
                        <span className="rank gold" style={{ position: 'absolute', top: 8, left: 8, width: 22, height: 22, fontSize: 11 }}>{i + 1}</span>
                      </div>
                      <div className="row spread" style={{ gap: 8 }}>
                        <span style={{ fontSize: 12.5, lineHeight: 1.3 }}>{a.title.slice(0, 60) || '—'}</span>
                      </div>
                      <span className="num" style={{ fontSize: 12, color: 'var(--label-fg)' }}>
                        <Download style={{ width: 12, height: 12, verticalAlign: -1, marginRight: 4 }} />{fmt(a.nb_downloads)}
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
