# Technical SEO Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all five public routes of Stocklytic correctly indexable in English with unique per-route metadata, a robots/sitemap pair, and valid structured data.

**Architecture:** Each of the five indexed routes is currently a single `'use client'` `page.tsx`. Next.js forbids `export const metadata` in a client file, so each route is split into a server shell `page.tsx` (metadata + JSON-LD) plus a sibling `'use client'` component holding the existing UI verbatim — the shape `src/app/login/` already uses. Metadata strings come from one helper, `buildMetadata()`, so canonical/OG/robots rules exist in exactly one place. `robots.ts` and `sitemap.ts` are Next.js file-convention routes.

**Tech Stack:** Next.js 14.2.5 (App Router), React 18.3.1, TypeScript, Zustand, Tailwind. `next/og` for the OG image. No test framework exists in this repo — verification is a Node assertion script (`scripts/seo-check.mjs`) run against a real server, plus `npm run type-check` and `npm run build`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-10-technical-seo-foundation-design.md`. Every string in this plan is copied from it verbatim; do not reword titles, descriptions, or FAQ answers.
- Canonical host is `https://stocklytic.bond`. Read it from `process.env.NEXT_PUBLIC_SITE_URL`, falling back to that literal.
- Titles ≤60 chars; descriptions ≤155 chars. The check script enforces both.
- The five indexed routes are exactly `/`, `/generate`, `/keywords`, `/trends`, `/analytics`.
- The four noindexed routes are exactly `/admin`, `/login`, `/watchlist`, `/assets`. They get `noindex` and are **never** added to `sitemap.ts` and **never** `Disallow`ed in robots.txt.
- Do not add `SearchAction` to the `WebSite` JSON-LD. The site has no search-results URL.
- Do not change the three `next/font/google` families or add `display` (spec §4.6 — `swap` is already the default).
- Do not add `persist`/`localStorage` to the Zustand store (spec §2.2 — deliberately out of scope).
- Client components moved in Tasks 4–8 must be moved **verbatim**. No refactoring, no reformatting, no logic changes in the same commit as a move.
- Commit after each task. Never `--no-verify`.
- Windows/PowerShell is the dev environment; all commands below are `npm` or `node` and work as written.

---

## Task 1: SEO assertion harness

**Files:**
- Create: `scripts/seo-check.mjs`
- Modify: `package.json` (add `seo:check` script)

**Interfaces:**
- Produces: `node scripts/seo-check.mjs <baseUrl>` — exits `0` if all assertions pass, `1` otherwise, printing one line per assertion. Later tasks rely on this exact invocation.
- Produces: `npm run seo:check` (defaults to `http://localhost:3000`).

This is the failing test for the whole plan. It encodes spec §7 as executable assertions. It will report many failures now; each later task flips a named group to passing.

- [ ] **Step 1: Write the failing test**

Create `scripts/seo-check.mjs`:

```js
#!/usr/bin/env node
// Asserts the technical-SEO invariants from
// docs/superpowers/specs/2026-08-10-technical-seo-foundation-design.md §7.
// Usage: node scripts/seo-check.mjs [baseUrl]

const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
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
    check('meta', `${path} canonical is absolute on canonical host`, canonical === `${CANONICAL_HOST}${path}`, `got "${canonical}"`);
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
```

- [ ] **Step 2: Wire the npm script**

In `package.json`, add to `"scripts"` after `"type-check"`:

```json
"seo:check": "node scripts/seo-check.mjs"
```

- [ ] **Step 3: Run it to verify it fails**

Terminal A: `npm run dev`
Terminal B: `npm run seo:check`

Expected: exits `1`. This script was run against production on 2026-08-10 before any code changes; that verified baseline is:

```
[lang]   1/6  passed   — all 5 routes serve Vietnamese ("Bắt đầu", "Tạo prompt")
[crawl]  8/18 passed   — robots.txt 404, sitemap.xml 404
[meta]   19/46 passed  — 1 distinct title across 5 routes, canonical null everywhere,
                         no og:title, no og:image, /login not noindex
[jsonld] 6/17 passed   — no Organization, WebSite, FAQPage, SoftwareApplication, BreadcrumbList
[assets] 0/2  passed   — /icon 404, /opengraph-image 404
FAIL: 34/89 assertions passed
```

Your local numbers should match closely. If a group already passes that shouldn't, the script is not asserting what you think — investigate before continuing. Save your output to diff against later runs.

- [ ] **Step 4: Commit**

```bash
git add scripts/seo-check.mjs package.json
git commit -m "test: add executable SEO invariant checks from spec 7"
```

---

## Task 2: English is the indexed language

**Files:**
- Modify: `src/lib/store.ts:75`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing new. `useAppStore((s) => s.lang)` now returns `'en'` on first render.

Spec §2.2. There is no `persist` middleware and no `localStorage` in `src/`, so this is genuinely one line and there is no hydration reconciliation to write.

- [ ] **Step 1: Run the language assertions to confirm they fail**

With `npm run dev` running: `npm run seo:check`

Expected: `[lang]` group reports `/ has no Vietnamese copy` FAIL and the same for the other four routes.

- [ ] **Step 2: Change the default**

In `src/lib/store.ts`, line 75:

```ts
  lang: 'en',
```

(was `lang: 'vi',`)

- [ ] **Step 3: Verify the language assertions pass**

`npm run seo:check`

Expected: the `[lang]` group is now `6/6 passed`. Other groups still fail. Also confirm by eye at `http://localhost:3000` that the page reads in English and the language toggle still switches to Vietnamese.

- [ ] **Step 4: Type-check**

`npm run type-check` — expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/store.ts
git commit -m "fix(seo): default language to English so crawlers index English copy"
```

---

## Task 3: `buildMetadata()` helper and root metadata

**Files:**
- Create: `src/lib/seo.ts`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Produces: `SITE_URL: string`, `SITE_NAME: string`, and
  `buildMetadata(opts: { title: string; description: string; path: string; noindex?: boolean }): Metadata`.
  Tasks 4–9 import these by these exact names.

- [ ] **Step 1: Write the helper**

Create `src/lib/seo.ts`:

```ts
import type { Metadata } from 'next';

/** Canonical origin. Overridden per-environment; falls back to production. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://stocklytic.bond').replace(/\/$/, '');

export const SITE_NAME = 'Stocklytics';

export interface BuildMetadataOptions {
  /** Exact <title>. Must be <= 60 chars. */
  title: string;
  /** Exact meta description. Must be <= 155 chars. */
  description: string;
  /** Route path beginning with "/", used for the absolute canonical. */
  path: string;
  /** Auth-gated or private pages. Emits noindex,nofollow. */
  noindex?: boolean;
}

/**
 * Single source of truth for per-route metadata: canonical, OpenGraph,
 * Twitter and robots directives. See spec 3.2.
 */
export function buildMetadata({ title, description, path, noindex = false }: BuildMetadataOptions): Metadata {
  const url = `${SITE_URL}${path}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      siteName: SITE_NAME,
      title,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    robots: noindex
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}
```

- [ ] **Step 2: Set `metadataBase` and the title template in the root layout**

`src/app/layout.tsx` currently exports a `metadata` object. Replace that export with the following, keeping every other import and JSX in the file untouched:

```tsx
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Stocklytics — Free Adobe Stock Keyword & Prompt Tools',
    template: '%s',
  },
  description:
    'Free Adobe Stock toolkit: bulk AI prompt generation, portfolio analytics, opportunity keyword research and trend tracking. No login required.',
  applicationName: SITE_NAME,
  referrer: 'origin-when-cross-origin',
  formatDetection: { telephone: false, address: false, email: false },
};
```

Add the import at the top of the file:

```tsx
import { SITE_NAME, SITE_URL } from '@/lib/seo';
```

`template: '%s'` is deliberate: each route below supplies a complete, hand-written title, so no suffix is appended. `metadataBase` is what makes the relative OG image and canonical resolve to absolute URLs.

- [ ] **Step 3: Verify**

`npm run type-check` — expected: clean.

`npm run seo:check` — expected: no new failures; `og:image` assertions may still fail (Task 11) but nothing that passed before should regress.

- [ ] **Step 4: Commit**

```bash
git add src/lib/seo.ts src/app/layout.tsx
git commit -m "feat(seo): add buildMetadata helper and root metadataBase"
```

---

## Tasks 4–8: split the five indexed routes

Each of these five tasks is the same mechanical operation on a different route. The pattern is defined once here; each task states its own exact file names, component names and metadata.

**Why the split:** `'use client'` files cannot `export const metadata`. Note that this is *not* about getting content into the HTML — Next.js already server-renders client components, so the markup is present today. The split exists purely to create a server module that can own metadata and JSON-LD.

**The operation, per route:**

1. `git mv` the existing `page.tsx` to the client filename. This preserves history and guarantees the UI moves verbatim.
2. Rename only the exported function on its `export default function` line.
3. Create a new server `page.tsx` that exports `metadata` and renders the client component.

The new `page.tsx` files contain no `'use client'` and no hooks. Follow `src/app/login/page.tsx`, which already does exactly this.

### Task 4: Split `/`

**Files:**
- Create: `src/app/PageClient.tsx` (moved from `src/app/page.tsx`)
- Create: `src/app/page.tsx` (new server shell)

**Interfaces:**
- Consumes: `buildMetadata` from `src/lib/seo.ts` (Task 3).
- Produces: `PageClient` — default export, no props. Task 10 mounts `FaqSection` inside it.

- [ ] **Step 1: Move the client component**

```bash
git mv src/app/page.tsx src/app/PageClient.tsx
```

- [ ] **Step 2: Rename the component**

In `src/app/PageClient.tsx`, line 35, change:

```tsx
export default function LandingPage() {
```

to:

```tsx
export default function PageClient() {
```

Change nothing else in the file. Keep `'use client'` on line 1.

- [ ] **Step 3: Create the server shell**

Create `src/app/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import PageClient from './PageClient';

export const metadata: Metadata = buildMetadata({
  title: 'Stocklytics — Free Adobe Stock Keyword & Prompt Tools',
  description:
    'Free Adobe Stock toolkit: bulk AI prompt generation, portfolio analytics, opportunity keyword research and trend tracking. No login required.',
  path: '/',
});

export default function Page() {
  return <PageClient />;
}
```

- [ ] **Step 4: Verify**

`npm run type-check` — expected: clean.

`npm run seo:check` — expected: the `/` rows in `[meta]` (title exact, description exact, canonical) now pass. The other four routes still fail.

Load `http://localhost:3000` and confirm the page is visually unchanged and interactive.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/app/PageClient.tsx
git commit -m "feat(seo): split / into server metadata shell and PageClient"
```

### Task 5: Split `/generate`

**Files:**
- Create: `src/app/generate/GenerateClient.tsx` (moved from `src/app/generate/page.tsx`)
- Create: `src/app/generate/page.tsx`

**Interfaces:**
- Consumes: `buildMetadata` from `src/lib/seo.ts`.
- Produces: `GenerateClient` — default export, no props.

- [ ] **Step 1: Move and rename**

```bash
git mv src/app/generate/page.tsx src/app/generate/GenerateClient.tsx
```

In `src/app/generate/GenerateClient.tsx`, line 26, change `export default function GeneratePage() {` to `export default function GenerateClient() {`. Change nothing else.

- [ ] **Step 2: Create the server shell**

Create `src/app/generate/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import GenerateClient from './GenerateClient';

export const metadata: Metadata = buildMetadata({
  title: 'Adobe Stock Prompt Generator — Bulk AI Prompts, Free',
  description:
    'Scrape Adobe Stock titles and generate AI prompts in bulk with custom prefix, suffix, aspect ratio and parameters. Runs in your browser, no signup.',
  path: '/generate',
});

export default function Page() {
  return <GenerateClient />;
}
```

- [ ] **Step 3: Verify**

`npm run type-check` — clean. `npm run seo:check` — `/generate` `[meta]` rows pass. Load `/generate`, run a small scrape to confirm interactivity survived.

- [ ] **Step 4: Commit**

```bash
git add src/app/generate
git commit -m "feat(seo): split /generate into server metadata shell and GenerateClient"
```

### Task 6: Split `/keywords`

**Files:**
- Create: `src/app/keywords/KeywordsClient.tsx` (moved from `src/app/keywords/page.tsx`)
- Create: `src/app/keywords/page.tsx`

**Interfaces:**
- Consumes: `buildMetadata` from `src/lib/seo.ts`.
- Produces: `KeywordsClient` — default export, no props.

- [ ] **Step 1: Move and rename**

```bash
git mv src/app/keywords/page.tsx src/app/keywords/KeywordsClient.tsx
```

In `src/app/keywords/KeywordsClient.tsx`, line 26, change `export default function KeywordsPage() {` to `export default function KeywordsClient() {`. Change nothing else. This file uses `useRouter`; that is fine in a client component.

- [ ] **Step 2: Create the server shell**

Create `src/app/keywords/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import KeywordsClient from './KeywordsClient';

export const metadata: Metadata = buildMetadata({
  title: 'Adobe Stock Keyword Research Tool — Opportunity Score',
  description:
    'Rank Adobe Stock keywords by opportunity — high demand, low competition. Free keyword research built for stock contributors.',
  path: '/keywords',
});

export default function Page() {
  return <KeywordsClient />;
}
```

- [ ] **Step 3: Verify**

`npm run type-check` — clean. `npm run seo:check` — `/keywords` `[meta]` rows pass. Load `/keywords` and confirm the charts render.

- [ ] **Step 4: Commit**

```bash
git add src/app/keywords
git commit -m "feat(seo): split /keywords into server metadata shell and KeywordsClient"
```

### Task 7: Split `/trends`

**Files:**
- Create: `src/app/trends/TrendsClient.tsx` (moved from `src/app/trends/page.tsx`)
- Create: `src/app/trends/page.tsx`

**Interfaces:**
- Consumes: `buildMetadata` from `src/lib/seo.ts`.
- Produces: `TrendsClient` — default export, no props.

- [ ] **Step 1: Move and rename**

```bash
git mv src/app/trends/page.tsx src/app/trends/TrendsClient.tsx
```

In `src/app/trends/TrendsClient.tsx`, line 26, change `export default function TrendsPage() {` to `export default function TrendsClient() {`. Change nothing else.

- [ ] **Step 2: Create the server shell**

Create `src/app/trends/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import TrendsClient from './TrendsClient';

export const metadata: Metadata = buildMetadata({
  title: 'Adobe Stock Trends — Trending Keywords & Assets',
  description:
    'Track hot Adobe Stock keywords and assets by topic, estimated from download velocity. Auto-refreshed hourly. Free, no login.',
  path: '/trends',
});

export default function Page() {
  return <TrendsClient />;
}
```

- [ ] **Step 3: Verify**

`npm run type-check` — clean. `npm run seo:check` — `/trends` `[meta]` rows pass. Load `/trends`.

- [ ] **Step 4: Commit**

```bash
git add src/app/trends
git commit -m "feat(seo): split /trends into server metadata shell and TrendsClient"
```

### Task 8: Split `/analytics`

**Files:**
- Create: `src/app/analytics/AnalyticsClient.tsx` (moved from `src/app/analytics/page.tsx`)
- Create: `src/app/analytics/page.tsx`

**Interfaces:**
- Consumes: `buildMetadata` from `src/lib/seo.ts`.
- Produces: `AnalyticsClient` — default export, no props.

- [ ] **Step 1: Move and rename**

```bash
git mv src/app/analytics/page.tsx src/app/analytics/AnalyticsClient.tsx
```

In `src/app/analytics/AnalyticsClient.tsx`, line 21, change `export default function AnalyticsPage() {` to `export default function AnalyticsClient() {`. Change nothing else.

- [ ] **Step 2: Create the server shell**

Create `src/app/analytics/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import AnalyticsClient from './AnalyticsClient';

export const metadata: Metadata = buildMetadata({
  title: 'Adobe Stock Portfolio Analytics — Downloads & Earnings',
  description:
    'Analyse any Adobe Stock portfolio by creator or keyword: downloads, growth trends and estimated earnings. Free, no login.',
  path: '/analytics',
});

export default function Page() {
  return <AnalyticsClient />;
}
```

- [ ] **Step 3: Verify**

`npm run type-check` — clean.

`npm run seo:check` — the whole `[meta]` indexed section should now pass, including `all 5 titles distinct`. Noindex rows still fail (Task 9).

- [ ] **Step 4: Commit**

```bash
git add src/app/analytics
git commit -m "feat(seo): split /analytics into server metadata shell and AnalyticsClient"
```

---

## Task 9: robots.ts, sitemap.ts, and noindex on private routes

**Files:**
- Create: `src/app/robots.ts`
- Create: `src/app/sitemap.ts`
- Modify: `src/app/admin/page.tsx`, `src/app/login/page.tsx`, `src/app/watchlist/page.tsx`, `src/app/assets/page.tsx`

**Interfaces:**
- Consumes: `SITE_URL`, `buildMetadata` from `src/lib/seo.ts`.
- Produces: `/robots.txt` and `/sitemap.xml`.

- [ ] **Step 1: Create robots.ts**

Create `src/app/robots.ts`:

```ts
import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // JSON endpoints only — no search value. Auth-gated pages are handled
      // by noindex, NOT by Disallow: a blocked page can still be indexed
      // from external links because Googlebot never sees the noindex.
      disallow: '/api/',
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
```

- [ ] **Step 2: Create sitemap.ts**

Create `src/app/sitemap.ts`:

```ts
import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

/** Only the five indexed routes. Never list a noindex URL here. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    { url: `${SITE_URL}/`, lastModified, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${SITE_URL}/generate`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/keywords`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/trends`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/analytics`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
  ];
}
```

- [ ] **Step 3: Add noindex to the four private routes**

All four are already server components, so `export const metadata` can be added directly. In each file, add the two imports and the metadata export above the existing default export, changing nothing else:

`src/app/admin/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Admin — Stocklytics',
  description: 'Internal admin dashboard.',
  path: '/admin',
  noindex: true,
});
```

`src/app/login/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Sign in — Stocklytics',
  description: 'Sign in to your Stocklytics account.',
  path: '/login',
  noindex: true,
});
```

`src/app/watchlist/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Watchlist — Stocklytics',
  description: 'Your tracked Adobe Stock keywords and assets.',
  path: '/watchlist',
  noindex: true,
});
```

`src/app/assets/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Assets — Stocklytics',
  description: 'Your tracked Adobe Stock assets.',
  path: '/assets',
  noindex: true,
});
```

If a file already imports `Metadata` from `next`, do not duplicate the import.

- [ ] **Step 4: Verify**

`npm run type-check` — clean.

`npm run seo:check` — expected: the entire `[crawl]` group passes and the four `is noindex` rows pass. Note that `/admin`, `/watchlist`, `/assets` may return a 3xx redirect for an anonymous request; the script accepts that and only asserts `noindex` when it gets a 200.

Manually open `http://localhost:3000/robots.txt` and `http://localhost:3000/sitemap.xml` and read them. Confirm no `Disallow` line mentions the four private routes and no private route appears in the sitemap.

- [ ] **Step 5: Commit**

```bash
git add src/app/robots.ts src/app/sitemap.ts src/app/admin/page.tsx src/app/login/page.tsx src/app/watchlist/page.tsx src/app/assets/page.tsx
git commit -m "feat(seo): add robots.txt and sitemap.xml, noindex private routes"
```

---

## Task 10: Structured data and the visible FAQ

**Files:**
- Create: `src/lib/structured-data.ts`
- Create: `src/components/JsonLd.tsx`
- Create: `src/components/landing/FaqSection.tsx`
- Modify: `src/app/layout.tsx`, `src/app/PageClient.tsx`, `src/app/page.tsx`, and the four tool `page.tsx` files

**Interfaces:**
- Consumes: `SITE_URL`, `SITE_NAME` from `src/lib/seo.ts`.
- Produces: `JsonLd`, `organizationSchema`, `webSiteSchema`, `softwareApplicationSchema(name, path, description)`, `breadcrumbSchema(name, path)`, `FAQ_ITEMS`, `faqPageSchema()`, `FaqSection`.

The FAQ copy lives in `FAQ_ITEMS` and is consumed by both the visible component and the JSON-LD, so the two cannot drift. That is a Google requirement, not a nicety.

- [ ] **Step 1: Write the schema module**

Create `src/lib/structured-data.ts`:

```ts
import { SITE_NAME, SITE_URL } from '@/lib/seo';

export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: SITE_URL,
  description:
    'Free tools for Adobe Stock contributors: AI prompt generation, keyword research, trend tracking and portfolio analytics.',
};

/** No SearchAction: the site has no ?q= results URL, and declaring a fake one is a spam signal. */
export const webSiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  name: SITE_NAME,
  url: SITE_URL,
  publisher: { '@id': `${SITE_URL}/#organization` },
  inLanguage: 'en',
};

export function softwareApplicationSchema(name: string, path: string, description: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name,
    url: `${SITE_URL}${path}`,
    description,
    applicationCategory: 'DesignApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    publisher: { '@id': `${SITE_URL}/#organization` },
  };
}

export function breadcrumbSchema(name: string, path: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name, item: `${SITE_URL}${path}` },
    ],
  };
}

/**
 * FAQ copy. Single source for the visible FaqSection and the FAQPage schema —
 * Google treats FAQ markup without matching visible text as a violation.
 * Answer 3 is worded so it cannot be read as official Adobe data.
 */
export const FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: 'Is Stocklytics free?',
    answer:
      'Yes. All four tools are free to use, and the public tools need no signup or account.',
  },
  {
    question: 'Do I need an Adobe Stock contributor account?',
    answer:
      'No. Portfolio analytics works on any public Adobe Stock portfolio, so you can analyse your own or research others.',
  },
  {
    question: 'How are estimated earnings calculated?',
    answer:
      'They are our own estimate, derived from public download counts and how fast those counts change. They are not official Adobe figures and will differ from your real payouts.',
  },
  {
    question: 'How often does trend data update?',
    answer: 'Trend data refreshes hourly.',
  },
  {
    question: 'Can I use generated prompts commercially?',
    answer:
      'The prompts themselves are yours to use. Licensing of whatever you generate from them depends on the terms of the AI tool you run them through.',
  },
];

export function faqPageSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  };
}
```

- [ ] **Step 2: Write the JSON-LD renderer**

Create `src/components/JsonLd.tsx`:

```tsx
/** Server-rendered JSON-LD. Not a client component — crawlers must see this in the HTML. */
export function JsonLd({ schema }: { schema: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        // Escape "<" so a "</script>" inside any string cannot break out of the tag.
        __html: JSON.stringify(schema).replace(/</g, '\\u003c'),
      }}
    />
  );
}
```

- [ ] **Step 3: Mount Organization + WebSite in the root layout**

In `src/app/layout.tsx`, add the imports:

```tsx
import { JsonLd } from '@/components/JsonLd';
import { organizationSchema, webSiteSchema } from '@/lib/structured-data';
```

and render it as the first child inside `<body>`:

```tsx
<JsonLd schema={[organizationSchema, webSiteSchema]} />
```

- [ ] **Step 4: Write the visible FAQ section**

Create `src/components/landing/FaqSection.tsx`:

```tsx
import { FAQ_ITEMS } from '@/lib/structured-data';

/**
 * Visible FAQ. The text here must stay identical to FAQ_ITEMS, which also
 * feeds the FAQPage schema — both read from the same array, so they cannot drift.
 * Uses <details> so every answer is in the HTML even when visually collapsed.
 */
export function FaqSection() {
  return (
    <section id="faq" className="mx-auto w-full max-w-3xl px-4 py-16">
      <h2 className="mb-8 text-center text-2xl font-semibold tracking-tight sm:text-3xl">
        Frequently asked questions
      </h2>
      <div className="space-y-3">
        {FAQ_ITEMS.map(({ question, answer }) => (
          <details
            key={question}
            className="group rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 open:bg-white/[0.04]"
          >
            <summary className="cursor-pointer list-none font-medium marker:content-none">
              <h3 className="inline text-base font-medium">{question}</h3>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-white/70">{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Mount the FAQ and FAQPage schema on the landing page**

In `src/app/PageClient.tsx`, import the section:

```tsx
import { FaqSection } from '@/components/landing/FaqSection';
```

This file imports no `Footer`, so render `<FaqSection />` as the **last child of the outermost element** returned by `PageClient` — after the final existing `<section>`. The FAQ belongs at the bottom of the landing page.

In `src/app/page.tsx`, add the FAQ schema. The file becomes:

```tsx
import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';
import { faqPageSchema } from '@/lib/structured-data';
import PageClient from './PageClient';

export const metadata: Metadata = buildMetadata({
  title: 'Stocklytics — Free Adobe Stock Keyword & Prompt Tools',
  description:
    'Free Adobe Stock toolkit: bulk AI prompt generation, portfolio analytics, opportunity keyword research and trend tracking. No login required.',
  path: '/',
});

export default function Page() {
  return (
    <>
      <JsonLd schema={faqPageSchema()} />
      <PageClient />
    </>
  );
}
```

- [ ] **Step 6: Add SoftwareApplication + BreadcrumbList to the four tool routes**

In each tool `page.tsx`, add the imports and wrap the render. For `src/app/generate/page.tsx` the render becomes:

```tsx
import { JsonLd } from '@/components/JsonLd';
import { breadcrumbSchema, softwareApplicationSchema } from '@/lib/structured-data';

// ...existing metadata export unchanged...

export default function Page() {
  return (
    <>
      <JsonLd
        schema={[
          softwareApplicationSchema(
            'Adobe Stock Prompt Generator',
            '/generate',
            'Scrape Adobe Stock titles and generate AI prompts in bulk with custom prefix, suffix, aspect ratio and parameters.',
          ),
          breadcrumbSchema('Prompt Generator', '/generate'),
        ]}
      />
      <GenerateClient />
    </>
  );
}
```

Apply the same shape to the other three, with these exact arguments:

- `src/app/keywords/page.tsx` — `softwareApplicationSchema('Adobe Stock Keyword Research Tool', '/keywords', 'Rank Adobe Stock keywords by opportunity — high demand, low competition.')` and `breadcrumbSchema('Keyword Research', '/keywords')`
- `src/app/trends/page.tsx` — `softwareApplicationSchema('Adobe Stock Trends', '/trends', 'Track hot Adobe Stock keywords and assets by topic, estimated from download velocity.')` and `breadcrumbSchema('Trends', '/trends')`
- `src/app/analytics/page.tsx` — `softwareApplicationSchema('Adobe Stock Portfolio Analytics', '/analytics', 'Analyse any Adobe Stock portfolio by creator or keyword: downloads, growth trends and estimated earnings.')` and `breadcrumbSchema('Portfolio Analytics', '/analytics')`

- [ ] **Step 7: Verify**

`npm run type-check` — clean.

`npm run seo:check` — expected: the whole `[jsonld]` group passes, including the five `FAQ question visible on page` assertions. If a visibility assertion fails, the cause is almost always an HTML-entity mismatch between `FAQ_ITEMS` and the rendered text — fix the copy, not the assertion.

Open `http://localhost:3000/#faq` and confirm the five questions render and expand.

- [ ] **Step 8: Commit**

```bash
git add src/lib/structured-data.ts src/components/JsonLd.tsx src/components/landing/FaqSection.tsx src/app/layout.tsx src/app/page.tsx src/app/PageClient.tsx src/app/generate/page.tsx src/app/keywords/page.tsx src/app/trends/page.tsx src/app/analytics/page.tsx
git commit -m "feat(seo): add JSON-LD schemas and visible landing FAQ"
```

---

## Task 11: Favicon and OG image

**Files:**
- Create: `src/app/icon.tsx`
- Create: `src/app/opengraph-image.tsx`

**Interfaces:**
- Consumes: `SITE_NAME` from `src/lib/seo.ts`.
- Produces: `/icon` and `/opengraph-image`, both rendered on demand by the edge runtime (verified: `next build` lists them as ƒ Dynamic, not prerendered).

Both use `ImageResponse` from `next/og` and MUST export `runtime = 'edge'`. Without it `npm run build` fails outright with `TypeError: Invalid URL` from @vercel/og (empirically confirmed, not a graceful fallback). They are therefore request-time, not build-time; Vercel caches the responses so per-request cost is amortised — and no binary asset to hand-author. No custom font is loaded, deliberately: `ImageResponse` would need to fetch and embed a font file, which is a build-time network dependency for no SEO gain.

- [ ] **Step 1: Create the favicon**

Create `src/app/icon.tsx`:

```tsx
import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0b0f1a',
          color: '#6ee7b7',
          fontSize: 22,
          fontWeight: 700,
          borderRadius: 6,
        }}
      >
        S
      </div>
    ),
    size,
  );
}
```

- [ ] **Step 2: Create the OG image**

Create `src/app/opengraph-image.tsx`:

```tsx
import { ImageResponse } from 'next/og';
import { SITE_NAME } from '@/lib/seo';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Stocklytics — free Adobe Stock keyword, prompt and analytics tools';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #0b0f1a 0%, #111827 55%, #064e3b 100%)',
          color: '#ffffff',
        }}
      >
        <div style={{ fontSize: 30, color: '#6ee7b7', letterSpacing: 2, textTransform: 'uppercase' }}>
          {SITE_NAME}
        </div>
        <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.15, marginTop: 24 }}>
          Free Adobe Stock
          <br />
          keyword &amp; prompt tools
        </div>
        <div style={{ fontSize: 30, color: 'rgba(255,255,255,0.72)', marginTop: 32 }}>
          Prompt generator · Keyword research · Trends · Portfolio analytics
        </div>
      </div>
    ),
    size,
  );
}
```

- [ ] **Step 3: Verify**

`npm run type-check` — clean.

`npm run seo:check` — expected: the `[assets]` group passes and every `og:image` assertion passes.

Open `http://localhost:3000/opengraph-image` in a browser and look at it. It is a marketing asset; if it renders broken or unreadable, fix it now rather than shipping it.

- [ ] **Step 4: Commit**

```bash
git add src/app/icon.tsx src/app/opengraph-image.tsx
git commit -m "feat(seo): generate favicon and OpenGraph image at request time on the edge"
```

---

## Task 12: Document the env var and run full verification

**Files:**
- Modify: `.env.example`
- Create: `docs/seo.md`

**Interfaces:**
- Consumes: everything above.
- Produces: nothing importable.

- [ ] **Step 1: Document `NEXT_PUBLIC_SITE_URL`**

Append to `.env.example`, matching the existing comment style:

```bash

# Canonical public origin, no trailing slash. Used for every canonical URL,
# the sitemap, robots.txt and OpenGraph tags. If this is wrong or missing in
# production, every canonical in the app points at the wrong host.
NEXT_PUBLIC_SITE_URL="https://stocklytic.bond"
```

- [ ] **Step 2: Run the production build**

```bash
npm run type-check
npm run lint
npm run build
```

All three must be clean. In the build output, confirm `/robots.txt`, `/sitemap.xml`, `/icon` and `/opengraph-image` are listed, and that the five indexed routes are static (`○`) — if one became dynamic (`ƒ`), a server shell is accidentally reading request data and must be fixed.

- [ ] **Step 3: Run the full check against the production build**

```bash
npm run build
npm run start
```

In a second terminal: `npm run seo:check`

Expected: `PASS` with every assertion green. This is the gate for the whole plan; do not proceed while anything is red.

- [ ] **Step 4: Write the runbook**

Create `docs/seo.md` covering, in this order:

1. Which file owns what: `src/lib/seo.ts` (canonical + metadata), `src/lib/structured-data.ts` (JSON-LD + FAQ copy), `src/app/robots.ts`, `src/app/sitemap.ts`.
2. **How to add a new indexed route:** create `page.tsx` as a server shell with `buildMetadata({...})`, put interactivity in a sibling `'use client'` component, then add the URL to `src/app/sitemap.ts`. Forgetting the sitemap entry is the easy mistake.
3. **How to add a private route:** `buildMetadata({ ..., noindex: true })` and do *not* touch `robots.ts` — explain that `Disallow` prevents Google from seeing `noindex`.
4. That FAQ copy must only be edited in `FAQ_ITEMS`, because the schema and the visible section share it.
5. `npm run seo:check <url>` as the verification command, including running it against production after deploy.

- [ ] **Step 5: Commit**

```bash
git add .env.example docs/seo.md
git commit -m "docs(seo): document NEXT_PUBLIC_SITE_URL and SEO runbook"
```

---

## Post-deploy: manual steps (blocking, cannot be automated)

These are spec §6 and §7.8. The code work above is worthless without them.

- [ ] Set `NEXT_PUBLIC_SITE_URL=https://stocklytic.bond` in Vercel **Production** env, then redeploy. Without a redeploy the value is not baked into the client bundle.
- [ ] Run `node scripts/seo-check.mjs https://stocklytic.bond` against production. Expect `PASS`.
- [ ] Verify the domain in Google Search Console. This was raised earlier in the session and never confirmed — until it is done there is no sitemap submission and no way to measure any of this.
- [ ] Submit `https://stocklytic.bond/sitemap.xml` in GSC.
- [ ] Request indexing for all five URLs via GSC URL Inspection.
- [ ] Validate `/` and `/generate` in the Google Rich Results Test. Confirm `FAQPage`, `SoftwareApplication` and `BreadcrumbList` are detected with no errors.
- [ ] Check the OG image with a real link preview (post the URL in Slack or use a card validator).

**Expectation, stated plainly:** this gets the five pages correctly indexable — right language, crawlable, unique metadata, valid structured data. It is a precondition for ranking, not ranking. A new `.bond` domain with no backlinks will not rank for competitive head terms from this work alone. Realistic outcome is indexation within days-to-weeks of GSC submission and impressions on low-competition long-tail queries. Head terms need Phase 2: content depth and off-page signals, plus time.

## Amendments

Decisions taken during execution that change what this plan's text says. Later tasks and reviewers should treat these as governing.

### 2026-08-10 — Task 1 harness: root canonical accepts either spelling

**What the plan said:** the Task 1 harness asserts `canonical === CANONICAL_HOST + path` for every indexed route, and Task 4 Step 4 expected the `/` canonical row to start passing once `/` was split.

**Why it changed:** Next.js normalizes `alternates.canonical` and strips the trailing slash under the default `trailingSlash: false`, so `/` always emits `https://stocklytic.bond`, never `https://stocklytic.bond/`. No change to `buildMetadata()` can satisfy the original assertion — verified directly against a running server. RFC 3986 treats an empty path as equivalent to `/`, and Google canonicalizes the two identically, so the assertion was wrong, not the implementation. The alternative (`trailingSlash: true`) was rejected: it rewrites every URL site-wide to satisfy one test row.

**What it is now:** for `/` only, the harness accepts `https://stocklytic.bond` or `https://stocklytic.bond/`. Every other route still requires `CANONICAL_HOST + path` exactly. Production behaviour is unchanged — no product code was touched.

**Effect on baselines:** the passing count after Task 4 is **43/89**, not the 42/89 a reader of the original text would predict. Group split at that point: `[lang] 6/6`, `[crawl] 8/18`, `[meta] 23/46`, `[jsonld] 6/17`, `[assets] 0/2`.
