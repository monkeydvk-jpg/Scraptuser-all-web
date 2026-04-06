import { NextRequest, NextResponse } from 'next/server';

const ITEMS_PER_PAGE = 64; // Adobe Stock API max per request
const STOCK_API_BASE = 'https://stock.adobe.io/Rest/Media/1/Search/Files';

interface ScrapingRequest {
  url: string;
  startPage: number;
  endPage: number;
  config: {
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
  };
}

interface StockApiFile {
  title?: string;
}

interface StockApiResponse {
  files?: StockApiFile[];
  nb_results?: number;
  error?: string;
}

/** Extract search parameters from an Adobe Stock URL */
function parseStockUrl(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  try {
    const urlObj = new URL(url);

    // Extract locale from path (e.g. /vn/ → vi_VN, /en/ → en_US)
    const localeMap: Record<string, string> = {
      vn: 'vi_VN', en: 'en_US', de: 'de_DE', fr: 'fr_FR',
      es: 'es_ES', it: 'it_IT', pt: 'pt_BR', jp: 'ja_JP',
      kr: 'ko_KR', tw: 'zh_TW', cn: 'zh_CN', th: 'th_TH',
    };
    const pathMatch = urlObj.pathname.match(/^\/([a-z]{2})\//i);
    const localeCode = pathMatch ? pathMatch[1].toLowerCase() : 'en';
    params.locale = localeMap[localeCode] || 'en_US';

    // Extract creator_id
    const creatorId = urlObj.searchParams.get('creator_id');
    if (creatorId) params.creator_id = creatorId;

    // Extract search words (keyword search)
    const words = urlObj.searchParams.get('k');
    if (words) params.words = words;

    // Extract content type filters
    for (const [key, value] of urlObj.searchParams.entries()) {
      if (key.startsWith('filters[') && value === '1') {
        const filterMatch = key.match(/filters\[(.+?)\]/);
        if (filterMatch) {
          params[`filter_${filterMatch[1]}`] = '1';
        }
      }
    }
  } catch {
    // URL parsing failed – return minimal params
  }
  return params;
}

/** Build Adobe Stock API URL for a given offset */
function buildApiUrl(parsedParams: Record<string, string>, limit: number, offset: number): string {
  const url = new URL(STOCK_API_BASE);
  url.searchParams.set('locale', parsedParams.locale || 'en_US');
  url.searchParams.set('search_parameters[limit]', String(limit));
  url.searchParams.set('search_parameters[offset]', String(offset));
  url.searchParams.set('result_columns[0]', 'title');

  if (parsedParams.creator_id) {
    url.searchParams.set('search_parameters[creator_id]', parsedParams.creator_id);
  }
  if (parsedParams.words) {
    url.searchParams.set('search_parameters[words]', parsedParams.words);
  }

  // Map content type filters
  let filterIdx = 0;
  for (const [key, value] of Object.entries(parsedParams)) {
    if (key.startsWith('filter_') && value === '1') {
      const filterName = key.replace('filter_', '');
      url.searchParams.set(`search_parameters[filters][${filterName}]`, '1');
      filterIdx++;
    }
  }

  return url.toString();
}

/** Fetch a single page of results from the Stock API */
async function fetchApiPage(
  parsedParams: Record<string, string>,
  offset: number,
): Promise<{ titles: string[]; error?: string }> {
  const apiUrl = buildApiUrl(parsedParams, ITEMS_PER_PAGE, offset);
  try {
    const response = await fetch(apiUrl, {
      headers: {
        'x-api-key': 'AdobeStockClient1',
        'x-product': 'SearchBar/1',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return { titles: [], error: `HTTP ${response.status}: ${text.slice(0, 200)}` };
    }

    const data: StockApiResponse = await response.json();
    if (!data.files || data.files.length === 0) {
      return { titles: [], error: 'No files in response' };
    }

    const titles = data.files
      .map(f => f.title?.trim())
      .filter((t): t is string => !!t && t.length >= 5);

    return { titles };
  } catch (err) {
    return { titles: [], error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: ScrapingRequest = await request.json();
    const { url, startPage, endPage, config } = body;

    // Input validation
    if (!url || !url.includes('stock.adobe.com')) {
      return NextResponse.json(
        { error: 'Invalid Adobe Stock URL provided' },
        { status: 400 }
      );
    }

    if (startPage < 1 || endPage < 1 || startPage > endPage) {
      return NextResponse.json(
        { error: 'Invalid page range provided' },
        { status: 400 }
      );
    }

    if (endPage - startPage > 20) {
      return NextResponse.json(
        { error: 'Maximum 20 pages allowed per request' },
        { status: 400 }
      );
    }

    // Parse the Adobe Stock URL into API parameters
    const parsedParams = parseStockUrl(url);
    console.log('Parsed URL params:', parsedParams);

    if (!parsedParams.creator_id && !parsedParams.words) {
      return NextResponse.json(
        { error: 'URL must contain a creator_id or search keywords (k=)' },
        { status: 400 }
      );
    }

    const allTitles: string[] = [];
    let successfulPages = 0;
    let failedPages = 0;

    // Fetch each page via the official Adobe Stock API
    for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
      const offset = (pageNum - 1) * ITEMS_PER_PAGE;
      console.log(`[Page ${pageNum}] offset=${offset}`);

      const result = await fetchApiPage(parsedParams, offset);

      if (result.titles.length > 0) {
        allTitles.push(...result.titles);
        successfulPages++;
        console.log(`[Page ${pageNum}] OK: ${result.titles.length} titles`);
      } else {
        failedPages++;
        console.warn(`[Page ${pageNum}] FAILED: ${result.error}`);
      }

      // Small delay between API calls
      if (pageNum < endPage) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    // Deduplicate and format
    const uniqueTitles = Array.from(new Set(allTitles));
    const formattedPrompts: string[] = [];

    const currentDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).replace(/\//g, '');

    uniqueTitles.forEach((title, index) => {
      if (!title) return;
      let prompt = '';

      if (config.includePrefix) {
        prompt += `${config.prefix} ${(index + 1).toString().padStart(2, '0')} `;
      }

      prompt += config.toLowerCase ? title.toLowerCase() : title;

      if (config.includeDate) prompt += ` ${currentDate}`;
      if (config.includeSuffix) prompt += config.suffix;
      if (config.includeParams) prompt += ` ${config.additionalParams}`;
      if (config.includeAspectRatio) prompt += ` --ar ${config.aspectRatio}`;

      formattedPrompts.push(prompt);
      if (config.addEmptyLine) formattedPrompts.push('');
    });

    const processingTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      prompts: formattedPrompts,
      stats: {
        totalPages: endPage - startPage + 1,
        successfulPages,
        failedPages,
        totalPrompts: formattedPrompts.length,
        processingTime: `${(processingTime / 1000).toFixed(2)}s`,
      },
    });

  } catch (error) {
    console.error('Scraping error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        stats: { totalPages: 0, successfulPages: 0, failedPages: 0, totalPrompts: 0 },
      },
      { status: 500 }
    );
  }
}
