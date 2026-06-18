'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Search, Compass, Target, Zap, Filter, X, Sparkles, ExternalLink, RefreshCw, AlertTriangle, ArrowUpDown } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useT } from '@/lib/useT';
import { fmt } from '@/lib/keywordsUi';
import { OppScatter, OppBars, ScoreRing } from '@/components/charts/StkCharts';
import type { InsightsResponse, KeywordInsight, CompetitionLevel } from '@/types';

type Phase = 'empty' | 'loading' | 'error' | 'results';
type SortKey = 'keyword' | 'avgDownloads' | 'assetCount' | 'competition' | 'opportunityScore';
const COMP01: Record<CompetitionLevel, number> = { low: 0.25, medium: 0.55, high: 0.85 };
const COMP_ORDER: Record<CompetitionLevel, number> = { low: 0, medium: 1, high: 2 };

function Badge({ level, t }: { level: CompetitionLevel; t: (k: string) => string }) {
  const cls = level === 'medium' ? 'med' : level;
  const key = level === 'medium' ? 'comp_medium' : level === 'high' ? 'comp_high' : 'comp_low';
  return <span className={'badge ' + cls}><span className="dot" /> {t(key)}</span>;
}

export default function KeywordsPage() {
  const t = useT();
  const router = useRouter();
  const { updateConfig } = useAppStore();
  const [query, setQuery] = useState('');
  const [phase, setPhase] = useState<Phase>('empty');
  const [rows, setRows] = useState<KeywordInsight[]>([]);
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'opportunityScore', dir: 'desc' });
  const [sel, setSel] = useState<KeywordInsight | null>(null);
  const [progress, setProgress] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastQ = useRef('');

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSel(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const run = async (q: string) => {
    const query2 = (q || query).trim();
    if (!query2) return;
    setQuery(query2);
    lastQ.current = query2;
    setPhase('loading');
    setProgress(0);
    setSel(null);
    if (timer.current) clearInterval(timer.current);
    const started = performance.now();
    timer.current = setInterval(() => setProgress(Math.min(96, ((performance.now() - started) / 12000) * 100)), 120);
    try {
      const res = await axios.post<InsightsResponse>('/api/keywords/insights', { mode: 'topic', query: query2, contentFilter: 'all', maxAssets: 500, useGlobalCompetition: true });
      if (timer.current) clearInterval(timer.current);
      if (res.data.success && res.data.keywords) {
        setRows(res.data.keywords);
        setPhase('results');
      } else setPhase('error');
    } catch {
      if (timer.current) clearInterval(timer.current);
      setPhase('error');
    }
  };

  // deep-link: /keywords?q=&mode=
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const q = sp.get('q')?.trim();
    if (q) run(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = useMemo(() => {
    const arr = [...rows];
    const m = sort.dir === 'desc' ? -1 : 1;
    arr.sort((a, b) => {
      let av: number | string, bv: number | string;
      if (sort.key === 'competition') { av = COMP_ORDER[a.competition]; bv = COMP_ORDER[b.competition]; }
      else { av = a[sort.key]; bv = b[sort.key]; }
      return (av > bv ? 1 : av < bv ? -1 : 0) * m;
    });
    return arr;
  }, [rows, sort]);

  const setS = (key: SortKey) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }));
  const ind = (key: SortKey) => <span className="sort-ind">{sort.key === key ? (sort.dir === 'desc' ? '▼' : '▲') : '↕'}</span>;

  const scatterData = rows.map((r) => ({ kw: r.keyword, comp: COMP01[r.competition], demand: r.avgDownloads, opp: r.opportunityScore }));
  const barData = [...rows].sort((a, b) => b.opportunityScore - a.opportunityScore).slice(0, 6).map((r) => ({ kw: r.keyword, opp: r.opportunityScore }));

  const cols: { key: SortKey; label: string; align: 'left' | 'right' }[] = [
    { key: 'keyword', label: t('kw_col_kw'), align: 'left' },
    { key: 'avgDownloads', label: t('kw_col_demand'), align: 'right' },
    { key: 'assetCount', label: t('kw_col_supply'), align: 'right' },
    { key: 'competition', label: t('kw_col_comp'), align: 'left' },
    { key: 'opportunityScore', label: t('kw_col_score'), align: 'left' },
  ];

  const generateFromKeyword = (kw: string) => {
    updateConfig({ url: `https://stock.adobe.com/search?k=${encodeURIComponent(kw)}` });
    router.push('/generate');
  };

  return (
    <main className="app">
      <div className="bg-aura" />
      <Header />
      <div className="page-wrap anim-up">
        <div className="page-head">
          <h1>{t('kw_title')}</h1>
          <p>{t('kw_sub')}</p>
        </div>

        <div className="row" style={{ gap: 10, marginBottom: 22, maxWidth: 560 }}>
          <div className="input-with-icon" style={{ flex: 1 }}>
            <Compass />
            <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('kw_search_ph')} onKeyDown={(e) => { if (e.key === 'Enter') run(query); }} />
          </div>
          <button className="btn btn-primary" onClick={() => run(query || 'minimalist')}><Search /> {t('kw_find')}</button>
        </div>

        {phase === 'empty' && (
          <div className="card anim-up">
            <div className="state-box">
              <div className="state-icon"><Target /></div>
              <h3>{t('empty_title')}</h3>
              <p>{t('empty_desc')}</p>
              <div className="row wrap" style={{ gap: 8, marginTop: 6, justifyContent: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--label-fg)', alignSelf: 'center' }}>{t('empty_try')}</span>
                {['minimalist', 'business', 'watercolor', 'aerial'].map((q) => (
                  <button key={q} className="chip" onClick={() => run(q)}>{q}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {phase === 'loading' && (
          <div className="stack" style={{ gap: 18 }}>
            <div className="card">
              <div className="row spread" style={{ marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{t('loading_title')}</span>
                <span className="num" style={{ fontSize: 13, color: 'var(--accent)' }}>{Math.round(progress)}%</span>
              </div>
              <div className="progress"><span style={{ width: progress + '%' }} /></div>
            </div>
            <div className="grid two-col">
              <div className="card" style={{ height: 320 }}><div className="skel" style={{ width: '100%', height: '100%' }} /></div>
              <div className="card" style={{ height: 320 }}><div className="skel" style={{ width: '100%', height: '100%' }} /></div>
            </div>
          </div>
        )}

        {phase === 'error' && (
          <div className="card anim-up">
            <div className="state-box">
              <div className="state-icon" style={{ background: 'var(--error-15)', borderColor: 'transparent', color: 'var(--error)' }}><AlertTriangle /></div>
              <h3>{t('err_title')}</h3>
              <p>{t('err_desc')}</p>
              <button className="btn btn-ghost" onClick={() => run(lastQ.current)}><RefreshCw /> {t('err_retry')}</button>
            </div>
          </div>
        )}

        {phase === 'results' && rows.length > 0 && (
          <>
            <div className="grid two-col" style={{ alignItems: 'start', marginBottom: 18 }}>
              <div className="card anim-up">
                <div className="card-head"><span className="icon-badge tint-gold"><Target /></span><span className="ttl">{t('kw_scatter')}</span></div>
                <OppScatter data={scatterData} onPick={(d) => setSel(rows.find((r) => r.keyword === d.kw) || null)} />
              </div>
              <div className="card anim-up">
                <div className="card-head"><span className="icon-badge"><Zap /></span><span className="ttl">{t('kw_top')}</span></div>
                <OppBars data={barData} onPick={(d) => setSel(rows.find((r) => r.keyword === d.kw) || null)} />
              </div>
            </div>

            <div className="card anim-up" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="card-head" style={{ padding: '16px 20px', marginBottom: 0 }}>
                <span className="icon-badge"><Filter /></span>
                <span className="ttl">{t('kw_table')}</span>
                <span className="sub">{rows.length} keyword</span>
              </div>
              <div className="table-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}>#</th>
                      {cols.map((c) => (
                        <th key={c.key} onClick={() => setS(c.key)} className={sort.key === c.key ? 'sorted' : ''} style={{ textAlign: c.align }}>
                          {c.label}{ind(c.key)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((r, i) => {
                      const top3 = sort.key === 'opportunityScore' && sort.dir === 'desc' && i < 3;
                      const gold = r.opportunityScore >= 80;
                      return (
                        <tr key={r.keyword} className={sel?.keyword === r.keyword ? 'active' : ''} onClick={() => setSel(r)}>
                          <td><span className={'rank' + (top3 ? ' gold' : '')}>{i + 1}</span></td>
                          <td><span style={{ fontWeight: 500 }}>{r.keyword}</span></td>
                          <td className="num" style={{ textAlign: 'right' }}>{fmt(r.avgDownloads)}</td>
                          <td className="num" style={{ textAlign: 'right', color: 'var(--label-fg)' }}>{fmt(r.assetCount)}</td>
                          <td><Badge level={r.competition} t={t} /></td>
                          <td>
                            <div className="row" style={{ gap: 10 }}>
                              <div className={'scorebar' + (gold ? ' gold' : '')}><span style={{ width: r.opportunityScore + '%' }} /></div>
                              <span className="num" style={{ fontSize: 13, fontWeight: 700, color: gold ? 'var(--gold)' : 'var(--fg)', width: 26 }}>{r.opportunityScore}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
      <Footer />

      {sel && (
        <>
          <div className="drawer-overlay" onClick={() => setSel(null)} />
          <aside className="drawer" role="dialog" aria-label={sel.keyword}>
            <div className="drawer-head">
              <div className="stack" style={{ gap: 6, flex: 1 }}>
                <span className="display" style={{ fontSize: 19, fontWeight: 600 }}>{sel.keyword}</span>
                <Badge level={sel.competition} t={t} />
              </div>
              <button className="drawer-close" onClick={() => setSel(null)} aria-label="Close"><X /></button>
            </div>
            <div className="drawer-body">
              <div className="row" style={{ justifyContent: 'center', gap: 20, padding: '4px 0 8px' }}>
                <ScoreRing value={sel.opportunityScore} label={t('detail_score')} gold={sel.opportunityScore >= 80} />
              </div>
              <div className="metric-2x2">
                <div className="metric-cell"><div className="mc-label">{t('detail_demand')}</div><div className="mc-val">{fmt(sel.avgDownloads)}</div></div>
                <div className="metric-cell"><div className="mc-label">{t('detail_local')}</div><div className="mc-val">{fmt(sel.assetCount)}</div></div>
                <div className="metric-cell"><div className="mc-label">{t('detail_global')}</div><div className="mc-val" style={{ color: 'var(--gold)' }}>{sel.globalCount ? fmt(sel.globalCount) : '—'}</div></div>
                <div className="metric-cell"><div className="mc-label">{t('detail_total')}</div><div className="mc-val">{fmt(sel.totalDownloads)}</div></div>
              </div>
              {sel.sampleAssets.length > 0 && (
                <div className="stack" style={{ gap: 9 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--label-fg)' }}>{t('detail_samples')}</span>
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {sel.sampleAssets.map((s) => (
                      <a key={s.id} href={`https://stock.adobe.com/${s.id}`} target="_blank" rel="noreferrer" style={{ display: 'block' }}>
                        <div className="thumb lift" style={{ aspectRatio: '1 / 1' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img className="ph" src={s.thumbnail_240_url} alt="" loading="lazy" style={{ objectFit: 'cover' }} />
                          <span className="ext-badge"><ExternalLink style={{ width: 12, height: 12 }} /></span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              <button className="btn btn-primary btn-lg btn-block" onClick={() => generateFromKeyword(sel.keyword)}>
                <Sparkles /> {t('detail_cta')}
              </button>
            </div>
          </aside>
        </>
      )}
    </main>
  );
}
