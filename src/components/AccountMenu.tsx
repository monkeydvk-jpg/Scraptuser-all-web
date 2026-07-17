'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { LogIn, LogOut } from 'lucide-react';
import { useT } from '@/lib/useT';
import { signOut } from '@/app/login/actions';

/**
 * Header account widget. Reads the session via /api/auth/me so no Supabase
 * key is needed in the browser; reuses the ThemePicker dropdown styling.
 */
export function AccountMenu() {
  const t = useT();
  const [email, setEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (alive) setEmail(typeof d.email === 'string' ? d.email : null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  if (!email) {
    return (
      <Link href="/login" className="btn btn-ghost" style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>
        <LogIn style={{ width: 15, height: 15 }} /> {t('acc_signin')}
      </Link>
    );
  }

  return (
    <div className="tp" ref={ref}>
      <button
        className="avatar"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        title={email}
        style={{ border: 'none', cursor: 'pointer' }}
      >
        {email[0].toUpperCase()}
      </button>
      {open && (
        <div className="tp-menu" role="menu" style={{ minWidth: 220 }}>
          <div className="tp-title">{t('acc_signed_in_as')}</div>
          <div style={{ padding: '4px 10px 8px', fontSize: 12.5, wordBreak: 'break-all' }}>{email}</div>
          <form action={signOut}>
            <button
              type="submit"
              className="tp-item"
              style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer' }}
            >
              <LogOut style={{ width: 14, height: 14 }} />
              <span className="tp-name">{t('acc_signout')}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
