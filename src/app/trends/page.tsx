'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { Flame, Zap, Clock, RefreshCw, Download, ExternalLink } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useT } from '@/lib/useT';
import { fmt } from '@/lib/keywordsUi';
import type { KeywordStat, MoverAsset } from '@/lib/portfolioStats';

const TOPICS: { label: string; q: string }[] = [
  { label: 'All', q: 'background' },
  { label: 'Business', q: 'business' },
  { label: 'Nature', q: 'nature' },
  { label: 'Technology', q: 'technology' },
  { label: 'Lifestyle', q: 'lifestyle' },
  { label: 'Food', q: 'food' },
  { label: 'Travel', q: 'travel' },
];
const REFRESH_MS = 60 * 60 * 1000;

interface TrendsData { success: boolean; topKeywords?: KeywordStat[]; topMovers?: MoverAsset[] }

export default function TrendsPage() {
  const t = useT();
  const [topic, setTopic] = useState(TOPICS[0]);
  const [data, setData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [, setTick] = useState(0);
  const reqId = useRef(0);

  const load = useCallback(async (q: string) => {
    const id = ++reqId.current;
    setLoading(true);
    try {
      const res = await axios.post<TrendsData>('/api/trends', { topic: q, maxAssets: 400 });
      if (id !== reqId.current) return;
      setData(res.data);
      setUpdatedAt(Date.now());
    } catch {
      if (id === reqId.current) setData({ success: false });
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, []);

  useEffect(() => { load(topic.q); }, [topic, load]);
  useEffect(() => {
    const iv = setInterval(() => load(topic.q), REFRESH_MS);
    return () => clearInterval(iv);
  }, [topic, load]);
  useEffect(() => {
    const iv = setInterval(() => setTick((x) => x + 1), 30000);
    return () => clearInterval(iv);
  }, []);

  const agoMin = updatedAt ? Math.floor((Date.now() - updatedAt) / 60000) : 0;
  const agoLabel = !updatedAt ? '—' : agoMin <= 0 ? t('tr_just_now') : `${agoMin} ${t('tr_ago')}`;

  const keywords = data?.topKeywords ?? [];
  const maxDl = Math.max(...keywords.map((k) => k.downloads), 1);
  const movers = data?.topMovers ?? [];

  return (
    <main className="app">
      <div className="bg-aura" />
      <Header />
      <div className="page-wrap anim-up">
        <div className="row spread wrap" style={{ gap: 16, marginBottom: 18, alignItems: 'flex-end' }}>
          <div className="page-head" style={{ marginBottom: 0 }}>
            <h1>{t('tr_title')}</h1>
            <p>{t('tr_sub')}</p>
          </div>
          <div className="row" style={{ gap: 12 }}>
            <span className="row" style={{ gap: 6, fontSize: 12.5, color: 'var(--label-fg)' }}>
              <Clock style={{ width: 14, height: 14 }} /> {t('tr_updated')} {agoLabel}
            </span>
            <button className={'btn btn-ghost' + (loading ? ' spinning' : '')} onClick={() => load(topic.q)} disabled={loading}>
              <RefreshCw className={loading ? 'spin' : ''} /> {t('tr_refresh')}
            </button>
          </div>
        </div>

        {/* topic pills */}
        <div className="row wrap" style={{ gap: 8, marginBottom: 20 }}>
          {TOPICS.map((tp) => (
            <button key={tp.label} className={'pill' + (topic.label === tp.label ? ' active' : '')} onClick={() => setTopic(tp)}>
              {tp.label}
            </button>
          ))}
        </div>

        <div className="grid two-col" style={{ alignItems: 'start' }}>
          {/* hot keywords */}
          <div className="card anim-up">
            <div className="card-head">
              <span className="icon-badge tint-warning"><Flame /></span>
              <span className="ttl">{t('tr_hot_kw')}</span>
              <span className="sub">{keywords.length}</span>
            </div>
            {loading && keywords.length === 0 ? (
              <div className="stack" style={{ gap: 8 }}>
                {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skel" style={{ height: 38, width: '100%' }} />)}
              </div>
            ) : (
              <div className="stack" style={{ gap: 4 }}>
                {keywords.slice(0, 14).map((k, i) => (
                  <Link
                    key={k.keyword}
                    href={`/keywords?mode=topic&q=${encodeURIComponent(k.keyword)}`}
                    className="opp-row row"
                    style={{ gap: 12, padding: '9px 6px', textDecoration: 'none', color: 'inherit' }}
                  >
                    <span className={'rank' + (i < 3 ? ' gold' : '')}>{i + 1}</span>
                    <div className="stack" style={{ flex: 1, gap: 6, minWidth: 0 }}>
                      <div className="row spread" style={{ gap: 8 }}>
                        <span style={{ fontWeight: 500, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.keyword}</span>
                        <span className="num" style={{ fontSize: 12, color: 'var(--label-fg)', flex: 'none' }}>{fmt(k.downloads)}</span>
                      </div>
                      <div className="opp-track" style={{ height: 6 }}>
                        <span style={{ display: 'block', height: '100%', borderRadius: 999, width: (k.downloads / maxDl) * 100 + '%', background: 'linear-gradient(90deg, var(--warning), var(--gold))' }} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* hot assets */}
          <div className="card anim-up">
            <div className="card-head">
              <span className="icon-badge tint-success"><Zap /></span>
              <span className="ttl">{t('tr_hot_assets')}</span>
              <span className="sub">{t('tr_rising')}</span>
            </div>
            {loading && movers.length === 0 ? (
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))', gap: 12 }}>
                {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skel" style={{ aspectRatio: '1/1' }} />)}
              </div>
            ) : (
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))', gap: 12 }}>
                {movers.map((a) => (
                  <a key={a.id} href={`https://stock.adobe.com/${a.id}`} target="_blank" rel="noreferrer" className="stack" style={{ gap: 8, textDecoration: 'none', color: 'inherit' }}>
                    <div className="thumb lift" style={{ aspectRatio: '1 / 1' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className="ph" src={a.thumbnail_240_url} alt="" loading="lazy" style={{ objectFit: 'cover' }} />
                      <span className="ext-badge"><ExternalLink style={{ width: 12, height: 12 }} /></span>
                      <span className="vel-badge">{fmt(a.velocity)}/mo</span>
                    </div>
                    <span style={{ fontSize: 12, lineHeight: 1.3 }}>{a.title.slice(0, 50) || '—'}</span>
                    <span className="num" style={{ fontSize: 11.5, color: 'var(--label-fg)' }}>
                      <Download style={{ width: 11, height: 11, verticalAlign: -1, marginRight: 3 }} />{fmt(a.nb_downloads)}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
