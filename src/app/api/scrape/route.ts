import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

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
    prefix: string;
    suffix: string;
    aspectRatio: string;
    additionalParams: string;
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let browser;
  
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
    
    // Launch browser with optimized settings for Vercel
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-images',
        '--disable-javascript',
        '--disable-default-apps',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
      ],
      timeout: 30000,
    });
    
    const page = await browser.newPage();
    
    // Set user agent and viewport
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Set request interception to block unnecessary resources
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (req.resourceType() === 'stylesheet' || req.resourceType() === 'image' || req.resourceType() === 'font') {
        req.abort();
      } else {
        req.continue();
      }
    });
    
    const allTitles: string[] = [];
    let successfulPages = 0;
    let failedPages = 0;
    
    for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
      try {
        const pageUrl = `${url}&search_page=${pageNum}`;
        
        // Navigate with timeout
        await page.goto(pageUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
        
        // Wait a bit for content to load
        await page.waitForTimeout(2000);
        
        // Get page content
        const content = await page.content();
        
        // Check if page loaded successfully
        if (content.includes('error') || content.includes('404')) {
          console.warn(`Page ${pageNum} might have failed to load properly`);
          failedPages++;
          continue;
        }
        
        // Parse with cheerio
        const $ = cheerio.load(content);
        const titles = $('meta[itemprop="name"]');
        
        const pageTitles: string[] = [];
        titles.each((_, element) => {
          const title = $(element).attr('content')?.trim();
          if (title) {
            pageTitles.push(title);
          }
        });
        
        if (pageTitles.length > 0) {
          allTitles.push(...pageTitles);
          successfulPages++;
          console.log(`Page ${pageNum}: Found ${pageTitles.length} titles`);
        } else {
          console.warn(`Page ${pageNum}: No titles found`);
          failedPages++;
        }
        
        // Be respectful to the server
        await page.waitForTimeout(1000);
        
      } catch (pageError) {
        console.error(`Error scraping page ${pageNum}:`, pageError);
        failedPages++;
        continue;
      }
    }
    
    // Process and format prompts
    const uniqueTitles = [...new Set(allTitles)];
    const formattedPrompts: string[] = [];
    
    const currentDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).replace(/\//g, '');
    
    uniqueTitles.forEach((title, index) => {
      if (title) {
        let prompt = '';
        
        if (config.includePrefix) {
          prompt += `${config.prefix} ${(index + 1).toString().padStart(2, '0')} `;
        }
        
        const formattedTitle = config.toLowerCase ? title.toLowerCase() : title;
        prompt += formattedTitle;
        
        if (config.includeDate) {
          prompt += ` ${currentDate}`;
        }
        
        if (config.includeSuffix) {
          prompt += config.suffix;
        }
        
        if (config.includeParams) {
          prompt += ` ${config.additionalParams}`;
        }
        
        if (config.includeAspectRatio) {
          prompt += ` --ar ${config.aspectRatio}`;
        }
        
        formattedPrompts.push(prompt);
      }
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
        processingTime: `${(processingTime / 1000).toFixed(2)}s`
      }
    });
    
  } catch (error) {
    console.error('Scraping error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        stats: {
          totalPages: 0,
          successfulPages: 0,
          failedPages: 0,
          totalPrompts: 0
        }
      },
      { status: 500 }
    );
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }
  }
}
