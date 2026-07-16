'use client';

import { Image as ImageIcon, Plus, Trash2, AlertTriangle, Clock, ExternalLink } from 'lucide-react';
import { useT } from '@/lib/useT';
import type { AssetGrowthRow, PendingAsset } from '@/lib/assetWatchlist';
import { addAsset, removeAsset } from './actions';

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

/** Small rounded thumbnail with a neutral fallback when Adobe has no preview. */
function Thumb({ url, alt }: { url: string | null; alt: string }) {
  if (!url) {
    return (
      <span
        className="row"
        style={{
          width: 44,
          height: 44,
          borderRadius: 8,
          flex: 'none',
          background: 'var(--frame-bg, rgba(127,127,127,.12))',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-hidden="true"
      >
        <ImageIcon style={{ width: 18, height: 18, color: 'var(--label-fg)' }} />
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={url}
      alt={alt}
      width={44}
      height={44}
      style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flex: 'none' }}
    />
  );
}

interface Props {
  rows: AssetGrowthRow[];
  pending: PendingAsset[];
  /** null = ok; 'config' = env missing; otherwise a raw error message. */
  errorMsg: string | null;
}

export function AssetsClient({ rows, pending, errorMsg }: Props) {
  const t = useT();
  const assetUrl = (id: string) => `https://stock.adobe.com/images/id/${encodeURIComponent(id)}`;
  const displayName = (a: { memo_name: string | null; asset_title: string | null; asset_id: string }) =>
    a.memo_name || a.asset_title || a.asset_id;

  return (
    <div className="page-wrap anim-up">
      <div className="page-head">
        <h1>{t('as_title')}</h1>
        <p>{t('as_sub')}</p>
      </div>

      {/* Add asset */}
      <div className="card anim-up" style={{ marginBottom: 18 }}>
        <div className="card-head">
          <span className="icon-badge">
            <Plus />
          </span>
          <span className="ttl">{t('as_add_title')}</span>
        </div>
        <form action={addAsset} className="row wrap" style={{ gap: 10 }}>
          <input
            className="input"
            name="asset_id"
            required
            inputMode="numeric"
            pattern="\d+"
            placeholder={t('as_add_id_ph')}
            aria-label={t('as_add_id_ph')}
            style={{ flex: '1 1 200px', minWidth: 160 }}
          />
          <input
            className="input"
            name="memo_name"
            placeholder={t('as_add_name_ph')}
            aria-label={t('as_add_name_ph')}
            style={{ flex: '1 1 200px', minWidth: 160 }}
          />
          <button type="submit" className="btn btn-primary">
            <Plus /> {t('as_add_btn')}
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
            <h3>{t('as_error_title')}</h3>
            <p>{errorMsg === 'config' ? t('as_error_config') : t('as_error_generic')}</p>
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
              <ImageIcon />
            </div>
            <h3>{t('as_empty_title')}</h3>
            <p>{t('as_empty_desc')}</p>
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
                  <th style={{ textAlign: 'left' }}>{t('as_col_asset')}</th>
                  <th style={{ textAlign: 'right' }}>{t('as_col_downloads')}</th>
                  <th style={{ textAlign: 'right' }}>{t('as_col_today')}</th>
                  <th style={{ textAlign: 'right' }}>{t('as_col_week')}</th>
                  <th style={{ width: 44 }} aria-label="actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.asset_id} style={{ cursor: 'default' }}>
                    <td>
                      <div className="row" style={{ gap: 10 }}>
                        <Thumb url={r.thumbnail_url} alt={displayName(r)} />
                        <div className="stack" style={{ gap: 3 }}>
                          <a
                            href={assetUrl(r.asset_id)}
                            target="_blank"
                            rel="noreferrer"
                            className="row"
                            style={{ gap: 5, fontWeight: 600, color: 'var(--fg)', textDecoration: 'none', width: 'fit-content' }}
                          >
                            {displayName(r)}
                            <ExternalLink style={{ width: 12, height: 12, color: 'var(--label-fg)' }} />
                          </a>
                          <span className="num" style={{ fontSize: 11.5, color: 'var(--label-fg)' }}>
                            #{r.asset_id} · {t('as_snapshot')} {r.last_snapshot}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="num" style={{ textAlign: 'right' }}>{NF.format(r.downloads)}</td>
                    <td style={{ textAlign: 'right' }}><Growth value={r.growth_today} /></td>
                    <td style={{ textAlign: 'right' }}><Growth value={r.growth_week} /></td>
                    <td style={{ textAlign: 'right' }}>
                      <form action={removeAsset}>
                        <input type="hidden" name="asset_id" value={r.asset_id} />
                        <button
                          type="submit"
                          className="btn btn-ghost"
                          title={t('as_remove')}
                          aria-label={`${t('as_remove')} ${displayName(r)}`}
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
            <span className="ttl">{t('as_pending_title')}</span>
            <span className="sub">{pending.length}</span>
          </div>
          <p style={{ margin: '0 0 12px', color: 'var(--label-fg)', fontSize: 13.5, lineHeight: 1.5 }}>
            {t('as_pending_desc')}
          </p>
          <div className="stack" style={{ gap: 8 }}>
            {pending.map((p) => (
              <div key={p.asset_id} className="row spread" style={{ gap: 10 }}>
                <div className="row" style={{ gap: 8 }}>
                  <Thumb url={p.thumbnail_url} alt={displayName(p)} />
                  <span style={{ fontWeight: 600 }}>{displayName(p)}</span>
                  <span className="num" style={{ fontSize: 11.5, color: 'var(--label-fg)' }}>
                    #{p.asset_id}
                  </span>
                </div>
                <form action={removeAsset}>
                  <input type="hidden" name="asset_id" value={p.asset_id} />
                  <button
                    type="submit"
                    className="btn btn-ghost"
                    title={t('as_remove')}
                    aria-label={`${t('as_remove')} ${displayName(p)}`}
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
