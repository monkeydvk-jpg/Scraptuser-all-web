#!/usr/bin/env node
// Asserts the technical-SEO invariants from
// docs/superpowers/specs/2026-08-10-technical-seo-foundation-design.md §7.
// Usage: node scripts/seo-check.mjs [baseUrl]
// Base URL resolution order: CLI arg > SEO_CHECK_BASE env var > localhost default,
// so existing invocations (`npm run seo:check`) are unaffected.

const BASE = (process.argv[2] || process.env.SEO_CHECK_BASE || 'http://localhost:3000').replace(
  /\/$/,
  ''
);
const CANONICAL_HOST = 'https://stocklytic.bond';

const INDEXED = {
  '/': {
    title: 'Stocklytics — Free Adobe Stock Keyword & Prompt Tools',
    description:
      'Free Adobe Stock toolkit: bulk AI prompt generation, portfolio analytics, opportunity keyword research and trend tracking. No login required.',
  },
  '/generate': {
    title: 'Adobe Stock Prompt Generator — Bulk AI Prompts, Free',
    description:
      'Scrape Adobe Stock titles and generate AI prompts in bulk with custom prefix, suffix, aspect ratio and parameters. Runs in your browser, no signup.',
  },
  '/keywords': {
    title: 'Adobe Stock Keyword Research Tool — Opportunity Score',
    description:
      'Rank Adobe Stock keywords by opportunity — high demand, low competition. Free keyword research built for stock contributors.',
  },
  '/trends': {
    title: 'Adobe Stock Trends — Trending Keywords & Assets',
    description:
      'Track hot Adobe Stock keywords and assets by topic, estimated from download velocity. Auto-refreshed hourly. Free, no login.',
  },
  '/analytics': {
    title: 'Adobe Stock Portfolio Analytics — Downloads & Earnings',
    description:
      'Analyse any Adobe Stock portfolio by creator or keyword: downloads, growth trends and estimated earnings. Free, no login.',
  },
};

const NOINDEXED = ['/admin', '/login', '/watchlist', '/assets'];

// Words that only appear in the Vietnamese dictionary, used as a language tripwire.
const VI_MARKERS = ['Miễn phí', 'Tạo prompt', 'Nghiên cứu', 'Xu hướng', 'Bắt đầu', 'Đăng nhập'];

let failures = 0;
const results = [];
function check(group, name, ok, detail = '') {
  if (!ok) failures++;
  results.push({ group, name, ok, detail });
}

async function get(path) {
  const res = await fetch(BASE + path, { redirect: 'manual' });
  return { status: res.status, headers: res.headers, body: await res.text() };
}

const attr = (html, re) => (html.match(re) || [])[1] || null;
const metaContent = (html, name) =>
  attr(html, new RegExp(`<meta[^>]+(?:name|property)="${name}"[^>]+content="([^"]*)"`, 'i')) ??
  attr(html, new RegExp(`<meta[^>]+content="([^"]*)"[^>]+(?:name|property)="${name}"`, 'i'));

function decode(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&mdash;/g, '—')
    .replace(/&#x2014;/g, '—');
}

function jsonLd(html) {
  const out = [];
  const re = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) {
    try {
      const parsed = JSON.parse(m[1]);
      out.push(...(Array.isArray(parsed) ? parsed : [parsed]));
    } catch {
      out.push({ '@type': '__INVALID_JSON__' });
    }
  }
  return out;
}

async function main() {
  // --- lang: server HTML must be English (defect 1) ---
  const home = await get('/');
  check('lang', 'html lang="en"', /<html[^>]+lang="en"/i.test(home.body));
  for (const path of Object.keys(INDEXED)) {
    const { body } = await get(path);
    const hit = VI_MARKERS.find((w) => body.includes(w));
    check('lang', `${path} has no Vietnamese copy`, !hit, hit ? `found "${hit}"` : '');
  }

  // --- robots.txt / sitemap.xml exist (defects 2, 3) ---
  const robots = await get('/robots.txt');
  check('crawl', 'robots.txt is 200', robots.status === 200, `status ${robots.status}`);
  check('crawl', 'robots.txt declares sitemap', robots.body.includes(`${CANONICAL_HOST}/sitemap.xml`));
  check('crawl', 'robots.txt disallows /api/', /Disallow:\s*\/api\//.test(robots.body));
  for (const path of NOINDEXED) {
    check('crawl', `robots.txt does not Disallow ${path}`, !new RegExp(`Disallow:\\s*${path}`).test(robots.body));
  }

  const sitemap = await get('/sitemap.xml');
  check('crawl', 'sitemap.xml is 200', sitemap.status === 200, `status ${sitemap.status}`);
  check('crawl', 'sitemap.xml is XML', (sitemap.headers.get('content-type') || '').includes('xml'));
  for (const path of Object.keys(INDEXED)) {
    check('crawl', `sitemap lists ${path}`, sitemap.body.includes(`<loc>${CANONICAL_HOST}${path === '/' ? '/' : path}</loc>`));
  }
  for (const path of NOINDEXED) {
    check('crawl', `sitemap omits ${path}`, !sitemap.body.includes(`${CANONICAL_HOST}${path}<`) && !sitemap.body.includes(`${CANONICAL_HOST}${path}</loc>`));
  }

  // --- per-route metadata (defect 4) ---
  const titles = new Set();
  for (const [path, want] of Object.entries(INDEXED)) {
    const { body } = await get(path);
    const title = decode(attr(body, /<title[^>]*>([^<]*)<\/title>/i) || '');
    const desc = decode(metaContent(body, 'description') || '');
    const canonical = attr(body, /<link[^>]+rel="canonical"[^>]+href="([^"]*)"/i);
    titles.add(title);

    check('meta', `${path} title exact`, title === want.title, `got "${title}"`);
    check('meta', `${path} title <= 60 chars`, title.length > 0 && title.length <= 60, `${title.length} chars`);
    check('meta', `${path} description exact`, desc === want.description, `got "${desc}"`);
    check('meta', `${path} description <= 155 chars`, desc.length > 0 && desc.length <= 155, `${desc.length} chars`);
    // Root is the one path where two spellings are the same URL: RFC 3986 treats an
    // empty path as equivalent to "/", and Next strips the trailing slash under the
    // default trailingSlash:false. Accept both for "/" only; every other route must
    // match CANONICAL_HOST + path exactly.
    const wantCanonical = path === '/'
      ? [CANONICAL_HOST, `${CANONICAL_HOST}/`]
      : [`${CANONICAL_HOST}${path}`];
    check('meta', `${path} canonical is absolute on canonical host`, wantCanonical.includes(canonical), `got "${canonical}"`);
    check('meta', `${path} has og:title`, !!metaContent(body, 'og:title'));
    check('meta', `${path} has og:image`, !!metaContent(body, 'og:image'));
    check('meta', `${path} is not noindex`, !/noindex/i.test(metaContent(body, 'robots') || ''));
  }
  check('meta', 'all 5 titles distinct', titles.size === 5, `${titles.size} distinct`);

  for (const path of NOINDEXED) {
    const { status, body } = await get(path);
    const ok = status === 200 || (status >= 300 && status < 400);
    check('meta', `${path} reachable (not blocked)`, ok, `status ${status}`);
    if (status === 200) {
      check('meta', `${path} is noindex`, /noindex/i.test(metaContent(body, 'robots') || ''));
    }
  }

  // --- structured data (spec 4.3, 4.4) ---
  const homeLd = jsonLd(home.body);
  const types = (nodes) => nodes.map((n) => n['@type']).flat();
  check('jsonld', 'no invalid JSON-LD on /', !types(homeLd).includes('__INVALID_JSON__'));
  check('jsonld', '/ has Organization', types(homeLd).includes('Organization'));
  check('jsonld', '/ has WebSite', types(homeLd).includes('WebSite'));
  check('jsonld', '/ WebSite has no SearchAction', !JSON.stringify(homeLd).includes('SearchAction'));

  const faq = homeLd.find((n) => n['@type'] === 'FAQPage');
  check('jsonld', '/ has FAQPage', !!faq);
  if (faq) {
    const qs = (faq.mainEntity || []).map((q) => q.name);
    check('jsonld', 'FAQPage has 5 questions', qs.length === 5, `${qs.length} found`);
    const visible = decode(home.body.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' '));
    for (const q of qs) {
      check('jsonld', `FAQ question visible on page: "${q.slice(0, 40)}..."`, visible.includes(decode(q)));
    }
  }

  for (const path of ['/generate', '/keywords', '/trends', '/analytics']) {
    const { body } = await get(path);
    const ld = jsonLd(body);
    check('jsonld', `${path} JSON-LD parses`, !types(ld).includes('__INVALID_JSON__'));
    check('jsonld', `${path} has SoftwareApplication`, types(ld).includes('SoftwareApplication'));
    check('jsonld', `${path} has BreadcrumbList`, types(ld).includes('BreadcrumbList'));
    const app = ld.find((n) => n['@type'] === 'SoftwareApplication');
    if (app) {
      check('jsonld', `${path} applicationCategory=DesignApplication`, app.applicationCategory === 'DesignApplication');
      check('jsonld', `${path} offers price 0`, String(app.offers?.price) === '0');
      check('jsonld', `${path} operatingSystem=Web`, app.operatingSystem === 'Web');
    }
  }

  // --- icons / OG asset ---
  for (const [name, path] of [['favicon', '/icon'], ['og image', '/opengraph-image']]) {
    const res = await fetch(BASE + path, { redirect: 'follow' });
    check('assets', `${name} served`, res.ok, `status ${res.status}`);
  }

  // --- report ---
  const groups = [...new Set(results.map((r) => r.group))];
  for (const g of groups) {
    const rows = results.filter((r) => r.group === g);
    const bad = rows.filter((r) => !r.ok);
    console.log(`\n[${g}] ${rows.length - bad.length}/${rows.length} passed`);
    for (const r of bad) console.log(`  FAIL ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
  }
  console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'}: ${results.length - failures}/${results.length} assertions passed against ${BASE}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('seo-check crashed:', err);
  process.exit(1);
});
