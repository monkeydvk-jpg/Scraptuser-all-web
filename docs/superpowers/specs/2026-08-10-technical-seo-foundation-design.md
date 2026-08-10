# Technical SEO Foundation — Design

**Date:** 2026-08-10
**Status:** Awaiting review
**Scope:** Phase 1 of 2. Technical/on-page SEO only. Content production is a separate spec.
**Domain:** `https://stocklytic.bond`

---

## 1. Problem

`stocklytic.bond` is not indexable in any meaningful way today. Audit of the deployed site found five blocking defects, in severity order:

| # | Defect | Evidence | Impact |
|---|---|---|---|
| 1 | **Served HTML is Vietnamese, `<html lang="en">`** | Deployed `<h1>` = "Scrape title, soi từ khoá & xu hướng…" while lang attribute says `en` | Language/content mismatch. Google indexes the Vietnamese first paint against an `en` declaration. Neither language ranks. |
| 2 | **No `robots.txt`** | `curl https://stocklytic.bond/robots.txt` → Next.js 404 HTML | No crawl directives, no sitemap discovery. |
| 3 | **No `sitemap.xml`** | `curl` → 404 | Crawler must discover all routes by link-following. |
| 4 | **Identical metadata on all 8 routes** | `src/app/layout.tsx` exports one static `metadata`; no route exports its own | Every URL competes for the same query with the same title. Google keeps one, drops the rest. |
| 5 | **No structured data, no canonical, no OG image** | No JSON-LD anywhere; `metadataBase` unset | No rich results, no social preview, ambiguous canonical host. |

Defect 1 is the root cause and must be fixed first — the other four are worthless while the served HTML is the wrong language.

### Why defect 1 happens

`src/lib/i18n.ts` initialises the language store from `localStorage` with a Vietnamese default. Language resolution runs **client-side after hydration**. The server renders Vietnamese, then the browser may swap to English. Googlebot indexes what the server sent.

### Non-goals for this spec

- Blog/content pages, backlinks, off-page signals → Phase 2
- Redesign, new features, framer-motion removal
- Multi-locale routing (`/vi`, `/en` subpaths) → see §3.1 for why

---

## 2. Language architecture (fixes defect 1)

### Decision: English is the indexed language; Vietnamese is an opt-in client preference

The market for "adobe stock keyword tool" is overwhelmingly English-language. We index one language, and it is English. Vietnamese remains available to humans via the existing toggle but is never what a crawler sees.

### 2.1 Why not `/vi` + `/en` subpaths with hreflang

Rejected. Proper i18n routing means:

- Duplicating all 8 routes under two prefixes → 16 URLs
- `hreflang` reciprocal annotations on every page
- Rewriting every internal `<Link href>` to be locale-aware
- Splitting a domain with **zero** existing authority across two language clusters

For a new site with no backlinks, splitting authority is the wrong trade. Revisit only if Vietnamese organic traffic becomes material — the fix stays available later.

### 2.2 Implementation

**Server default becomes English.** The language store's SSR/initial value is `'en'` unconditionally. Vietnamese is applied only after mount, from `localStorage`, by explicit user action.

Consequences to handle:
- The existing `suppressHydrationWarning` usage stays — a VI-preferring returning visitor will see a one-frame EN→VI swap. Acceptable: it affects returning humans only, never crawlers.
- Every `<h1>`, meta title/description, and JSON-LD string in server output is English.
- `<html lang="en">` becomes **truthful** rather than a lie. No change needed to the attribute itself.

**Files:** `src/lib/i18n.ts` (initial state + `createJSONStorage` rehydration), `src/app/layout.tsx` (confirm no VI leakage).

**Verification:** `curl -s https://stocklytic.bond/ | grep -o '<h1[^>]*>[^<]*'` must return English text. This is the single most important assertion in the whole spec.

---

## 3. Per-route metadata (fixes defect 4)

### 3.1 Constraint: all 5 indexed routes are client components

Verified: `/`, `/generate`, `/keywords`, `/trends`, `/analytics` each consist of a single `page.tsx` whose first line is `'use client'`. There is no existing server/client split anywhere — `export const metadata` currently appears in exactly one file in the app, `src/app/layout.tsx`.

Next.js does **not** allow `export const metadata` from a client component. So per-route metadata is impossible without restructuring.

**Solution:** split **all five** routes. For each route `X`:
- `src/app/X/page.tsx` becomes a server component: exports `metadata` via `buildMetadata()`, renders `<XClient />`, and holds the route's JSON-LD.
- Existing body moves verbatim to a new `src/app/X/XClient.tsx` carrying the `'use client'` directive.

This is a mechanical move — no logic changes, no prop threading. `'use client'` moves down one level, so hooks, stores and framer-motion keep working unchanged. The risk is a botched copy, which §7.7 (`type-check` + `build`) catches.

### 3.2 Shared helper

New `src/lib/seo.ts` exporting `buildMetadata({ title, description, path, keywords, noindex })`:

- Sets `metadataBase` from `NEXT_PUBLIC_SITE_URL`, falling back to `https://stocklytic.bond`
- Emits `alternates.canonical` as an absolute URL — kills the www/non-www and http/https ambiguity
- Emits OpenGraph + `twitter:card` (`summary_large_image`)
- Emits `robots: { index: false, follow: false }` when `noindex` is set

`metadataBase` must be set once, correctly, or every canonical and OG URL in the app is relative and therefore broken.

### 3.3 Indexed routes — titles, descriptions, target queries

Titles are written for the **long-tail**. A `.bond` domain with no authority will not win "adobe stock keywords"; it can plausibly win "adobe stock prompt generator free" and similar 3–5 word queries. Descriptions are ≤155 chars, each contains the target phrase, each is written to earn a click rather than to stuff keywords.

| Route | Title (chars) | Primary target query |
|---|---|---|
| `/` | `Stocklytics — Free Adobe Stock Keyword & Prompt Tools` (53) | adobe stock tools free |
| `/generate` | `Adobe Stock Prompt Generator — Bulk AI Prompts, Free` (52) | adobe stock prompt generator |
| `/keywords` | `Adobe Stock Keyword Research Tool — Opportunity Score` (53) | adobe stock keyword research tool |
| `/trends` | `Adobe Stock Trends — Trending Keywords & Assets` (47) | adobe stock trending keywords |
| `/analytics` | `Adobe Stock Portfolio Analytics — Downloads & Earnings` (54) | adobe stock portfolio analytics |

All titles ≤60 chars (Google's desktop SERP truncation point); all descriptions verified 121–147 chars.

Descriptions (final copy, EN, derived from the existing `i18n.ts` EN strings so on-page and meta agree):

- **`/`** — "Free Adobe Stock toolkit: bulk AI prompt generation, portfolio analytics, opportunity keyword research and trend tracking. No login required."
- **`/generate`** — "Scrape Adobe Stock titles and generate AI prompts in bulk with custom prefix, suffix, aspect ratio and parameters. Runs in your browser, no signup."
- **`/keywords`** — "Rank Adobe Stock keywords by opportunity — high demand, low competition. Free keyword research built for stock contributors."
- **`/trends`** — "Track hot Adobe Stock keywords and assets by topic, estimated from download velocity. Auto-refreshed hourly. Free, no login."
- **`/analytics`** — "Analyse any Adobe Stock portfolio by creator or keyword: downloads, growth trends and estimated earnings. Free, no login."

Each meta description's claim must be true of the page. "No login" is stated only on routes that genuinely need no auth — verified: all five are `'use client'` with no `getUser`/`redirect` gate.

### 3.4 Noindexed routes

`/admin`, `/login`, `/watchlist`, `/assets` — auth-gated or private (`redirect()` + `getUser` confirmed in each). All get `robots: { index: false, follow: false }` via `buildMetadata({ noindex: true })`.

**These four are deliberately NOT disallowed in `robots.txt`.** A `Disallow` would prevent Googlebot from ever fetching the page and therefore from ever seeing the `noindex` — a URL blocked in robots.txt can still be indexed from external links, with no snippet. `noindex` requires a crawlable page to work. This is the single most common way teams get this wrong.

---

## 4. Crawl infrastructure (fixes defects 2, 3, 5)

### 4.1 `src/app/robots.ts`

Next.js `MetadataRoute.Robots`. Allow `/`, disallow `/api/` only, declare the sitemap absolute URL.

`/api/` is disallowed because those routes return JSON and have no search value. Auth routes are handled by `noindex` per §3.4, not here.

### 4.2 `src/app/sitemap.ts`

`MetadataRoute.Sitemap` listing exactly the five indexed routes from §3.3 — never the noindexed four. A sitemap that lists a `noindex` URL sends Google contradictory instructions.

- `lastModified`: build timestamp. Honest and cheap. Faking per-page freshness dates is a trust risk for zero gain.
- `priority`: `1.0` for `/`, `0.8` for the four tools. `changeFrequency`: `weekly`.

### 4.3 Structured data

JSON-LD via `<script type="application/ld+json">`, server-rendered.

- **Root layout:** `Organization` + `WebSite`. **No `SearchAction`** — the site has no `?q=` search-results URL, and declaring one that doesn't exist is a spam signal.
- **Each of the 4 tool routes:** `SoftwareApplication` — `applicationCategory: "DesignApplication"`, `offers` with `price: "0"`, `operatingSystem: "Web"`. This is the schema type most likely to earn enhanced treatment for a free browser tool.
- **Each of the 4 tool routes:** `BreadcrumbList` (Home → Tool).

### 4.4 Landing-page FAQ — visible content plus `FAQPage`

`FAQPage` schema requires the Q&A to be **visible on the page**. Emitting FAQ JSON-LD without on-page FAQ content is a structured-data violation and a manual-action risk.

So this adds a **real, visible FAQ section** to the landing page (EN, 5 entries), and marks it up with `FAQPage`. Draft questions, chosen because they are things the target user actually searches:

1. Is Stocklytics free? — Yes, all four tools, no signup for the public tools.
2. Do I need an Adobe Stock contributor account? — No; analytics works on any public portfolio.
3. How are estimated earnings calculated? — Stated plainly as an estimate from download counts and velocity, not official Adobe data.
4. How often does trend data update? — Hourly.
5. Can I use generated prompts commercially? — Prompts are yours; output licensing depends on your AI tool's terms.

Answer 3 must be worded so it cannot be read as an official Adobe figure. Accuracy here is both an honesty and a liability matter.

### 4.5 OG image

Static `src/app/opengraph-image.png` (1200×630) referenced by `metadataBase`. A dynamic `ImageResponse` per route is deferred — it costs edge runtime per crawl for marginal benefit at this stage.

### 4.6 Fonts / CWV

Three `next/font/google` families are loaded in `layout.tsx` — Inter, JetBrains Mono, Space Grotesk — each with `subsets: ['latin']` and no explicit `display`. `next/font` defaults to `display: 'swap'`, so **no change is required**; the earlier concern was unfounded and is recorded here so it isn't re-raised.

Three families for one app is still more weight than needed, but consolidating is a design decision, not an SEO fix. Out of scope; Phase 2 candidate.

---

## 5. Files touched

**New — infrastructure:** `src/app/robots.ts`, `src/app/sitemap.ts`, `src/lib/seo.ts`, `src/lib/structured-data.ts`, `src/app/opengraph-image.png`, `src/components/landing/FaqSection.tsx`

**New — client splits (§3.1), 5 files:** `src/app/PageClient.tsx`, `src/app/generate/GenerateClient.tsx`, `src/app/keywords/KeywordsClient.tsx`, `src/app/trends/TrendsClient.tsx`, `src/app/analytics/AnalyticsClient.tsx`

**Modified:**
- `src/lib/i18n.ts` — EN as server/initial default (§2.2)
- `src/app/layout.tsx` — `metadataBase`, `Organization` + `WebSite` JSON-LD
- 5 indexed `page.tsx` — rewritten as server shells (§3.1)
- 4 noindexed `page.tsx` — add `buildMetadata({ noindex: true })`
- landing — mount `FaqSection`

Total: 11 new, 11 modified.

---

## 6. Prerequisites — manual, blocking

Neither can be done from the codebase. Both must be completed by the user or §7 cannot be verified.

1. **`NEXT_PUBLIC_SITE_URL=https://stocklytic.bond` set in Vercel production env.** Without it every canonical falls back to the hardcoded default; if the fallback is ever wrong, every canonical in the app is wrong.
2. **Domain verified in Google Search Console.** This was raised earlier in the session and never confirmed. Without GSC there is no sitemap submission, no indexing request, and no way to measure whether any of this worked.

---

## 7. Verification

Run after deploy, against production:

1. `curl -s .../ | grep -o '<h1[^>]*>[^<]*'` → **English**. Primary regression gate for defect 1.
2. `curl -sI .../robots.txt` and `.../sitemap.xml` → `200`, correct content-type.
3. Fetch all 5 indexed URLs, extract `<title>` → **5 distinct** values matching §3.3.
4. Fetch all 4 noindexed URLs → each contains `noindex`; assert none appears in `sitemap.xml`.
5. Every canonical is absolute and on `https://stocklytic.bond`.
6. JSON-LD validates in Google Rich Results Test; `FAQPage` questions match the visible FAQ text verbatim.
7. `npm run type-check` && `npm run build` clean.
8. GSC: submit sitemap, request indexing on all 5.

---

## 8. What this does and does not achieve

This spec makes the site **correctly indexable**: right language, crawlable, unique per-page metadata, valid structured data. That is a precondition for ranking, not ranking itself.

It will not by itself put the site at #1. A new `.bond` domain with no backlinks and five tool pages has no authority. Realistic outcome: the five pages get indexed within days-to-weeks of GSC submission and begin appearing for low-competition long-tail queries. Competitive head terms require Phase 2 — content depth and off-page signals — and time.

Anyone promising #1 from a technical-SEO pass is selling something. This is the foundation; it is necessary, and it is not sufficient.
