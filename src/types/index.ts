export interface Theme {
  name: string;
  /** Whether this is a dark theme (affects glass alpha, shadows, color-scheme). */
  dark: boolean;
  colors: {
    bg: string;
    fg: string;
    frameBg: string;
    buttonBg: string;
    buttonFg: string;
    entryBg: string;
    entryFg: string;
    labelFg: string;
    highlight: string;
    /** Secondary brand color (gradient end, focus rings). */
    accent: string;
    success: string;
    warning: string;
    error: string;
    /** Fixed "opportunity" highlight color. */
    gold: string;
  };
}

export interface ScrapingConfig {
  url: string;
  startPage: number;
  endPage: number;
  filename: string;
  includePrefix: boolean;
  includeSuffix: boolean;
  includeDate: boolean;
  includeParams: boolean;
  includeAspectRatio: boolean;
  toLowerCase: boolean;
  addEmptyLine: boolean;
  prefix: string;
  suffix: string;
  aspectRatio: string;
  additionalParams: string;
}

export interface ScrapingProgress {
  currentPage: number;
  totalPages: number;
  prompts: number;
  status: 'idle' | 'scraping' | 'processing' | 'complete' | 'error';
  message: string;
  percentage: number;
}

export interface ScrapingResult {
  success: boolean;
  prompts: string[];
  filename?: string;
  error?: string;
  stats: {
    totalPages: number;
    successfulPages: number;
    failedPages: number;
    totalPrompts: number;
  };
}

export interface SocketEvents {
  'scraping-progress': (data: ScrapingProgress) => void;
  'scraping-complete': (data: ScrapingResult) => void;
  'scraping-error': (error: string) => void;
}

// Analytics types
export interface StockAsset {
  id: number;
  title: string;
  nb_downloads: number;
  creation_date: string;
  creator_name: string;
  creator_id: number;
  category: { id: number; name: string };
  thumbnail_url: string;
  thumbnail_240_url: string;
  keywords: { name: string }[];
  content_type: string;
  is_gentech: boolean;
}

export interface AnalyticsSummary {
  totalResults: number;
  enrichedFiles: number;
  avgDownloads: number;
  topDownloads: number;
}

export interface AnalyticsResponse {
  success: boolean;
  files: StockAsset[];
  summary: AnalyticsSummary;
  nb_results: number;
  error?: string;
}

export interface EarningsRangeTier {
  low: number;
  mid: number;
  high: number;
}

export interface EarningsEstimate {
  version: string;
  creator_id: string;
  portfolio: {
    totalAssets: number;
    enrichedAssets: number;
    breakdown: {
      ai: number;
      video: number;
      photo: number;
      vector: number;
      illustration: number;
    };
  };
  downloads: {
    total: number;
    monthly: number;
    avgPerAsset: number;
    topAsset: number;
  };
  earnings: {
    rateModel: string;
    currency: string;
    rates: EarningsRangeTier;
    lifetime: EarningsRangeTier;
    monthly: EarningsRangeTier;
  };
}

export interface EarningsResponse {
  success: boolean;
  error?: string;
  version?: string;
  creator_id?: string;
  portfolio?: EarningsEstimate['portfolio'];
  downloads?: EarningsEstimate['downloads'];
  earnings?: EarningsEstimate['earnings'];
}

// ── Keyword Insights ──────────────────────────────────────────────────────
/** Golden-opportunity accent (not part of the swappable theme palette). */
export const GOLD = '#e3b341';

export type SearchMode = 'topic' | 'creator';
export type CompetitionLevel = 'low' | 'medium' | 'high';

/** Content-type id used by Keyword Insights aggregation/charts. */
export type KeywordContentType = 'photo' | 'illus' | 'vector' | 'video' | 'template' | '3d';

export interface InsightsRequest {
  mode: SearchMode;
  query: string;
  contentFilter?: string;
  maxAssets?: number;
  useGlobalCompetition?: boolean;
}

export interface KeywordSampleAsset {
  id: string;
  thumbnail_240_url: string;
  nb_downloads: number;
}

export interface KeywordInsight {
  keyword: string;
  totalDownloads: number;
  assetCount: number;
  avgDownloads: number;
  globalCount?: number;
  competition: CompetitionLevel;
  opportunityScore: number; // 0–100
  contentType: KeywordContentType;
  sampleAssets: KeywordSampleAsset[];
}

export interface InsightsSummary {
  totalKeywords: number;
  topOpportunityKeyword: string;
  topOpportunityScore: number;
  totalDownloads: number;
  avgDownloadsPerKeyword: number;
}

export interface InsightsMeta {
  mode: SearchMode;
  query: string;
  scannedAssets: number;
  totalResults: number;
  processingTime: number; // seconds
}

export interface InsightsResponse {
  success: boolean;
  meta?: InsightsMeta;
  summary?: InsightsSummary;
  byType?: Record<string, number>;
  keywords?: KeywordInsight[];
  error?: string;
}

export const CONTENT_TYPE_FILTERS = [
  { key: 'all', label: 'All Assets' },
  { key: 'image/jpeg', label: 'Photos' },
  { key: 'image/png', label: 'Illustrations' },
  { key: 'image/svg+xml', label: 'Vectors' },
  { key: 'video', label: 'Videos' },
  { key: 'application', label: 'Templates' },
  { key: '3d', label: '3D' },
] as const;

export const THEMES: Record<string, Theme> = {
  cyberpunk: {
    name: 'Cyberpunk',
    dark: true,
    colors: {
      bg: '#0d1117', fg: '#c9d1d9', frameBg: '#161b22', buttonBg: '#21262d', buttonFg: '#f0f6fc',
      entryBg: '#010409', entryFg: '#c9d1d9', labelFg: '#8b949e', highlight: '#1f6feb', accent: '#58a6ff',
      success: '#3fb950', warning: '#d29922', error: '#f85149', gold: '#e3b341',
    },
  },
  dark: {
    name: 'Dark',
    dark: true,
    colors: {
      bg: '#0f1115', fg: '#e6e8eb', frameBg: '#181b21', buttonBg: '#232733', buttonFg: '#ffffff',
      entryBg: '#0d0f13', entryFg: '#e6e8eb', labelFg: '#9aa3b2', highlight: '#6366f1', accent: '#22d3ee',
      success: '#34d399', warning: '#fbbf24', error: '#f87171', gold: '#e3b341',
    },
  },
  dracula: {
    name: 'Dracula',
    dark: true,
    colors: {
      bg: '#282a36', fg: '#f8f8f2', frameBg: '#343746', buttonBg: '#44475a', buttonFg: '#f8f8f2',
      entryBg: '#21222c', entryFg: '#f8f8f2', labelFg: '#9aa6d4', highlight: '#bd93f9', accent: '#8be9fd',
      success: '#50fa7b', warning: '#f1fa8c', error: '#ff5555', gold: '#e3b341',
    },
  },
  light: {
    name: 'Light',
    dark: false,
    colors: {
      bg: '#f5f7fc', fg: '#16203a', frameBg: '#ffffff', buttonBg: '#eef1f7', buttonFg: '#16203a',
      entryBg: '#f1f3f9', entryFg: '#16203a', labelFg: '#5b6478', highlight: '#7c3aed', accent: '#0284c7',
      success: '#059669', warning: '#d97706', error: '#e11d48', gold: '#b07d12',
    },
  },
  nord: {
    name: 'Nord',
    dark: true,
    colors: {
      bg: '#2e3440', fg: '#eceff4', frameBg: '#3b4252', buttonBg: '#434c5e', buttonFg: '#eceff4',
      entryBg: '#2b303b', entryFg: '#eceff4', labelFg: '#c2cad8', highlight: '#81a1c1', accent: '#88c0d0',
      success: '#a3be8c', warning: '#ebcb8b', error: '#bf616a', gold: '#ebcb8b',
    },
  },
  aurora: {
    name: 'Aurora',
    dark: true,
    colors: {
      bg: '#0a0e1a', fg: '#e8ebff', frameBg: '#12172b', buttonBg: '#1a2138', buttonFg: '#ffffff',
      entryBg: '#0d1224', entryFg: '#e8ebff', labelFg: '#a5b0d6', highlight: '#8b5cf6', accent: '#38bdf8',
      success: '#34d399', warning: '#fbbf24', error: '#fb7185', gold: '#e3b341',
    },
  },
};
