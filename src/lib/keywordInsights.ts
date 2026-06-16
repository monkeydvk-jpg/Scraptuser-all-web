/**
 * Keyword Insights — pure logic layer (no HTTP).
 *
 * Aggregates Adobe Stock assets into keyword statistics and computes an
 * Opportunity Score (high demand + low competition). The Adobe Stock client is
 * injected so this module can be unit-tested without network access.
 */

import type { RawStockFile } from './adobeStock';
import type {
  CompetitionLevel,
  InsightsResponse,
  KeywordContentType,
  KeywordInsight,
  SearchMode,
} from '@/types';

const MIN_ASSET_COUNT = 2; // ignore keywords appearing in a single asset (noise)
const MAX_KEYWORDS = 60; // cap returned set for readable charts/table
const GLOBAL_LOOKUP_TOP_N = 20; // hybrid: only refine the most promising keywords
const GLOBAL_COMP_REF = 50_000_000; // log-scale reference for market-wide competition
const SAMPLES_PER_KEYWORD = 10;

/** Map an Adobe Stock MIME content_type → Keyword Insights category id. */
export function mapContentType(ct?: string): KeywordContentType {
  if (!ct) return 'photo';
  if (ct.includes('video')) return 'video';
  if (ct.includes('svg')) return 'vector';
  if (ct.includes('png')) return 'illus';
  if (ct.includes('application') || ct.includes('template')) return 'template';
  if (ct.includes('3d') || ct.includes('model')) return '3d';
  return 'photo'; // jpeg / default
}

interface KeywordAgg {
  keyword: string;
  totalDownloads: number;
  assetCount: number;
  avgDownloads: number;
  contentTypeCounts: Record<string, number>;
  contentType: KeywordContentType;
  samples: { id: string; thumbnail_240_url: string; nb_downloads: number }[];
}

/** Aggregate a list of assets into per-keyword statistics. */
export function aggregateKeywords(files: RawStockFile[]): KeywordAgg[] {
  const map = new Map<string, KeywordAgg>();

  for (const file of files) {
    const downloads = file.nb_downloads ?? 0;
    const ct = mapContentType(file.content_type);
    const keywords = file.keywords ?? [];

    for (const k of keywords) {
      const kw = k?.name?.trim().toLowerCase();
      if (!kw || kw.length < 3) continue;
      if (/^\d+$/.test(kw)) continue; // skip pure-numeric noise

      let agg = map.get(kw);
      if (!agg) {
        agg = {
          keyword: kw,
          totalDownloads: 0,
          assetCount: 0,
          avgDownloads: 0,
          contentTypeCounts: {},
          contentType: ct,
          samples: [],
        };
        map.set(kw, agg);
      }

      agg.totalDownloads += downloads;
      agg.assetCount += 1;
      agg.contentTypeCounts[ct] = (agg.contentTypeCounts[ct] ?? 0) + 1;
      agg.samples.push({
        id: String(file.id ?? ''),
        thumbnail_240_url: file.thumbnail_240_url ?? '',
        nb_downloads: downloads,
      });
    }
  }

  const result: KeywordAgg[] = [];
  for (const agg of map.values()) {
    if (agg.assetCount < MIN_ASSET_COUNT) continue;
    agg.avgDownloads = Math.round(agg.totalDownloads / agg.assetCount);
    // primary content type = most common among matching assets
    agg.contentType = (Object.entries(agg.contentTypeCounts).sort(
      (a, b) => b[1] - a[1],
    )[0]?.[0] ?? 'photo') as KeywordContentType;
    // keep top-downloaded sample thumbnails
    agg.samples.sort((a, b) => b.nb_downloads - a.nb_downloads);
    agg.samples = agg.samples.filter((s) => s.thumbnail_240_url).slice(0, SAMPLES_PER_KEYWORD);
    result.push(agg);
  }
  return result;
}

const log1p = (n: number) => Math.log(n + 1);

function competitionFromAssetCount(assetCount: number): CompetitionLevel {
  if (assetCount >= 90) return 'high';
  if (assetCount >= 35) return 'medium';
  return 'low';
}

function competitionFromGlobal(globalCount: number): CompetitionLevel {
  if (globalCount >= 30000) return 'high';
  if (globalCount >= 3000) return 'medium';
  return 'low';
}

/**
 * Score keywords 0–100: demand (log-normalized avgDownloads) weighted 62%,
 * low competition (1 − log-normalized assetCount) weighted 38%.
 */
export function scoreOpportunity(aggs: KeywordAgg[]): KeywordInsight[] {
  if (aggs.length === 0) return [];
  const maxAvg = Math.max(...aggs.map((a) => a.avgDownloads));
  const maxComp = Math.max(...aggs.map((a) => a.assetCount));

  return aggs.map((a) => {
    const demandNorm = maxAvg > 0 ? log1p(a.avgDownloads) / log1p(maxAvg) : 0;
    const compNorm = maxComp > 0 ? log1p(a.assetCount) / log1p(maxComp) : 0;
    const raw = (demandNorm * 0.62 + (1 - compNorm) * 0.38) * 108;
    const opportunityScore = Math.round(Math.max(2, Math.min(100, raw)));
    return {
      keyword: a.keyword,
      totalDownloads: a.totalDownloads,
      assetCount: a.assetCount,
      avgDownloads: a.avgDownloads,
      competition: competitionFromAssetCount(a.assetCount),
      opportunityScore,
      contentType: a.contentType,
      sampleAssets: a.samples,
    };
  });
}

export interface AnalyzeParams {
  mode: SearchMode;
  query: string;
  contentFilter?: string;
  maxAssets: number;
  useGlobalCompetition: boolean;
  /** Optional ms-epoch cutoff to respect serverless time limits. */
  deadline?: number;
}

export interface AnalyzeDeps {
  fetchAssets: (p: {
    mode: SearchMode;
    query: string;
    contentFilter?: string;
    maxAssets: number;
    deadline?: number;
  }) => Promise<{ files: RawStockFile[]; nbResults: number }>;
  searchCount: (keyword: string) => Promise<number>;
}

/** Orchestrate a full analysis. Returns a populated InsightsResponse. */
export async function analyze(
  params: AnalyzeParams,
  deps: AnalyzeDeps,
): Promise<InsightsResponse> {
  const startTime = Date.now();
  const { mode, query, contentFilter = 'all', maxAssets, useGlobalCompetition, deadline } = params;

  const { files, nbResults } = await deps.fetchAssets({
    mode,
    query,
    contentFilter,
    maxAssets,
    deadline,
  });

  const aggs = aggregateKeywords(files);
  const scored = scoreOpportunity(aggs);
  const maxAvg = Math.max(...scored.map((k) => k.avgDownloads), 1);

  let keywords: KeywordInsight[];

  if (useGlobalCompetition && scored.length > 0) {
    // Hybrid path: within a small scan, sample competition is noisy, so pick
    // candidates by demand (avgDownloads), validate each against market-wide
    // competition, and rank by a score that uses real global competition. Only
    // globally-validated keywords are returned, so score and badge always agree.
    const candidates = [...scored]
      .sort((a, b) => b.avgDownloads - a.avgDownloads)
      .slice(0, GLOBAL_LOOKUP_TOP_N);

    for (let i = 0; i < candidates.length; i++) {
      if (deadline && Date.now() > deadline) break;
      try {
        const globalCount = await deps.searchCount(candidates[i].keyword);
        candidates[i].globalCount = globalCount;
        candidates[i].competition = competitionFromGlobal(globalCount);

        const demandNorm = log1p(candidates[i].avgDownloads) / log1p(maxAvg);
        const compNorm = Math.min(1, log1p(globalCount) / log1p(GLOBAL_COMP_REF));
        candidates[i].opportunityScore = Math.round(
          Math.max(2, Math.min(100, (demandNorm * 0.62 + (1 - compNorm) * 0.38) * 108)),
        );
      } catch {
        // keep the sample-based score/competition if the lookup fails
      }
      if (i < candidates.length - 1) await new Promise((r) => setTimeout(r, 200));
    }
    keywords = candidates.sort((a, b) => b.opportunityScore - a.opportunityScore);
  } else {
    // Fast path: rank by demand + sample competition only (no extra requests).
    keywords = scored.sort((a, b) => b.opportunityScore - a.opportunityScore).slice(0, MAX_KEYWORDS);
  }

  const totalDownloads = keywords.reduce((s, k) => s + k.totalDownloads, 0);
  const byType: Record<string, number> = {};
  keywords.forEach((k) => {
    byType[k.contentType] = (byType[k.contentType] ?? 0) + k.totalDownloads;
  });

  const top = keywords[0];
  return {
    success: true,
    meta: {
      mode,
      query,
      scannedAssets: files.length,
      totalResults: nbResults,
      processingTime: +((Date.now() - startTime) / 1000).toFixed(2),
    },
    summary: {
      totalKeywords: keywords.length,
      topOpportunityKeyword: top?.keyword ?? '',
      topOpportunityScore: top?.opportunityScore ?? 0,
      totalDownloads,
      avgDownloadsPerKeyword: keywords.length ? Math.round(totalDownloads / keywords.length) : 0,
    },
    byType,
    keywords,
  };
}
