'use client';

import { Users, Eye, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import { useT } from '@/lib/useT';

export interface AdminUserRow {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  contributors: number;
  assets: number;
  events30d: number;
}

export interface AccessEventRow {
  id: number;
  created_at: string;
  /** null = the row has no user_id at all, i.e. a genuinely anonymous visitor. */
  email: string | null;
  /** Set when the row HAS a user_id we could not resolve to an email — lookup
   *  failed, was rate-limited, or the account was deleted. Never conflate with
   *  anonymous: this panel must not report a real user as a guest. */
  userIdShort: string | null;
  event_type: string;
  path: string | null;
  country: string | null;
}

export interface AccessDailyRow {
  /** ISO date, already `YYYY-MM-DD` from Postgres. */
  day: string;
  pageviews: number;
  visitors: number;
}

interface Props {
  rows: AdminUserRow[];
  logRows: AccessEventRow[];
  dailyRows: AccessDailyRow[];
  selfId: string;
  /** null = ok; otherwise a raw error message. */
  errorMsg: string | null;
}

/**
 * Rendered in Asia/Ho_Chi_Minh to match the day boundary the rest of this
 * feature uses (access_daily rollups, purge cutoff, fmtDateTime below) — a
 * bare `iso.slice(0, 10)` would read the UTC calendar day instead, which
 * disagrees with fmtDateTime for any timestamp within ~7 hours of midnight UTC.
 */
const fmtDate = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(iso)) : null;
/** Log rows need the time of day, which fmtDate deliberately drops. */
const fmtDateTime = (iso: string) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`;
};

function StatChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="card" style={{ flex: '1 1 160px', padding: '14px 16px' }}>
      <div className="row" style={{ gap: 10 }}>
        <span className="icon-badge">{icon}</span>
        <div className="stack" style={{ gap: 2 }}>
          <span className="num" style={{ fontSize: 20, fontWeight: 700 }}>{value}</span>
          <span style={{ fontSize: 12, color: 'var(--label-fg)' }}>{label}</span>
        </div>
      </div>
    </div>
  );
}

export function AdminClient({ rows, logRows, dailyRows, selfId, errorMsg }: Props) {
  const t = useT();
  const totalContribs = rows.reduce((s, r) => s + r.contributors, 0);
  const totalAssets = rows.reduce((s, r) => s + r.assets, 0);

  return (
    <div className="page-wrap anim-up">
      <div className="page-head">
        <h1>{t('adm_title')}</h1>
        <p>{t('adm_sub')}</p>
      </div>

      {errorMsg && (
        <div className="card anim-up">
          <div className="state-box">
            <div
              className="state-icon"
              style={{ background: 'var(--error-15)', borderColor: 'transparent', color: 'var(--error)' }}
            >
              <AlertTriangle />
            </div>
            <h3>{t('adm_error_title')}</h3>
            <p className="mono" style={{ fontSize: 12, color: 'var(--label-fg)', wordBreak: 'break-word' }}>
              {errorMsg}
            </p>
          </div>
        </div>
      )}

      {!errorMsg && (
        <>
          <div className="row wrap anim-up" style={{ gap: 12, marginBottom: 18 }}>
            <StatChip icon={<Users />} label={t('adm_total_users')} value={rows.length} />
            <StatChip icon={<Eye />} label={t('adm_total_contribs')} value={totalContribs} />
            <StatChip icon={<ImageIcon />} label={t('adm_total_assets')} value={totalAssets} />
          </div>

          <div className="card anim-up" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>{t('adm_col_email')}</th>
                    <th style={{ textAlign: 'right' }}>{t('adm_col_created')}</th>
                    <th style={{ textAlign: 'right' }}>{t('adm_col_last_signin')}</th>
                    <th style={{ textAlign: 'right' }}>{t('adm_col_contribs')}</th>
                    <th style={{ textAlign: 'right' }}>{t('adm_col_assets')}</th>
                    <th style={{ textAlign: 'right' }}>{t('adm_col_events')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} style={{ cursor: 'default' }}>
                      <td>
                        <span style={{ fontWeight: 600 }}>{r.email ?? r.id}</span>
                        {r.id === selfId && (
                          <span
                            className="num"
                            style={{ marginLeft: 8, fontSize: 11, color: 'var(--label-fg)' }}
                          >
                            ({t('adm_you')})
                          </span>
                        )}
                      </td>
                      <td className="num" style={{ textAlign: 'right' }}>{fmtDate(r.created_at)}</td>
                      <td className="num" style={{ textAlign: 'right' }}>
                        {fmtDate(r.last_sign_in_at) ?? t('adm_never')}
                      </td>
                      <td className="num" style={{ textAlign: 'right' }}>{r.contributors}</td>
                      <td className="num" style={{ textAlign: 'right' }}>{r.assets}</td>
                      <td className="num" style={{ textAlign: 'right' }}>{r.events30d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p style={{ marginTop: 10, fontSize: 12, color: 'var(--label-fg)' }}>{t('adm_note_limit')}</p>

          <div className="page-head" style={{ marginTop: 28 }}>
            <h2 style={{ fontSize: 20 }}>{t('adm_log_title')}</h2>
          </div>
          <div className="card anim-up" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>{t('adm_log_time')}</th>
                    <th style={{ textAlign: 'left' }}>{t('adm_log_who')}</th>
                    <th style={{ textAlign: 'left' }}>{t('adm_log_event')}</th>
                    <th style={{ textAlign: 'left' }}>{t('adm_log_path')}</th>
                    <th style={{ textAlign: 'right' }}>{t('adm_log_country')}</th>
                  </tr>
                </thead>
                <tbody>
                  {logRows.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: 'var(--label-fg)' }}>
                        {t('adm_log_empty')}
                      </td>
                    </tr>
                  )}
                  {logRows.map((e) => (
                    <tr key={e.id} style={{ cursor: 'default' }}>
                      <td className="mono" style={{ fontSize: 12 }}>{fmtDateTime(e.created_at)}</td>
                      <td>
                        {e.email ??
                          (e.userIdShort ? (
                            <span className="mono" style={{ fontSize: 12, color: 'var(--label-fg)' }}>
                              {e.userIdShort}…
                            </span>
                          ) : (
                            t('adm_log_guest')
                          ))}
                      </td>
                      <td>{e.event_type}</td>
                      <td className="mono" style={{ fontSize: 12, color: 'var(--label-fg)' }}>
                        {e.path ?? '—'}
                      </td>
                      <td className="num" style={{ textAlign: 'right' }}>{e.country ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="page-head" style={{ marginTop: 28 }}>
            <h2 style={{ fontSize: 20 }}>{t('adm_daily_title')}</h2>
          </div>
          <div className="card anim-up" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>{t('adm_daily_day')}</th>
                    <th style={{ textAlign: 'right' }}>{t('adm_daily_pageviews')}</th>
                    <th style={{ textAlign: 'right' }}>{t('adm_daily_visitors')}</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyRows.map((d) => (
                    <tr key={d.day} style={{ cursor: 'default' }}>
                      <td className="mono" style={{ fontSize: 12 }}>{d.day}</td>
                      <td className="num" style={{ textAlign: 'right' }}>{d.pageviews}</td>
                      <td className="num" style={{ textAlign: 'right' }}>{d.visitors}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
