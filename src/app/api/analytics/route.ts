import { NextRequest, NextResponse } from 'next/server';

const STOCK_API_BASE = 'https://stock.adobe.io/Rest/Media/1/Search/Files';
const ITEMS_PER_BATCH = 64;

const RESULT_COLUMNS = [
  'title', 'nb_downloads', 'id', 'creation_date', 'creator_name',
  'creator_id', 'category', 'thumbnail_url', 'thumbnail_240_url',
  'keywords', 'content_type', 'is_gentech',
];

interface AnalyticsRequest {
  query: string;
  type: 'creator' | 'keyword';
  limit: number;
  offset: number;
  contentFilter?: string;
}

// Maps UI filter keys → Adobe Stock API content_type filter param names
const CONTENT_TYPE_MAP: Record<string, string | null> = {
  all:            null,           // no filter
  'image/jpeg':   'photo',
  'image/png':    'illustration',
  'image/svg+xml':'vector',
  video:          'video',
  application:    'template',
  '3d':           '3d',
};

function buildApiUrl(params: AnalyticsRequest): string {
  const url = new URL(STOCK_API_BASE);
  url.searchParams.set('locale', 'en_US');
  url.searchParams.set('search_parameters[limit]', String(Math.min(params.limit, ITEMS_PER_BATCH)));
  url.searchParams.set('search_parameters[offset]', String(params.offset));

  if (params.type === 'creator') {
    url.searchParams.set('search_parameters[creator_id]', params.query);
  } else {
    url.searchParams.set('search_parameters[words]', params.query);
  }

  // Apply content-type filter when not 'all'
  if (params.contentFilter && params.contentFilter !== 'all') {
    const adobeType = CONTENT_TYPE_MAP[params.contentFilter];
    if (adobeType) {
      url.searchParams.set(`search_parameters[filters][content_type:${adobeType}]`, '1');
    }
  }

  RESULT_COLUMNS.forEach((col, i) => {
    url.searchParams.set(`result_columns[${i}]`, col);
  });

  return url.toString();
}

async function fetchBatch(params: AnalyticsRequest): Promise<{ files: any[]; nb_results: number }> {
  const apiUrl = buildApiUrl(params);
  const response = await fetch(apiUrl, {
    headers: {
      'x-api-key': 'AdobeStockClient1',
      'x-product': 'SearchBar/1',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error ${response.status}: ${text.slice(0, 200)}`);
  }

  return response.json();
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalyticsRequest = await request.json();
    const { query, type, limit = 100, offset = 0, contentFilter = 'all' } = body;

    if (!query || !query.trim()) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Fetch files in batches of 64 (API max) up to the requested limit (max 500)
    const cappedLimit = Math.min(limit, 500);
    const allFiles: any[] = [];
    let nbResults = 0;
    const batchCount = Math.ceil(cappedLimit / ITEMS_PER_BATCH);

    for (let i = 0; i < batchCount; i++) {
      const batchOffset = offset + i * ITEMS_PER_BATCH;
      const batchLimit = Math.min(ITEMS_PER_BATCH, cappedLimit - allFiles.length);

      if (batchLimit <= 0) break;

      const data = await fetchBatch({ query, type, limit: batchLimit, offset: batchOffset, contentFilter });
      nbResults = data.nb_results || nbResults;

      if (data.files && data.files.length > 0) {
        allFiles.push(...data.files);
      } else {
        break; // No more results
      }
    }

    // Compute summary from fetched files
    const downloads = allFiles.map(f => f.nb_downloads || 0);
    const totalDownloads = downloads.reduce((a, b) => a + b, 0);
    const avgDownloads = allFiles.length > 0 ? Math.round(totalDownloads / allFiles.length) : 0;
    const topDownloads = allFiles.length > 0 ? Math.max(...downloads) : 0;

    return NextResponse.json({
      success: true,
      files: allFiles,
      nb_results: nbResults,
      summary: {
        totalResults: nbResults,
        enrichedFiles: allFiles.length,
        avgDownloads,
        topDownloads,
      },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        files: [],
        nb_results: 0,
        summary: { totalResults: 0, enrichedFiles: 0, avgDownloads: 0, topDownloads: 0 },
      },
      { status: 500 },
    );
  }
}
