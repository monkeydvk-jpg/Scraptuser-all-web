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
}

interface Props {
  rows: AdminUserRow[];
  selfId: string;
  /** null = ok; otherwise a raw error message. */
  errorMsg: string | null;
}

const fmtDate = (iso: string | null) => (iso ? iso.slice(0, 10) : null);

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

export function AdminClient({ rows, selfId, errorMsg }: Props) {
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p style={{ marginTop: 10, fontSize: 12, color: 'var(--label-fg)' }}>{t('adm_note_limit')}</p>
        </>
      )}
    </div>
  );
}
