'use client';

import { Eye, Plus, Trash2, AlertTriangle, Clock, ExternalLink } from 'lucide-react';
import { useT } from '@/lib/useT';
import type { WatchlistGrowthRow, PendingContributor } from '@/lib/watchlist';
import { addContributor, removeContributor } from './actions';

const NF = new Intl.NumberFormat('vi-VN');

/** Growth cell: ▲ +N green (positive), ▼ N red (negative), "—" when null (insufficient data). */
function Growth({ value }: { value: number | null }) {
  if (value === null || value === undefined) {
    return <span style={{ color: 'var(--label-fg)' }}>—</span>;
  }
  if (value > 0) {
    return (
      <span className="num" style={{ color: 'var(--success)', fontWeight: 600 }}>
        ▲ +{NF.format(value)}
      </span>
    );
  }
  if (value < 0) {
    return (
      <span className="num" style={{ color: 'var(--error)', fontWeight: 600 }}>
        ▼ {NF.format(Math.abs(value))}
      </span>
    );
  }
  return (
    <span className="num" style={{ color: 'var(--label-fg)' }}>
      0
    </span>
  );
}

interface Props {
  rows: WatchlistGrowthRow[];
  pending: PendingContributor[];
  /** null = ok; 'config' = env missing; otherwise a raw error message. */
  errorMsg: string | null;
}

export function WatchlistClient({ rows, pending, errorMsg }: Props) {
  const t = useT();
  const contributorUrl = (id: string) => `https://stock.adobe.com/search?creator_id=${encodeURIComponent(id)}`;

  return (
    <div className="page-wrap anim-up">
      <div className="page-head">
        <h1>{t('wl_title')}</h1>
        <p>{t('wl_sub')}</p>
      </div>

      {/* Add contributor */}
      <div className="card anim-up" style={{ marginBottom: 18 }}>
        <div className="card-head">
          <span className="icon-badge">
            <Plus />
          </span>
          <span className="ttl">{t('wl_add_title')}</span>
        </div>
        <form action={addContributor} className="row wrap" style={{ gap: 10 }}>
          <input
            className="input"
            name="contributor_id"
            required
            placeholder={t('wl_add_id_ph')}
            aria-label={t('wl_add_id_ph')}
            style={{ flex: '1 1 200px', minWidth: 160 }}
          />
          <input
            className="input"
            name="contributor_name"
            placeholder={t('wl_add_name_ph')}
            aria-label={t('wl_add_name_ph')}
            style={{ flex: '1 1 200px', minWidth: 160 }}
          />
          <button type="submit" className="btn btn-primary">
            <Plus /> {t('wl_add_btn')}
          </button>
        </form>
      </div>

      {/* Error / config states */}
      {errorMsg && (
        <div className="card anim-up">
          <div className="state-box">
            <div
              className="state-icon"
              style={{ background: 'var(--error-15)', borderColor: 'transparent', color: 'var(--error)' }}
            >
              <AlertTriangle />
            </div>
            <h3>{t('wl_error_title')}</h3>
            <p>{errorMsg === 'config' ? t('wl_error_config') : t('wl_error_generic')}</p>
            {errorMsg !== 'config' && (
              <p className="mono" style={{ fontSize: 12, color: 'var(--label-fg)', wordBreak: 'break-word' }}>
                {errorMsg}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Empty state (no data at all) */}
      {!errorMsg && rows.length === 0 && pending.length === 0 && (
        <div className="card anim-up">
          <div className="state-box">
            <div className="state-icon">
              <Eye />
            </div>
            <h3>{t('wl_empty_title')}</h3>
            <p>{t('wl_empty_desc')}</p>
          </div>
        </div>
      )}

      {/* Growth table */}
      {!errorMsg && rows.length > 0 && (
        <div className="card anim-up" style={{ padding: 0, overflow: 'hidden', marginBottom: 18 }}>
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>{t('wl_col_contributor')}</th>
                  <th style={{ textAlign: 'right' }}>{t('wl_col_assets')}</th>
                  <th style={{ textAlign: 'right' }}>{t('wl_col_downloads')}</th>
                  <th style={{ textAlign: 'right' }}>{t('wl_col_today')}</th>
                  <th style={{ textAlign: 'right' }}>{t('wl_col_week')}</th>
                  <th style={{ width: 44 }} aria-label="actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.contributor_id} style={{ cursor: 'default' }}>
                    <td>
                      <div className="stack" style={{ gap: 3 }}>
                        <a
                          href={contributorUrl(r.contributor_id)}
                          target="_blank"
                          rel="noreferrer"
                          className="row"
                          style={{ gap: 5, fontWeight: 600, color: 'var(--fg)', textDecoration: 'none', width: 'fit-content' }}
                        >
                          {r.contributor_name || r.contributor_id}
                          <ExternalLink style={{ width: 12, height: 12, color: 'var(--label-fg)' }} />
                        </a>
                        <span className="num" style={{ fontSize: 11.5, color: 'var(--label-fg)' }}>
                          #{r.contributor_id} · {t('wl_snapshot')} {r.last_snapshot}
                        </span>
                      </div>
                    </td>
                    <td className="num" style={{ textAlign: 'right' }}>{NF.format(r.total_assets)}</td>
                    <td className="num" style={{ textAlign: 'right' }}>{NF.format(r.total_downloads)}</td>
                    <td style={{ textAlign: 'right' }}><Growth value={r.growth_today} /></td>
                    <td style={{ textAlign: 'right' }}><Growth value={r.growth_week} /></td>
                    <td style={{ textAlign: 'right' }}>
                      <form action={removeContributor}>
                        <input type="hidden" name="contributor_id" value={r.contributor_id} />
                        <button
                          type="submit"
                          className="btn btn-ghost"
                          title={t('wl_remove')}
                          aria-label={`${t('wl_remove')} ${r.contributor_name || r.contributor_id}`}
                          style={{ padding: '6px 8px' }}
                        >
                          <Trash2 style={{ width: 15, height: 15 }} />
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pending: added but no snapshot yet */}
      {!errorMsg && pending.length > 0 && (
        <div className="card anim-up">
          <div className="card-head">
            <span className="icon-badge tint-warning">
              <Clock />
            </span>
            <span className="ttl">{t('wl_pending_title')}</span>
            <span className="sub">{pending.length}</span>
          </div>
          <p style={{ margin: '0 0 12px', color: 'var(--label-fg)', fontSize: 13.5, lineHeight: 1.5 }}>
            {t('wl_pending_desc')}
          </p>
          <div className="stack" style={{ gap: 8 }}>
            {pending.map((p) => (
              <div key={p.contributor_id} className="row spread" style={{ gap: 10 }}>
                <div className="row" style={{ gap: 8 }}>
                  <span style={{ fontWeight: 600 }}>{p.contributor_name || p.contributor_id}</span>
                  <span className="num" style={{ fontSize: 11.5, color: 'var(--label-fg)' }}>
                    #{p.contributor_id}
                  </span>
                </div>
                <form action={removeContributor}>
                  <input type="hidden" name="contributor_id" value={p.contributor_id} />
                  <button
                    type="submit"
                    className="btn btn-ghost"
                    title={t('wl_remove')}
                    aria-label={`${t('wl_remove')} ${p.contributor_name || p.contributor_id}`}
                    style={{ padding: '6px 8px' }}
                  >
                    <Trash2 style={{ width: 15, height: 15 }} />
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
