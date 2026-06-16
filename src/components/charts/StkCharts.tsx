'use client';

/* Stocklytics — hand-rolled SVG charts, theme-aware via CSS var(). Ported from
   the design prototype; render final values immediately (visible without rAF). */
import { useEffect, useRef } from 'react';
import { useT } from '@/lib/useT';

export interface DonutDatum { label: string; value: number; color: string }
export function Donut({ data, size = 168, thickness = 22 }: { data: DonutDatum[]; size?: number; thickness?: number }) {
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const circ = 2 * Math.PI * r;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let offset = 0;
  return (
    <div className="row" style={{ gap: 22, flexWrap: 'wrap' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flex: 'none' }}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--border-soft)" strokeWidth={thickness} />
        {data.map((d, i) => {
          const frac = d.value / total;
          const len = frac * circ;
          const seg = (
            <circle key={i} cx={cx} cy={cx} r={r} fill="none" stroke={d.color} strokeWidth={thickness}
              strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={-offset} transform={`rotate(-90 ${cx} ${cx})`}
              style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(0.16,1,0.3,1)', transitionDelay: i * 0.08 + 's' }} strokeLinecap="butt" />
          );
          offset += len;
          return seg;
        })}
        <text x={cx} y={cx - 4} textAnchor="middle" fill="var(--fg)" style={{ font: '700 22px var(--font-mono)' }}>{Math.round(total)}%</text>
        <text x={cx} y={cx + 15} textAnchor="middle" fill="var(--label-fg)" style={{ font: '500 10px var(--font-body)' }}>mix</text>
      </svg>
      <div className="stack" style={{ gap: 9, flex: 1, minWidth: 140 }}>
        {data.map((d, i) => (
          <div key={i} className="row spread" style={{ gap: 10 }}>
            <div className="row" style={{ gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flex: 'none' }} />
              <span style={{ fontSize: 13 }}>{d.label}</span>
            </div>
            <span className="num" style={{ fontSize: 13, color: 'var(--label-fg)' }}>{d.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export interface BarDatum { m: string; v: number }
export function BarTimeline({ data, height = 180 }: { data: BarDatum[]; height?: number }) {
  const max = Math.max(...data.map((d) => d.v), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height, paddingTop: 8 }}>
      {data.map((d, i) => (
        <div key={i} className="stack" style={{ flex: 1, alignItems: 'center', gap: 7, height: '100%', justifyContent: 'flex-end' }}>
          <div title={String(d.v)} style={{ width: '100%', maxWidth: 30, borderRadius: '6px 6px 3px 3px', background: 'var(--gradient)', height: (d.v / max) * (height - 34) + 'px', transition: 'height 0.7s cubic-bezier(0.16,1,0.3,1)', transitionDelay: i * 0.04 + 's', boxShadow: '0 -2px 14px -6px var(--glow)' }} />
          <span style={{ fontSize: 10.5, color: 'var(--label-fg)' }}>{d.m}</span>
        </div>
      ))}
    </div>
  );
}

export interface OppDatum { kw: string; opp: number; comp?: number; demand?: number }
export function OppBars<T extends OppDatum>({ data, onPick }: { data: T[]; onPick?: (d: T) => void }) {
  const max = Math.max(...data.map((d) => d.opp), 1);
  return (
    <div className="stack" style={{ gap: 12 }}>
      {data.map((d, i) => (
        <div key={i} className="opp-row" onClick={onPick ? () => onPick(d) : undefined} style={{ cursor: onPick ? 'pointer' : 'default' }}>
          <div className="row spread" style={{ marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{d.kw}</span>
            <span className="num" style={{ fontSize: 13, color: 'var(--gold)', fontWeight: 700 }}>{d.opp}</span>
          </div>
          <div className="opp-track">
            <span style={{ width: (d.opp / max) * 100 + '%', display: 'block', height: '100%', borderRadius: 999, background: d.opp >= 80 ? 'linear-gradient(90deg, var(--gold), var(--warning))' : 'var(--gradient)', transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)', transitionDelay: i * 0.05 + 's' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function OppScatter<T extends OppDatum>({ data, onPick, height = 320 }: { data: T[]; onPick?: (d: T) => void; height?: number }) {
  const t = useT();
  const W = 560, H = height, padL = 46, padB = 38, padT = 16, padR = 16;
  const maxDemand = Math.max(...data.map((d) => d.demand ?? 0), 1);
  const x = (comp: number) => padL + comp * (W - padL - padR);
  const y = (demand: number) => padT + (1 - demand / (maxDemand * 1.08)) * (H - padT - padB);
  const gzTop = y(maxDemand);
  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 420, display: 'block' }}>
        <rect x={x(0)} y={gzTop} width={x(0.4) - x(0)} height={y(0) - gzTop - (H - padT - padB) * 0.4} rx={10} fill="var(--gold-15)" stroke="var(--gold)" strokeDasharray="5 5" strokeWidth={1.4} />
        <text x={x(0) + 12} y={gzTop + 20} fill="var(--gold)" style={{ font: '600 11px var(--font-body)' }}>{t('kw_zone')}</text>
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="var(--border)" strokeWidth={1} />
        <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="var(--border)" strokeWidth={1} />
        <text x={(W + padL) / 2} y={H - 6} textAnchor="middle" fill="var(--label-fg)" style={{ font: '500 11px var(--font-body)' }}>{t('kw_axis_comp')}</text>
        <text x={12} y={(H - padB + padT) / 2} textAnchor="middle" fill="var(--label-fg)" transform={`rotate(-90 12 ${(H - padB + padT) / 2})`} style={{ font: '500 11px var(--font-body)' }}>{t('kw_axis_demand')}</text>
        {data.map((d, i) => {
          const cx = x(d.comp ?? 0), cy = y(d.demand ?? 0), rad = 7 + (d.opp / 100) * 9;
          const gold = d.opp >= 80;
          return (
            <g key={i} style={{ cursor: onPick ? 'pointer' : 'default' }} onClick={onPick ? () => onPick(d) : undefined}>
              <circle cx={cx} cy={cy} r={rad} fill={gold ? 'var(--gold)' : 'var(--accent)'} fillOpacity={gold ? 0.85 : 0.5} stroke={gold ? 'var(--gold)' : 'var(--accent)'} strokeWidth={1.5}
                style={{ transition: `r 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 0.05}s`, filter: gold ? 'drop-shadow(0 0 8px var(--gold-glow))' : 'none' }} />
              <title>{`${d.kw} · opp ${d.opp}`}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function Sparkline({ data, width = 120, height = 36, color = 'var(--success)', fill = true }: { data: number[]; width?: number; height?: number; color?: string; fill?: boolean }) {
  const max = Math.max(...data), min = Math.min(...data);
  const rng = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1 || 1)) * width, height - ((v - min) / rng) * (height - 6) - 3]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = d + ` L ${width} ${height} L 0 ${height} Z`;
  const ref = useRef<SVGPathElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const len = ref.current.getTotalLength();
    ref.current.style.strokeDasharray = String(len);
    ref.current.style.strokeDashoffset = '0';
  }, []);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      {fill && <path d={area} fill={color} opacity={0.12} />}
      <path ref={ref} d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke-dashoffset 0.9s ease' }} />
    </svg>
  );
}

export function ScoreRing({ value, size = 132, label, gold = true }: { value: number; size?: number; label?: string; gold?: boolean }) {
  const stroke = 11;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  const col = gold ? 'var(--gold)' : 'var(--highlight)';
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="ringg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={gold ? 'var(--gold)' : 'var(--highlight)'} />
            <stop offset="100%" stopColor={gold ? 'var(--warning)' : 'var(--accent)'} />
          </linearGradient>
        </defs>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--border-soft)" strokeWidth={stroke} />
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="url(#ringg)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (value / 100) * c} transform={`rotate(-90 ${cx} ${cx})`}
          style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.16,1,0.3,1) 0.15s', filter: 'drop-shadow(0 0 6px var(--gold-glow))' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <div className="stack" style={{ alignItems: 'center', gap: 2 }}>
          <span className="num" style={{ fontSize: 30, fontWeight: 700, color: col }}>{value}</span>
          {label && <span style={{ fontSize: 10.5, color: 'var(--label-fg)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>}
        </div>
      </div>
    </div>
  );
}
