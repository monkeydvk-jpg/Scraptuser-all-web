/**
 * Portfolio analytics — pure aggregation logic (no HTTP).
 *
 * Turns a list of Adobe Stock assets into a portfolio-health overview:
 * scorecard KPIs, timeline, download distribution, content-type & AI splits,
 * top keywords, and top "movers" (by download velocity).
 */

import type { RawStockFile, SearchMode } from './adobeStock';
import { mapContentType } from './keywordInsights';

export interface PortfolioScorecard {
  totalAssets: number; // assets actually scanned
  totalDownloads: number;
  avgDownloads: number;
  medianDownloads: number;
  topDownloads: number;
  zeroDownloadPct: number; // % of scanned assets with 0 downloads
  concentrationTop10Pct: number; // % of downloads coming from the top 10% of assets
  avgMonthlyDownloads: number; // sum of per-asset velocity (downloads / month live)
  aiPct: number; // % of scanned assets that are AI-generated
}

export interface TimelinePoint {
  period: string; // YYYY-MM
  assets: number;
  downloads: number;
}

export interface DistributionBucket {
  label: string;
  count: number;
}

export interface KeywordStat {
  keyword: string;
  count: number;
  downloads: number;
}

export interface MoverAsset {
  id: string;
  title: string;
  thumbnail_240_url: string;
  nb_downloads: number;
  velocity: number; // downloads / month
  ageMonths: number;
}

export interface AiSplit {
  ai: { count: number; downloads: number };
  human: { count: number; downloads: number };
}

export interface PortfolioOverview {
  success: boolean;
  meta?: {
    mode: SearchMode;
    query: string;
    scannedAssets: number;
    totalResults: number;
    processingTime: number;
  };
  scorecard?: PortfolioScorecard;
  timeline?: TimelinePoint[];
  distribution?: DistributionBucket[];
  byType?: Record<string, number>; // downloads by content-type id
  byTypeCount?: Record<string, number>; // asset count by content-type id
  aiSplit?: AiSplit;
  topKeywords?: KeywordStat[];
  topMovers?: MoverAsset[];
  topDownloaded?: MoverAsset[]; // assets ranked by total downloads (up to 500)
  error?: string;
}

const MONTH_MS = 1000 * 60 * 60 * 24 * 30;

function ageInMonths(creationDate: string | undefined, now: number): number {
  if (!creationDate) return 1;
  const t = new Date(creationDate).getTime();
  if (Number.isNaN(t)) return 1;
  return Math.max(1, (now - t) / MONTH_MS);
}

function median(sortedAsc: number[]): number {
  const n = sortedAsc.length;
  if (n === 0) return 0;
  const mid = Math.floor(n / 2);
  return n % 2 ? sortedAsc[mid] : Math.round((sortedAsc[mid - 1] + sortedAsc[mid]) / 2);
}

const DIST_BUCKETS: { label: string; max: number }[] = [
  { label: '0', max: 0 },
  { label: '1–10', max: 10 },
  { label: '11–50', max: 50 },
  { label: '51–100', max: 100 },
  { label: '101–500', max: 500 },
  { label: '501–1K', max: 1000 },
  { label: '1K+', max: Infinity },
];

function bucketize(downloads: number[]): DistributionBucket[] {
  const counts = DIST_BUCKETS.map((b) => ({ label: b.label, count: 0 }));
  for (const d of downloads) {
    if (d <= 0) {
      counts[0].count++;
      continue;
    }
    for (let i = 1; i < DIST_BUCKETS.length; i++) {
      if (d <= DIST_BUCKETS[i].max) {
        counts[i].count++;
        break;
      }
    }
  }
  return counts;
}

export function computeOverview(
  files: RawStockFile[],
  nbResults: number,
  mode: SearchMode,
  query: string,
  startTime: number,
  now: number,
): PortfolioOverview {
  const totalAssets = files.length;
  const downloads = files.map((f) => f.nb_downloads ?? 0);
  const totalDownloads = downloads.reduce((a, b) => a + b, 0);

  const sortedAsc = [...downloads].sort((a, b) => a - b);
  const sortedDesc = [...downloads].sort((a, b) => b - a);
  const zeroCount = downloads.filter((d) => d <= 0).length;

  // top 10% concentration
  const top10n = Math.max(1, Math.ceil(totalAssets * 0.1));
  const top10Downloads = sortedDesc.slice(0, top10n).reduce((a, b) => a + b, 0);

  // velocity + AI + content type + timeline + keywords
  let avgMonthlyDownloads = 0;
  let aiCount = 0;
  let aiDownloads = 0;
  const byType: Record<string, number> = {};
  const byTypeCount: Record<string, number> = {};
  const timelineMap = new Map<string, { assets: number; downloads: number }>();
  const kwMap = new Map<string, { count: number; downloads: number }>();
  const movers: MoverAsset[] = [];

  for (const f of files) {
    const dls = f.nb_downloads ?? 0;
    const months = ageInMonths(f.creation_date, now);
    const velocity = dls / months;
    avgMonthlyDownloads += velocity;

    if (f.is_gentech) {
      aiCount++;
      aiDownloads += dls;
    }

    const ct = mapContentType(f.content_type);
    byType[ct] = (byType[ct] ?? 0) + dls;
    byTypeCount[ct] = (byTypeCount[ct] ?? 0) + 1;

    if (f.creation_date) {
      const d = new Date(f.creation_date);
      if (!Number.isNaN(d.getTime())) {
        const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const e = timelineMap.get(period) ?? { assets: 0, downloads: 0 };
        e.assets++;
        e.downloads += dls;
        timelineMap.set(period, e);
      }
    }

    for (const k of f.keywords ?? []) {
      const kw = k?.name?.trim().toLowerCase();
      if (!kw || kw.length < 3) continue;
      const e = kwMap.get(kw) ?? { count: 0, downloads: 0 };
      e.count++;
      e.downloads += dls;
      kwMap.set(kw, e);
    }

    if (f.thumbnail_240_url && f.id != null) {
      movers.push({
        id: String(f.id),
        title: f.title ?? '',
        thumbnail_240_url: f.thumbnail_240_url,
        nb_downloads: dls,
        velocity: Math.round(velocity),
        ageMonths: Math.round(months),
      });
    }
  }

  const timeline = [...timelineMap.entries()]
    .map(([period, v]) => ({ period, ...v }))
    .sort((a, b) => a.period.localeCompare(b.period));

  const topKeywords = [...kwMap.entries()]
    .map(([keyword, v]) => ({ keyword, ...v }))
    .sort((a, b) => b.downloads - a.downloads)
    .slice(0, 20);

  const topDownloaded = [...movers].sort((a, b) => b.nb_downloads - a.nb_downloads).slice(0, 500);
  const topMovers = movers.sort((a, b) => b.velocity - a.velocity).slice(0, 8);

  return {
    success: true,
    meta: {
      mode,
      query,
      scannedAssets: totalAssets,
      totalResults: nbResults,
      processingTime: +((Date.now() - startTime) / 1000).toFixed(2),
    },
    scorecard: {
      totalAssets,
      totalDownloads,
      avgDownloads: totalAssets ? Math.round(totalDownloads / totalAssets) : 0,
      medianDownloads: median(sortedAsc),
      topDownloads: sortedDesc[0] ?? 0,
      zeroDownloadPct: totalAssets ? Math.round((zeroCount / totalAssets) * 100) : 0,
      concentrationTop10Pct: totalDownloads ? Math.round((top10Downloads / totalDownloads) * 100) : 0,
      avgMonthlyDownloads: Math.round(avgMonthlyDownloads),
      aiPct: totalAssets ? Math.round((aiCount / totalAssets) * 100) : 0,
    },
    timeline,
    distribution: bucketize(downloads),
    byType,
    byTypeCount,
    aiSplit: {
      ai: { count: aiCount, downloads: aiDownloads },
      human: { count: totalAssets - aiCount, downloads: totalDownloads - aiDownloads },
    },
    topKeywords,
    topMovers,
    topDownloaded,
  };
}
