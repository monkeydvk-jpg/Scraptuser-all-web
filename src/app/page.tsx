'use client';

import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { saveAs } from 'file-saver';
import { Search, Zap, Sparkles, Play, Square, Download, RefreshCw, Dice5, Copy, Check, FileText, Table } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useT } from '@/lib/useT';

const OPT_KEYS = [
  'includePrefix', 'includeSuffix', 'includeDate', 'includeParams',
  'includeAspectRatio', 'toLowerCase', 'addEmptyLine',
] as const;

interface ScrapeStats {
  totalPages: number;
  successfulPages: number;
  failedPages: number;
  totalPrompts: number;
  processingTime?: string;
}

export default function GeneratePage() {
  const t = useT();
  const { config, updateConfig, generateRandomPrefix, isScrapingActive, setScrapingActive, progress, setProgress, previewText } = useAppStore();
  const [scraped, setScraped] = useState<string[] | null>(null);
  const [stats, setStats] = useState<ScrapeStats | null>(null);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // keep <body> background handled globally by ThemeApplier; nothing needed here

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setScrapingActive(false);
    setProgress({ currentPage: 0, totalPages: 0, prompts: 0, status: 'idle', message: t('gen_stopped'), percentage: 0 });
    toast(t('gen_stopped'));
  };

  const run = async () => {
    if (isScrapingActive) return;
    if (!config.url.trim() || !config.url.includes('stock.adobe.com')) {
      toast.error(t('err_title'));
      return;
    }
    if (config.startPage > config.endPage) {
      toast.error('Start > End');
      return;
    }
    setScrapingActive(true);
    setScraped(null);
    setStats(null);
    const totalPages = config.endPage - config.startPage + 1;
    setProgress({ currentPage: 0, totalPages, prompts: 0, status: 'scraping', message: t('gen_running'), percentage: 0 });
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await axios.post('/api/scrape', {
        url: config.url,
        startPage: config.startPage,
        endPage: config.endPage,
        config: {
          includePrefix: config.includePrefix, includeSuffix: config.includeSuffix, includeDate: config.includeDate,
          includeParams: config.includeParams, includeAspectRatio: config.includeAspectRatio, toLowerCase: config.toLowerCase,
          addEmptyLine: config.addEmptyLine, prefix: config.prefix, suffix: config.suffix,
          aspectRatio: config.aspectRatio, additionalParams: config.additionalParams,
        },
      }, { signal: controller.signal });
      if (res.data.success) {
        setScraped(res.data.prompts);
        setStats(res.data.stats);
        setProgress({ currentPage: totalPages, totalPages, prompts: res.data.prompts.length, status: 'complete', message: '', percentage: 100 });
        toast.success(`${res.data.prompts.length} prompts`);
      } else {
        throw new Error(res.data.error || 'failed');
      }
    } catch (err) {
      if (axios.isCancel(err) || (err instanceof Error && err.name === 'CanceledError')) return; // stopped by user
      const msg = axios.isAxiosError(err) ? err.response?.data?.error || err.message : 'failed';
      setProgress({ currentPage: 0, totalPages, prompts: 0, status: 'error', message: msg, percentage: 0 });
      toast.error(msg);
    } finally {
      abortRef.current = null;
      setScrapingActive(false);
    }
  };

  const exportName = (ext: string) => {
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    return `${config.filename || 'prompts'}_${ts}.${ext}`;
  };
  const download = () => {
    if (!scraped?.length) return;
    saveAs(new Blob([scraped.join('\n')], { type: 'text/plain;charset=utf-8' }), exportName('txt'));
    toast.success(t('gen_download'));
  };
  const downloadCsv = () => {
    if (!scraped?.length) return;
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = [['index', 'prompt'], ...scraped.filter((p) => p.trim()).map((p, i) => [i + 1, p])];
    const csv = '﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n');
    saveAs(new Blob([csv], { type: 'text/csv;charset=utf-8' }), exportName('csv'));
    toast.success('CSV');
  };

  const copyAll = () => {
    if (!scraped?.length) return;
    navigator.clipboard?.writeText(scraped.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const successRate = stats && stats.totalPages > 0 ? Math.round((stats.successfulPages / stats.totalPages) * 100) : 0;
  const kpis = stats
    ? [
        { icon: Sparkles, val: String(stats.totalPrompts), label: t('gen_prompts'), tint: '' },
        { icon: Zap, val: String(stats.totalPages), label: t('gen_pages_done'), tint: '' },
        { icon: Check, val: String(stats.successfulPages), label: t('stats_total_pages'), tint: 'tint-success' },
        { icon: RefreshCw, val: successRate + '%', label: t('gen_rate'), tint: 'tint-warning' },
      ]
    : [];

  const previewLines = scraped && scraped.length ? scraped.slice(0, 12) : previewText ? [previewText] : [];

  return (
    <main className="app">
      <div className="bg-aura" />
      <Header />
      <div className="page-wrap anim-up">
        <div className="page-head">
          <h1>{t('gen_title')}</h1>
          <p>{t('gen_sub')}</p>
        </div>

        <div className="grid two-col" style={{ alignItems: 'start' }}>
          {/* form */}
          <div className="card stagger">
            <div className="card-head">
              <span className="icon-badge"><Zap /></span>
              <span className="ttl">{t('url_config')}</span>
            </div>

            <div className="field" style={{ marginBottom: 16 }}>
              <label>{t('url_label')}</label>
              <div className="input-with-icon">
                <Search />
                <input className="input input-mono" value={config.url} onChange={(e) => updateConfig({ url: e.target.value })} placeholder={t('url_ph')} />
              </div>
            </div>

            <div className="row" style={{ gap: 14, marginBottom: 16, alignItems: 'flex-end' }}>
              <div className="field" style={{ flex: '0 0 130px' }}>
                <label>{t('start_page')}</label>
                <input className="input input-mono" type="number" min={1} value={config.startPage} onChange={(e) => updateConfig({ startPage: parseInt(e.target.value) || 1 })} />
              </div>
              <div className="field" style={{ flex: '0 0 130px' }}>
                <label>{t('end_page')}</label>
                <input className="input input-mono" type="number" min={1} value={config.endPage} onChange={(e) => updateConfig({ endPage: parseInt(e.target.value) || 1 })} />
              </div>
            </div>

            <div className="field" style={{ marginBottom: 16 }}>
              <label>{t('format_settings')}</label>
              <div className="row wrap" style={{ gap: 8 }}>
                {OPT_KEYS.map((k) => {
                  const on = config[k] as boolean;
                  return (
                    <button key={k} className={'chip' + (on ? ' sel' : '')} aria-pressed={on} onClick={() => updateConfig({ [k]: !on })}>
                      {on && <Check style={{ width: 13, height: 13 }} />} {t(`opt_${k}`)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="row" style={{ gap: 10, marginBottom: 12, alignItems: 'flex-end' }}>
              <div className="field" style={{ flex: 1 }}>
                <label>{t('f_prefix')}</label>
                <input className="input input-mono" value={config.prefix} onChange={(e) => updateConfig({ prefix: e.target.value })} placeholder={t('f_prefix_ph')} />
              </div>
              <button className="btn btn-ghost" onClick={generateRandomPrefix} aria-label={t('f_generate')}>
                <Dice5 /> {t('f_generate')}
              </button>
            </div>
            <div className="row wrap" style={{ gap: 10, marginBottom: 18 }}>
              <div className="field" style={{ flex: '1 1 140px' }}>
                <label>{t('f_suffix')}</label>
                <input className="input input-mono" value={config.suffix} onChange={(e) => updateConfig({ suffix: e.target.value })} placeholder={t('f_suffix_ph')} />
              </div>
              <div className="field" style={{ flex: '1 1 100px' }}>
                <label>{t('f_aspect')}</label>
                <input className="input input-mono" value={config.aspectRatio} onChange={(e) => updateConfig({ aspectRatio: e.target.value })} placeholder={t('f_aspect_ph')} />
              </div>
              <div className="field" style={{ flex: '1 1 180px' }}>
                <label>{t('f_params')}</label>
                <input className="input input-mono" value={config.additionalParams} onChange={(e) => updateConfig({ additionalParams: e.target.value })} placeholder={t('f_params_ph')} />
              </div>
            </div>

            {isScrapingActive ? (
              <div className="stack" style={{ gap: 10 }}>
                <div className="row spread" style={{ fontSize: 12.5, color: 'var(--label-fg)' }}>
                  <span>{t('gen_running')}</span>
                  <span className="num">{progress.percentage ? Math.round(progress.percentage) : 0}%</span>
                </div>
                <div className="progress"><span style={{ width: `${progress.percentage}%` }} /></div>
                <button className="btn btn-ghost btn-block" onClick={stop} style={{ color: 'var(--error)' }}>
                  <Square /> {t('gen_stop')}
                </button>
              </div>
            ) : (
              <button className="btn btn-primary btn-lg btn-block" onClick={run}>
                <Play /> {t('gen_run')}
              </button>
            )}
          </div>

          {/* preview */}
          <div className="card" style={{ minHeight: 360 }}>
            <div className="card-head">
              <span className="icon-badge tint-gold"><Sparkles /></span>
              <span className="ttl">{t('gen_preview')}</span>
              {scraped && scraped.length > 0 && (
                <div className="row" style={{ marginLeft: 'auto', gap: 8 }}>
                  <button className="btn btn-ghost" style={{ padding: '7px 12px', fontSize: 12.5 }} onClick={copyAll}>
                    {copied ? <Check /> : <Copy />}
                  </button>
                  <button className="btn btn-ghost" style={{ padding: '7px 12px', fontSize: 12.5 }} onClick={download}>
                    <FileText /> TXT
                  </button>
                  <button className="btn btn-ghost" style={{ padding: '7px 12px', fontSize: 12.5 }} onClick={downloadCsv}>
                    <Table /> CSV
                  </button>
                </div>
              )}
            </div>
            {previewLines.length === 0 ? (
              <p style={{ color: 'var(--label-fg)', fontSize: 13.5 }}>{t('gen_empty_preview')}</p>
            ) : (
              <div className="stack" style={{ gap: 9, fontFamily: 'var(--font-mono)', fontSize: 12.5, lineHeight: 1.45 }}>
                {previewLines.map((p, i) => (
                  <div key={i} className="anim-up" style={{ padding: '10px 12px', borderRadius: 9, background: 'var(--entry-glass)', border: '1px solid var(--border-soft)', color: 'var(--fg)', animationDelay: i * 0.04 + 's' }}>
                    <span style={{ color: 'var(--accent)', marginRight: 8 }}>{String(i + 1).padStart(2, '0')}</span>
                    {p}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* stats */}
        {stats && (
          <div className="grid kpi-grid stagger" style={{ marginTop: 18 }}>
            {kpis.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="card kpi lift anim-up" style={{ animationDelay: i * 0.05 + 's' }}>
                  <div className="kpi-top">
                    <span className={'icon-badge ' + s.tint}><Icon /></span>
                  </div>
                  <div className="kpi-val">{s.val}</div>
                  <div className="kpi-label">{s.label}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
