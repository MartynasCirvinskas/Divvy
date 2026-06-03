# EvenJar Marketing Site — Design Spec

**Date:** 2026-06-03
**Status:** Approved (design), pending implementation plan
**Owner:** EvenJar

## 1. Overview

A static marketing website for **EvenJar** — the all-in-one app for friend groups
(split bills, wishlists & gifting, birthdays, game-night scorekeeping; no accounts,
6-letter group codes, no ads, no caps). The site informs prospective users, teaches
the app via tutorials, ranks for relevant search terms via SEO articles, and drives
installs via direct download links.

Audience: people looking for a Splitwise alternative / group expense + utility app.
Positioning: "the Splitwise you remember — no accounts, no ads, no caps."

## 2. Goals / Non-Goals

**Goals**
- Clearly communicate what EvenJar does and why it's better than the alternatives.
- Teach core flows with step-by-step **tutorials**.
- Publish **SEO-optimized articles** that rank and funnel to download.
- Drive installs via **direct download** (Android APK now; store links when live).
- Excellent Core Web Vitals + on-page SEO (static, fast, structured data).
- Ship a **privacy policy** page (required for Play Store; per `USER_TODO.md`).

**Non-Goals (v1)**
- No backend/app logic, no auth, no user accounts on the site.
- No i18n yet — **English-only v1** (Lithuanian/i18n is a later pass).
- No CMS — content authored as MDX files in-repo.
- No analytics/marketing pixels in v1 (easy to add later; note placeholder).

## 3. Tech Stack

- **Astro** (latest) + **TypeScript**, static output (`output: 'static'`).
- **Tailwind CSS** via `@astrojs/tailwind` for styling + a small design-token layer.
- **`@astrojs/mdx`** — author tutorials & articles in MDX.
- **`@astrojs/sitemap`** — auto `sitemap-index.xml`.
- **`@astrojs/rss`** — `/rss.xml` blog feed.
- Fonts: Plus Jakarta Sans (display) + Inter (body), self-hosted via `@fontsource`.
- No client JS framework; tiny vanilla JS only where needed (mobile nav, FAQ toggle).

## 4. Repository Layout

The site lives in a **`web/` subfolder** with its own `package.json` and
`node_modules`, fully isolated from the Expo app (no shared tooling/config).

```
web/
├── package.json
├── astro.config.mjs
├── tailwind.config.mjs
├── tsconfig.json
├── src/
│   ├── config.ts                 # site URL, download links, social, nav
│   ├── content/
│   │   ├── config.ts             # collection schemas (tutorials, blog)
│   │   ├── tutorials/*.mdx
│   │   └── blog/*.mdx
│   ├── components/               # Hero, FeatureCard, Step, CTA, SEO, Nav, Footer, ArticleCard, FaqItem, DownloadButtons
│   ├── layouts/                  # BaseLayout, ArticleLayout, TutorialLayout
│   ├── pages/
│   │   ├── index.astro
│   │   ├── features.astro
│   │   ├── download.astro
│   │   ├── privacy.astro
│   │   ├── tutorials/index.astro
│   │   ├── tutorials/[...slug].astro
│   │   ├── blog/index.astro
│   │   ├── blog/[...slug].astro
│   │   ├── rss.xml.ts
│   │   └── 404.astro
│   └── styles/global.css
└── public/                       # favicon, og images, robots.txt, screenshots, /downloads/*.apk
```

## 5. Sitemap & Page Specs

- **`/` Home** — Hero (headline, subhead, primary "Download" + secondary "See how it
  works", app screenshot/mock); 4 feature highlights (Split bills · Wishlists & gifting
  · Birthdays · Game-night scores); "How it works" 3 steps (Create or join a group →
  Use the tools → Settle up / stay in sync); anti-Splitwise positioning band; FAQ (6
  Q&A, `FAQPage` JSON-LD); final download CTA.
- **`/features`** — One detailed section per pillar with benefit copy + screenshot +
  link to the matching tutorial. `SoftwareApplication` JSON-LD on this page.
- **`/tutorials`** — Grid of tutorials sorted by `order`, grouped by `feature`.
- **`/tutorials/[slug]`** — Rendered MDX with steps; `BreadcrumbList` + `HowTo`/`Article`
  JSON-LD; "next tutorial" + download CTA at the end.
- **`/blog`** — Reverse-chronological article cards (title, description, date, tags).
- **`/blog/[slug]`** — Rendered MDX article; `Article` JSON-LD; author/date; related
  links; download CTA.
- **`/download`** — Platform buttons (Android APK, Play Store, App Store), QR code to
  APK, install instructions, "is it safe / no account" reassurance.
- **`/privacy`** — Privacy policy reflecting the app's anonymous, no-PII model
  (Firebase Anonymous Auth, group/expense data only, optional Google sign-in).
- **`404`** — Friendly message + links home/tutorials.

## 6. Content Model (Astro Content Collections)

`src/content/config.ts` (Zod schemas):

- **tutorials**: `title: string`, `description: string`, `order: number`,
  `feature: enum('expenses','wishlists','birthdays','games','general')`,
  `updatedDate: date`, `draft: boolean = false`.
- **blog**: `title: string`, `description: string`, `pubDate: date`,
  `updatedDate: date?`, `tags: string[]`, `author: string = 'EvenJar'`,
  `image: string?`, `draft: boolean = false`.

Drafts excluded from production builds and listings.

## 7. SEO Requirements

- Reusable `<SEO>` component: title, meta description, canonical URL, OpenGraph
  (type, title, description, image, url), Twitter `summary_large_image`, and a
  `<JsonLd>` slot.
- Structured data: `SoftwareApplication` (features page), `Article` (blog/tutorials),
  `HowTo` (tutorials where steps apply), `FAQPage` (home FAQ), `BreadcrumbList`.
- `@astrojs/sitemap` sitemap, `public/robots.txt` (allow all + sitemap ref),
  `/rss.xml` blog feed (linked in `<head>`).
- Per-page unique `<title>` + description; semantic headings; descriptive alt text;
  fast static pages for Core Web Vitals; OG images in `public/og/`.

## 8. Design System (bright & playful — cozy "jar" vibe)

- **Colors:** warm cream background (`#FFFBF5`-ish), ink text (`#1C1917`), **honey/amber
  primary** (`#F5A524`-ish), friendly secondary (teal `#0EA5A4` or coral — finalize in
  build), soft surfaces, gentle shadows.
- **Type:** Plus Jakarta Sans (headings, bold/round), Inter (body). Generous sizing.
- **Shape:** rounded-2xl cards, pill buttons, 🫙 motif, subtle illustration/emoji accents.
- **Layout:** centered max-width container, responsive grid, mobile-first.
- **A11y:** WCAG AA contrast, focus states, reduced-motion respect, keyboard-nav.
- Tokens defined in `tailwind.config.mjs` + `global.css` (CSS variables).

## 9. Download Handling (pre-launch)

`src/config.ts` exposes:
```ts
export const downloads = {
  androidApkUrl: '',   // e.g. /downloads/evenjar-latest.apk or GitHub release URL
  playStoreUrl: '',
  appStoreUrl: '',
};
```
A `DownloadButtons` component renders a live button when a URL is set, otherwise a
disabled **"Coming soon"** badge. Site ships now; links flip on as builds go live.

## 10. Initial Content (written for real, not placeholder)

**Tutorials (6):** create/join a group · add an expense (equal/custom/%) ·
multi-currency expenses · settle up & simplify debts · share a group by link ·
wishlists & claiming gifts without spoilers.

**Blog/SEO articles (4):** "Best Splitwise alternative with no account (2026)" ·
"How to split rent & bills with roommates fairly" · "Track board-game scores from
everyone's phone" · "Group gift wishlists without spoiling the surprise."

Screenshots: use placeholder image frames initially; swap real app captures later.

## 11. Build & Deploy

- `cd web && npm install && npm run dev` (local), `npm run build` → static `dist/`.
- Deploy `dist/` to Hostinger (panel upload / FTP, or the Hostinger hosting MCP
  `hosting_deployStaticWebsite` once an API token is configured).
- Domain registration and DNS are **manual** (MCP currently unauthenticated):
  point `evenjar.com` (+ `www`) at the Hostinger site.
- `site` URL in `astro.config.mjs` set to `https://evenjar.com` for correct
  canonical/sitemap/OG absolute URLs.

## 12. Performance & Quality Targets

- Lighthouse: Performance ≥ 95, SEO 100, Accessibility ≥ 95, Best Practices ≥ 95.
- Zero render-blocking JS on content pages; images sized/lazy; fonts preloaded.

## 13. Out of Scope (future passes)

- i18n / Lithuanian translation.
- Analytics (Plausible/GA4), cookie banner (only if analytics added).
- Newsletter/waitlist capture (CTA is direct-download for v1).
- Real app screenshots/video, blog author pages, search.
- CI deploy automation.
