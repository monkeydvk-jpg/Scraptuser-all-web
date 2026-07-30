'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useT } from '@/lib/useT';
import { Eye, CalendarDays, Radio } from 'lucide-react';

interface VisitorStats {
  total: number | null;
  today: number | null;
  online: number | null;
}

/** Keep the "online" figure from going stale while a tab sits open. */
const REFRESH_MS = 60_000;

export function VisitorCounter() {
  const { theme } = useAppStore();
  const t = useT();
  const [stats, setStats] = useState<VisitorStats | null>(null);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const res = await fetch('/api/stats/visitors', { cache: 'no-store' });
        const data = (await res.json()) as VisitorStats;
        if (alive) setStats(data);
      } catch {
        // Leave the previous value on screen; a decorative counter must not
        // flash an error or disappear on one flaky request.
      }
    };

    void load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // Render nothing until real numbers exist: an empty footer beats a broken one.
  if (!stats || stats.total == null) return null;

  const fmt = (n: number) => new Intl.NumberFormat().format(n);

  const chip = 'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs';
  const chipStyle = {
    color: theme.colors.labelFg,
    border: `1px solid ${theme.colors.highlight}26`,
  };

  return (
    <div className="flex items-center gap-2">
      <span className={chip} style={chipStyle}>
        <Eye className="w-3.5 h-3.5" />
        <strong style={{ color: theme.colors.fg }}>{fmt(stats.total)}</strong>
        {t('footer_visits_total')}
      </span>
      {stats.today != null && (
        <span className={`${chip} hidden sm:flex`} style={chipStyle}>
          <CalendarDays className="w-3.5 h-3.5" />
          <strong style={{ color: theme.colors.fg }}>{fmt(stats.today)}</strong>
          {t('footer_visits_today')}
        </span>
      )}
      {stats.online != null && (
        <span className={chip} style={chipStyle}>
          <Radio className="w-3.5 h-3.5" style={{ color: theme.colors.highlight }} />
          <strong style={{ color: theme.colors.fg }}>{fmt(stats.online)}</strong>
          {t('footer_visits_online')}
        </span>
      )}
    </div>
  );
}
