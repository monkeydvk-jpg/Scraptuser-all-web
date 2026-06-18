# Landing Page — Design Spec

**Date:** 2026-06-18
**Status:** Approved

## Goal
Add a public marketing landing page at `/` for the Stocklytics – Adobe Stock Suite, with its own distinct design (separate from the inner app shell). Bilingual (VI/EN). Social proof uses only real, verifiable facts about the app — no fabricated numbers or testimonials.

## Routing changes
- `src/app/page.tsx` → new **LandingPage** (client component).
- Current Generate tool moves to `src/app/generate/page.tsx` (content unchanged).
- `Header.tsx`: the "Generate" pill nav item points to `/generate`; the logo links to `/` (landing).
- Internal links that meant "open the Generate tool" at `/` are repointed to `/generate` (e.g. `generateFromKeyword` in keywords page; CommandPalette nav entry).

## Sections (top → bottom)
1. **Top bar** (sticky glass): logo + wordmark, VI/EN toggle, "Mở app / Launch" CTA → `/generate`.
2. **Hero**: large headline + subheadline, primary CTA (→ `/generate`) + secondary (scroll to features), gradient/mockup panel.
3. **Stats strip** (social proof, real facts): 4 tools · 6 themes · up to 500 assets/scan · bilingual · no login.
4. **Features grid**: 4 cards (Generate / Analytics / Keywords / Trends) — icon + description + link to each route.
5. **Benefits**: 3–4 real points (stateless/no-login, REST API bypasses IP blocking, TXT/CSV export, instant theme switching).
6. **How it works**: 3 steps (paste URL/keyword → run → export TXT/CSV).
7. **Final CTA** band: headline + button → `/generate`.
8. **Footer**: links to the 4 tools, VI/EN, copyright.

## Technical
- LandingPage is a client component (for VI/EN toggle + smooth scroll).
- Styles: scoped `.lp-*` classes appended to `globals.css`; landing has its own fixed palette/spacing and does NOT depend on the 6-theme switcher.
- Copy: bilingual `lp_*` keys added to `src/lib/i18n.ts`; uses existing `useT` + language store; VI/EN toggle wired to the same store.
- Animation: CSS fade-up on scroll; respects `prefers-reduced-motion`. No new animation library.
- Brand consistency: reuse the violet→cyan gradient and Space Grotesk/Inter/JetBrains Mono fonts already loaded.

## Out of scope (YAGNI)
No backend, no signup/email capture, no blog/pricing, no new animation/UI library.

## Verification
- `/` renders the landing; `/generate` renders the original Generate tool.
- Header pill "Generate" → `/generate`; logo → `/`.
- VI/EN toggle switches all landing copy.
- `npx tsc --noEmit` and `npx next build` pass; all routes present.
