import { NextRequest, NextResponse } from 'next/server';
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
    addEmptyLine: boolean;
    prefix: string;
    suffix: string;
    aspectRatio: string;
    additionalParams: string;
  };
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
    
    const allTitles: string[] = [];
    let successfulPages = 0;
    let failedPages = 0;
    
    // HTTP headers to mimic a real browser
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    };
    
    for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
      try {
        const pageUrl = `${url}&search_page=${pageNum}`;
        
        // Fetch page content using HTTP request
        console.log(`Fetching page ${pageNum}: ${pageUrl}`);
        
        const response = await fetch(pageUrl, {
          headers,
          method: 'GET',
          cache: 'no-cache',
        });
        
        if (!response.ok) {
          console.error(`Failed to fetch page ${pageNum}: ${response.status}`);
          failedPages++;
          continue;
        }
        
        const content = await response.text();
        
        // Debug logging
        console.log(`\n=== PAGE ${pageNum} DEBUG ===`);
        console.log(`URL: ${pageUrl}`);
        console.log(`Content length: ${content.length}`);
        // Extract page title from HTML
        const titleMatch = content.match(/<title>(.*?)<\/title>/i);
        const pageTitle = titleMatch ? titleMatch[1] : 'No title found';
        console.log(`Page title: ${pageTitle}`);
        
        // Check if page loaded successfully (more specific error detection)
        if (content.includes('404 Not Found') || content.includes('Page not found') || content.length < 10000) {
          console.warn(`Page ${pageNum} might have failed to load properly (length: ${content.length})`);
          failedPages++;
          continue;
        }
        
        // Save a sample of the HTML for debugging (first 2000 chars)
        console.log(`HTML sample: ${content.substring(0, 2000)}...`);
        console.log(`=== END PAGE ${pageNum} DEBUG ===\n`);
        
        // Parse with cheerio
        const $ = cheerio.load(content);
        
        // Try multiple selectors for Adobe Stock titles
        const pageTitles: string[] = [];
        
        console.log(`\n--- SELECTOR DEBUGGING PAGE ${pageNum} ---`);
        
        // Method 1: Meta tags with itemprop="name"
        const metaTags = $('meta[itemprop="name"]');
        console.log(`Found ${metaTags.length} meta tags with itemprop="name"`);
        metaTags.each((_, element) => {
          const title = $(element).attr('content')?.trim();
          console.log(`  Meta title: "${title}"`);
          if (title) {
            pageTitles.push(title);
          }
        });
        
        // Method 2: If no titles found, try other selectors
        if (pageTitles.length === 0) {
          console.log('No meta titles found, trying img[alt]...');
          const imgTags = $('img[alt]');
          console.log(`Found ${imgTags.length} img tags with alt`);
          imgTags.each((_, element) => {
            const alt = $(element).attr('alt')?.trim();
            console.log(`  Img alt: "${alt}" (length: ${alt?.length})`);
            if (alt && alt.length > 10 && !alt.toLowerCase().includes('adobe')) {
              pageTitles.push(alt);
              console.log(`    -> Added to results`);
            }
          });
        }
        
        // Method 3: Try title attributes
        if (pageTitles.length === 0) {
          console.log('Still no titles found, trying [title] attributes...');
          const titleTags = $('[title]');
          console.log(`Found ${titleTags.length} elements with title attribute`);
          titleTags.each((_, element) => {
            const title = $(element).attr('title')?.trim();
            console.log(`  Title attr: "${title}" (length: ${title?.length})`);
            if (title && title.length > 10 && !title.toLowerCase().includes('adobe')) {
              pageTitles.push(title);
              console.log(`    -> Added to results`);
            }
          });
        }
        
        // Method 4: Try aria-label attributes
        if (pageTitles.length === 0) {
          console.log('Still no titles found, trying [aria-label] attributes...');
          const ariaLabels = $('[aria-label]');
          console.log(`Found ${ariaLabels.length} elements with aria-label`);
          ariaLabels.each((_, element) => {
            const label = $(element).attr('aria-label')?.trim();
            console.log(`  Aria-label: "${label}" (length: ${label?.length})`);
            if (label && label.length > 10 && !label.toLowerCase().includes('adobe')) {
              pageTitles.push(label);
              console.log(`    -> Added to results`);
            }
          });
        }
        
        // Method 5: Try common Adobe Stock selectors
        if (pageTitles.length === 0) {
          console.log('Still no titles, trying common Adobe Stock selectors...');
          
          // Try various possible selectors
          const selectors = [
            '[data-title]',
            '.asset-title',
            '.title',
            '[data-testid*="title"]',
            '[data-testid*="name"]',
            'h2', 'h3', 'h4',
            '.js-asset-title',
            '.asset-name'
          ];
          
          selectors.forEach(selector => {
            const elements = $(selector);
            if (elements.length > 0) {
              console.log(`  Found ${elements.length} elements for selector: ${selector}`);
              elements.each((_, element) => {
                const text = $(element).text()?.trim();
                const dataTitle = $(element).attr('data-title')?.trim();
                const title = dataTitle || text;
                console.log(`    Text: "${title}" (length: ${title?.length})`);
                if (title && title.length > 5 && title.length < 200) {
                  pageTitles.push(title);
                  console.log(`      -> Added to results`);
                }
              });
            }
          });
        }
        
        console.log(`Final result: ${pageTitles.length} titles found for page ${pageNum}`);
        console.log(`--- END SELECTOR DEBUGGING ---\n`);
        
        if (pageTitles.length > 0) {
          allTitles.push(...pageTitles);
          successfulPages++;
          console.log(`Page ${pageNum}: Found ${pageTitles.length} titles`);
        } else {
          console.warn(`Page ${pageNum}: No titles found`);
          failedPages++;
        }
        
        // Be respectful to the server
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (pageError) {
        console.error(`Error scraping page ${pageNum}:`, pageError);
        failedPages++;
        continue;
      }
    }
    
    // Process and format prompts
    const uniqueTitles = Array.from(new Set(allTitles));
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
        
        // Add empty line if option is enabled
        if (config.addEmptyLine) {
          formattedPrompts.push('');
        }
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
  }
}
