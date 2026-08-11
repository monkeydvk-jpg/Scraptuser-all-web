# SEO runbook

How Stocklytics' technical SEO is wired, and how to keep it correct when adding routes.

## 1. Who owns what

| File | Owns |
| --- | --- |
| `src/lib/seo.ts` | `SITE_URL` (canonical origin) and `buildMetadata()` — the single source of truth for per-route `<title>`, description, canonical, OpenGraph, Twitter card and `robots` directives. |
| `src/lib/structured-data.ts` | All JSON-LD: `organizationSchema`, `webSiteSchema`, `softwareApplicationSchema()`, `breadcrumbSchema()`, `faqPageSchema()`, and `FAQ_ITEMS` (the FAQ copy itself). |
| `src/app/robots.ts` | `robots.txt` — crawl rules and the sitemap pointer. Disallows `/api/` only. |
| `src/app/sitemap.ts` | `sitemap.xml` — the explicit list of indexed URLs. |

`SITE_URL` is `process.env.NEXT_PUBLIC_SITE_URL`, falling back to `https://stocklytic.bond` if unset. See `.env.example` for the required format (no trailing slash). Every canonical URL, the sitemap, `robots.txt`'s sitemap pointer, and every JSON-LD `@id`/`url` are derived from it — get it wrong in an environment and every one of those is wrong in that environment.

## 2. How to add a new indexed route

1. Create `page.tsx` as a **server shell** (no `'use client'`) that only exports `metadata` and renders JSON-LD plus the interactive component:

   ```tsx
   export const metadata: Metadata = buildMetadata({
     title: '...',       // <= 60 chars
     description: '...', // <= 155 chars
     path: '/your-route',
   });

   export default function Page() {
     return (
       <>
         <JsonLd schema={[softwareApplicationSchema(...), breadcrumbSchema(...)]} />
         <YourRouteClient />
       </>
     );
   }
   ```

2. Put all interactivity (state, effects, event handlers) in a sibling `'use client'` component (e.g. `GenerateClient`). The page file itself must stay a plain server component or `metadata` cannot be statically exported and the route can silently become dynamic (`ƒ`) instead of static (`○`) in the build output.
3. **Add the URL to `src/app/sitemap.ts`.** This is the easy mistake — a route can have perfect metadata and still never get crawled if it is missing from the sitemap array. `npm run seo:check` will not catch a route that is missing from *both* the sitemap and its own list of indexed routes, so also add it to `INDEXED` in `scripts/seo-check.mjs` if you want the harness to cover it.

## 3. How to add a private route

Call `buildMetadata({ ..., noindex: true })` and **do not touch `robots.ts`**.

Do not add the path to `robots.ts`'s `disallow` list. If a page is `Disallow`'d, Googlebot never fetches it and therefore never sees its `noindex` meta tag — a blocked-but-linked page can still get indexed (with no snippet) purely from external links. `noindex` only works if the crawler is allowed to read it. Private/auth-gated routes rely on `noindex` for exactly this reason; `robots.ts` only blocks non-page endpoints (`/api/`).

## 4. FAQ copy

Edit FAQ copy **only** in `FAQ_ITEMS` in `src/lib/structured-data.ts`. Both the visible `FaqSection` component and `faqPageSchema()` (the `FAQPage` JSON-LD) read from the same array. Editing one without the other creates a mismatch between visible text and structured data, which Google treats as a violation of its FAQ rich-result policy.

## 5. Verification

`scripts/seo-check.mjs` asserts the technical-SEO invariants (language, `robots.txt`/`sitemap.xml`, per-route metadata, JSON-LD, and the favicon/OG image assets) against a running server.

```bash
npm run seo:check              # http://localhost:3000 (default)
npm run seo:check:prod         # https://stocklytic.bond
node scripts/seo-check.mjs <url>   # any other base URL
SEO_CHECK_BASE=<url> npm run seo:check   # same, via env var
```

Resolution order for the base URL: CLI arg > `SEO_CHECK_BASE` env var > `http://localhost:3000`.

Run it locally against a production build (`npm run build && npm run start`) before every deploy, and **run it against production after every deploy** — production has failure modes localhost cannot reproduce: a wrong or missing `NEXT_PUBLIC_SITE_URL` in the hosting env (poisons every canonical/sitemap/robots/JSON-LD `@id` sitewide), the real edge runtime rendering `/opengraph-image`, CDN caching of stale HTML, and redirect behavior on auth-gated routes (anonymous requests to private routes may 307 to `/login` in production, which is expected and is treated as "reachable" by the harness, not a failure).
