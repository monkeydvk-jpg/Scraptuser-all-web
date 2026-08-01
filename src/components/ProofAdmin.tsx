'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Trash2, Upload } from 'lucide-react';
import { useT } from '@/lib/useT';
import { downscaleImage } from '@/lib/downscaleImage';
import {
  PROOF_MAX_BYTES,
  PROOF_MAX_RANK,
  PROOF_MIME,
  formatProofDay,
  isValidDay,
  type ProofEntry,
  type ProofErrorCode,
} from '@/lib/proof';

/** Every code the route can return, mapped to a translation key. */
const ERROR_KEY: Record<ProofErrorCode, string> = {
  forbidden: 'proof_err_forbidden',
  bad_day: 'proof_err_bad_day',
  bad_rank: 'proof_err_bad_rank',
  no_image: 'proof_err_no_image',
  too_big: 'proof_err_too_big',
  bad_type: 'proof_err_bad_type',
  not_found: 'proof_err_not_found',
  server: 'proof_err_server',
};

function isErrorCode(value: unknown): value is ProofErrorCode {
  return typeof value === 'string' && value in ERROR_KEY;
}

/** Today in the browser's own calendar, as the `YYYY-MM-DD` the input wants. */
function todayLocal(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const date = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${date}`;
}

const ACCEPT = Object.keys(PROOF_MIME).join(',');

/**
 * Publish and remove the landing page's proof entries.
 *
 * The whole panel is client-side on purpose: the marquee reads the same
 * `/api/proof` list, so re-fetching after a write is the only way this view and
 * the public one can never disagree.
 */
export default function ProofAdmin() {
  const t = useT();
  const [items, setItems] = useState<ProofEntry[]>([]);
  const [day, setDay] = useState(todayLocal);
  const [rank, setRank] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/proof', { cache: 'no-store' });
      const data: unknown = await res.json();
      if (Array.isArray(data)) setItems(data as ProofEntry[]);
    } catch {
      // Leave the list as it was; the form still works.
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setErrorKey(null);

    const picked = fileRef.current?.files?.[0];
    if (!picked) return setErrorKey(ERROR_KEY.no_image);
    if (!isValidDay(day)) return setErrorKey(ERROR_KEY.bad_day);

    const rankNum = Number(rank.trim());
    if (!Number.isInteger(rankNum) || rankNum < 1 || rankNum > PROOF_MAX_RANK) {
      return setErrorKey(ERROR_KEY.bad_rank);
    }

    setBusy(true);
    try {
      // Shrink first, then check the size: a 5MB screenshot usually lands well
      // under the cap once re-encoded, so rejecting before this would turn
      // perfectly publishable uploads away.
      const file = await downscaleImage(picked);
      if (!PROOF_MIME[file.type]) return setErrorKey(ERROR_KEY.bad_type);
      if (file.size > PROOF_MAX_BYTES) return setErrorKey(ERROR_KEY.too_big);

      const body = new FormData();
      body.set('day', day);
      body.set('rank', String(rankNum));
      body.set('image', file);

      const res = await fetch('/api/admin/proof', { method: 'POST', body });
      const data: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        const code = (data as { error?: unknown } | null)?.error;
        return setErrorKey(isErrorCode(code) ? ERROR_KEY[code] : ERROR_KEY.server);
      }

      setRank('');
      if (fileRef.current) fileRef.current.value = '';
      await load();
    } catch {
      setErrorKey(ERROR_KEY.server);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (busy) return;
    setBusy(true);
    setErrorKey(null);
    try {
      const res = await fetch(`/api/admin/proof?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data: unknown = await res.json().catch(() => null);
        const code = (data as { error?: unknown } | null)?.error;
        setErrorKey(isErrorCode(code) ? ERROR_KEY[code] : ERROR_KEY.server);
        return;
      }
      await load();
    } catch {
      setErrorKey(ERROR_KEY.server);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-head" style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 20 }}>{t('proof_adm_title')}</h2>
        <p>{t('proof_adm_sub')}</p>
      </div>

      <div className="card anim-up">
        <form onSubmit={submit} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <label style={{ display: 'grid', gap: 6, fontSize: 12, color: 'var(--label-fg)' }}>
            {t('proof_adm_day')}
            <input
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              required
              style={{ padding: '8px 10px' }}
            />
          </label>

          <label style={{ display: 'grid', gap: 6, fontSize: 12, color: 'var(--label-fg)' }}>
            {t('proof_adm_rank')}
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={PROOF_MAX_RANK}
              step={1}
              value={rank}
              onChange={(e) => setRank(e.target.value)}
              placeholder="1234"
              required
              style={{ padding: '8px 10px', width: 140 }}
            />
          </label>

          <label style={{ display: 'grid', gap: 6, fontSize: 12, color: 'var(--label-fg)' }}>
            {t('proof_adm_image')}
            <input ref={fileRef} type="file" accept={ACCEPT} required style={{ fontSize: 12 }} />
          </label>

          <button type="submit" className="btn btn-primary" disabled={busy}>
            <Upload size={16} />
            {busy ? t('proof_adm_uploading') : t('proof_adm_publish')}
          </button>
        </form>

        {errorKey && (
          <p role="alert" style={{ marginTop: 10, fontSize: 13, color: 'var(--danger, #ef4444)' }}>
            {t(errorKey)}
          </p>
        )}
      </div>

      <div className="card anim-up" style={{ padding: 0, overflow: 'hidden', marginTop: 12 }}>
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>{t('proof_adm_col_image')}</th>
                <th style={{ textAlign: 'left' }}>{t('proof_adm_day')}</th>
                <th style={{ textAlign: 'right' }}>{t('proof_adm_rank')}</th>
                <th style={{ textAlign: 'right' }}>{t('proof_adm_col_action')}</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr style={{ cursor: 'default' }}>
                  <td colSpan={4} style={{ textAlign: 'center', padding: 18, color: 'var(--label-fg)' }}>
                    {t('proof_adm_empty')}
                  </td>
                </tr>
              ) : (
                items.map((entry) => (
                  <tr key={entry.id} style={{ cursor: 'default' }}>
                    <td>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={entry.image_url}
                        alt=""
                        width={84}
                        height={48}
                        loading="lazy"
                        decoding="async"
                        style={{ objectFit: 'cover', borderRadius: 6, display: 'block' }}
                      />
                    </td>
                    <td className="mono" style={{ fontSize: 12 }}>
                      {formatProofDay(entry.day)}
                    </td>
                    <td className="num" style={{ textAlign: 'right' }}>
                      {entry.rank.toLocaleString('en-US')}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => void remove(entry.id)}
                        disabled={busy}
                        aria-label={t('proof_adm_delete')}
                        title={t('proof_adm_delete')}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
