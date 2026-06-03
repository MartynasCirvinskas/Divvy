# EvenJar Marketing Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fast, SEO-optimized static marketing site for EvenJar (Astro) in a `web/` subfolder — home, features, tutorials, SEO blog, download, and privacy pages — with a bright/playful design and direct-download CTAs.

**Architecture:** Astro static-output site, isolated in `web/` with its own package.json. Tailwind for styling + design tokens. MDX content collections for tutorials and blog articles. A reusable SEO component emits meta/OG/JSON-LD. Two pieces of real logic (download-button state, content sorting/date formatting) are extracted into `src/lib/` and unit-tested with Vitest. Everything else is verified via `astro check`, `astro build`, local preview, and Lighthouse.

**Tech Stack:** Astro, TypeScript, Tailwind CSS, `@astrojs/mdx`, `@astrojs/sitemap`, `@astrojs/rss`, `@fontsource` (Plus Jakarta Sans + Inter), Vitest.

**Spec:** `docs/superpowers/specs/2026-06-03-evenjar-marketing-site-design.md`

**Conventions for every task:** all paths are relative to repo root. Run commands from `web/` unless stated. Commit after each task. Branch is `feat/marketing-site` (already created).

---

## File Structure (decomposition)

```
web/
├── package.json                     # site deps + scripts
├── astro.config.mjs                 # integrations, site URL
├── tailwind.config.mjs              # design tokens
├── tsconfig.json
├── vitest.config.ts                 # unit tests for src/lib
├── .gitignore
├── README.md                        # local dev + deploy notes
├── public/
│   ├── robots.txt
│   ├── favicon.svg
│   ├── og/og-default.png            # placeholder OG image
│   └── downloads/.gitkeep           # APKs dropped here later
└── src/
    ├── config.ts                    # SITE, NAV, downloads, social
    ├── lib/
    │   ├── content.ts               # sortByOrder, formatDate (tested)
    │   └── downloads.ts             # downloadState() (tested)
    ├── styles/global.css            # tokens + base
    ├── content/
    │   ├── config.ts                # tutorials + blog schemas
    │   ├── tutorials/*.mdx           # 6 files
    │   └── blog/*.mdx                # 4 files
    ├── components/
    │   ├── SEO.astro
    │   ├── Nav.astro
    │   ├── Footer.astro
    │   ├── Hero.astro
    │   ├── FeatureCard.astro
    │   ├── Step.astro
    │   ├── CTA.astro
    │   ├── DownloadButtons.astro
    │   ├── FaqItem.astro
    │   └── ArticleCard.astro
    ├── layouts/
    │   ├── BaseLayout.astro
    │   ├── ArticleLayout.astro
    │   └── TutorialLayout.astro
    └── pages/
        ├── index.astro
        ├── features.astro
        ├── download.astro
        ├── privacy.astro
        ├── 404.astro
        ├── rss.xml.ts
        ├── tutorials/index.astro
        ├── tutorials/[...slug].astro
        ├── blog/index.astro
        └── blog/[...slug].astro
```

---

## Task 1: Scaffold the Astro project in `web/`

**Files:**
- Create: `web/package.json`
- Create: `web/astro.config.mjs`
- Create: `web/tsconfig.json`
- Create: `web/.gitignore`
- Create: `web/src/pages/index.astro` (temporary smoke page, replaced in Task 6)

- [ ] **Step 1: Create `web/package.json`**

```json
{
  "name": "evenjar-web",
  "type": "module",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check",
    "test": "vitest run"
  },
  "dependencies": {
    "@astrojs/mdx": "^3.1.0",
    "@astrojs/rss": "^4.0.7",
    "@astrojs/sitemap": "^3.1.6",
    "@astrojs/tailwind": "^5.1.0",
    "@fontsource/inter": "^5.0.18",
    "@fontsource/plus-jakarta-sans": "^5.0.20",
    "astro": "^4.11.0",
    "tailwindcss": "^3.4.4"
  },
  "devDependencies": {
    "@astrojs/check": "^0.7.0",
    "typescript": "^5.4.5",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Create `web/astro.config.mjs`**

```js
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://evenjar.com',
  integrations: [tailwind(), mdx(), sitemap()],
});
```

- [ ] **Step 3: Create `web/tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```

- [ ] **Step 4: Create `web/.gitignore`**

```
dist/
node_modules/
.astro/
```

- [ ] **Step 5: Create temporary `web/src/pages/index.astro`**

```astro
<html lang="en">
  <head><title>EvenJar</title></head>
  <body><h1>EvenJar — coming soon</h1></body>
</html>
```

- [ ] **Step 6: Install deps**

Run: `cd web && npm install`
Expected: installs without errors; creates `web/node_modules` and `web/package-lock.json`.

- [ ] **Step 7: Verify dev/build works**

Run: `cd web && npm run build`
Expected: build succeeds, creates `web/dist/index.html`.

- [ ] **Step 8: Commit**

```bash
git add web/package.json web/package-lock.json web/astro.config.mjs web/tsconfig.json web/.gitignore web/src/pages/index.astro
git commit -m "feat(web): scaffold Astro marketing site"
```

---

## Task 2: Tailwind design tokens + global styles + fonts

**Files:**
- Create: `web/tailwind.config.mjs`
- Create: `web/src/styles/global.css`

- [ ] **Step 1: Create `web/tailwind.config.mjs`** (bright/playful tokens)

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FFFBF5',
        ink: '#1C1917',
        honey: { DEFAULT: '#F5A524', dark: '#D98A0B', light: '#FFE9C2' },
        teal: { DEFAULT: '#0EA5A4', dark: '#0B807F' },
        coral: '#FF6B6B',
        surface: '#FFFFFF',
        muted: '#78716C',
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: { '2xl': '1.25rem', '3xl': '1.75rem' },
      boxShadow: { soft: '0 8px 30px rgba(28,25,23,0.08)' },
      maxWidth: { content: '72rem' },
    },
  },
  plugins: [],
};
```

- [ ] **Step 2: Create `web/src/styles/global.css`**

```css
@import '@fontsource/plus-jakarta-sans/400.css';
@import '@fontsource/plus-jakarta-sans/700.css';
@import '@fontsource/plus-jakarta-sans/800.css';
@import '@fontsource/inter/400.css';
@import '@fontsource/inter/500.css';
@import '@fontsource/inter/600.css';

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html { scroll-behavior: smooth; }
  body { @apply bg-cream text-ink font-body antialiased; }
  h1, h2, h3, h4 { @apply font-display font-extrabold tracking-tight; }
  a { @apply transition-colors; }
  :focus-visible { @apply outline-2 outline-offset-2 outline-honey-dark; }
}

@layer components {
  .container-x { @apply mx-auto w-full max-w-content px-5 sm:px-8; }
  .btn { @apply inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-display font-bold transition; }
  .btn-primary { @apply btn bg-honey text-ink hover:bg-honey-dark; }
  .btn-secondary { @apply btn bg-surface text-ink shadow-soft hover:bg-honey-light; }
  .card { @apply rounded-2xl bg-surface p-6 shadow-soft; }
}

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
}
```

- [ ] **Step 3: Verify build still works**

Run: `cd web && npm run build`
Expected: build succeeds (CSS compiles; no Tailwind errors).

- [ ] **Step 4: Commit**

```bash
git add web/tailwind.config.mjs web/src/styles/global.css
git commit -m "feat(web): design tokens, global styles, fonts"
```

---

## Task 3: Site config + tested lib utilities (TDD)

**Files:**
- Create: `web/src/config.ts`
- Create: `web/src/lib/downloads.ts`
- Create: `web/src/lib/content.ts`
- Create: `web/vitest.config.ts`
- Test: `web/src/lib/downloads.test.ts`
- Test: `web/src/lib/content.test.ts`

- [ ] **Step 1: Create `web/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'node', include: ['src/**/*.test.ts'] } });
```

- [ ] **Step 2: Create `web/src/config.ts`**

```ts
export const SITE = {
  name: 'EvenJar',
  tagline: 'One app for everything your group shares.',
  description:
    'EvenJar is the all-in-one app for friend groups: split bills fairly, share wishlists, remember birthdays, and track game-night scores — no accounts, no ads, no caps.',
  url: 'https://evenjar.com',
  emoji: '🫙',
};

export const NAV = [
  { label: 'Features', href: '/features' },
  { label: 'Tutorials', href: '/tutorials' },
  { label: 'Blog', href: '/blog' },
  { label: 'Download', href: '/download' },
];

/** Fill these in as builds go live. Empty string => "Coming soon". */
export const downloads = {
  androidApkUrl: '',
  playStoreUrl: '',
  appStoreUrl: '',
};

export const SOCIAL = {
  github: 'https://github.com/MartynasCirvinskas/EvenJar',
};
```

- [ ] **Step 3: Write failing test `web/src/lib/downloads.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { downloadState } from './downloads';

describe('downloadState', () => {
  it('returns "coming-soon" for an empty url', () => {
    expect(downloadState('')).toBe('coming-soon');
  });
  it('returns "live" for a real url', () => {
    expect(downloadState('/downloads/evenjar.apk')).toBe('live');
  });
  it('treats whitespace-only as coming-soon', () => {
    expect(downloadState('   ')).toBe('coming-soon');
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd web && npx vitest run src/lib/downloads.test.ts`
Expected: FAIL — cannot find module `./downloads`.

- [ ] **Step 5: Implement `web/src/lib/downloads.ts`**

```ts
export type DownloadState = 'live' | 'coming-soon';

export function downloadState(url: string | undefined | null): DownloadState {
  return url && url.trim().length > 0 ? 'live' : 'coming-soon';
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd web && npx vitest run src/lib/downloads.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 7: Write failing test `web/src/lib/content.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { sortByOrder, formatDate } from './content';

describe('sortByOrder', () => {
  it('sorts ascending by data.order', () => {
    const items = [
      { data: { order: 3 } },
      { data: { order: 1 } },
      { data: { order: 2 } },
    ];
    expect(sortByOrder(items).map((i) => i.data.order)).toEqual([1, 2, 3]);
  });
});

describe('formatDate', () => {
  it('formats a date as "Mon D, YYYY"', () => {
    expect(formatDate(new Date('2026-06-03T00:00:00Z'))).toBe('Jun 3, 2026');
  });
});
```

- [ ] **Step 8: Run test to verify it fails**

Run: `cd web && npx vitest run src/lib/content.test.ts`
Expected: FAIL — cannot find module `./content`.

- [ ] **Step 9: Implement `web/src/lib/content.ts`**

```ts
export function sortByOrder<T extends { data: { order: number } }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.data.order - b.data.order);
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
```

- [ ] **Step 10: Run all lib tests to verify pass**

Run: `cd web && npm test`
Expected: PASS (4 tests across 2 files).

- [ ] **Step 11: Commit**

```bash
git add web/src/config.ts web/src/lib web/vitest.config.ts
git commit -m "feat(web): site config + tested download/content utils"
```

---

## Task 4: Content collections (tutorials + blog schemas)

**Files:**
- Create: `web/src/content/config.ts`
- Create: `web/src/content/tutorials/create-or-join-a-group.mdx` (one seed file so the collection is non-empty)

- [ ] **Step 1: Create `web/src/content/config.ts`**

```ts
import { defineCollection, z } from 'astro:content';

const tutorials = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    order: z.number(),
    feature: z.enum(['expenses', 'wishlists', 'birthdays', 'games', 'general']),
    updatedDate: z.coerce.date(),
    draft: z.boolean().default(false),
  }),
});

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    author: z.string().default('EvenJar'),
    image: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { tutorials, blog };
```

- [ ] **Step 2: Create seed `web/src/content/tutorials/create-or-join-a-group.mdx`**

```mdx
---
title: Create or join a group in EvenJar
description: Start a new group or hop into a friend's with a 6-letter code — no account needed.
order: 1
feature: general
updatedDate: 2026-06-03
---

Every EvenJar activity lives inside a **group**. You don't need an account — your
group is identified by a short 6-letter code you can share with anyone.

## Create a group

1. Open EvenJar and tap **New group**.
2. Give it a name (e.g. "Flat 4B" or "Catan Night").
3. EvenJar generates a 6-letter code and drops you straight in.

## Join a group

1. Tap **Join group**.
2. Enter the 6-letter code a friend shared, or open their invite link.
3. Confirm your name — that's it, you're in.

> Tip: share a group instantly with a link. See [Share a group by link](/tutorials/share-a-group-by-link).
```

- [ ] **Step 3: Verify the collection type-checks**

Run: `cd web && npm run check`
Expected: 0 errors (Astro generates `.astro/types.d.ts` for the collections).

- [ ] **Step 4: Commit**

```bash
git add web/src/content
git commit -m "feat(web): content collections for tutorials and blog"
```

---

## Task 5: SEO component + BaseLayout + Nav + Footer

**Files:**
- Create: `web/src/components/SEO.astro`
- Create: `web/src/components/Nav.astro`
- Create: `web/src/components/Footer.astro`
- Create: `web/src/layouts/BaseLayout.astro`

- [ ] **Step 1: Create `web/src/components/SEO.astro`**

```astro
---
import { SITE } from '../config';
interface Props {
  title?: string;
  description?: string;
  image?: string;
  type?: 'website' | 'article';
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}
const { title, description = SITE.description, image = '/og/og-default.png', type = 'website', jsonLd } = Astro.props;
const fullTitle = title ? `${title} — ${SITE.name}` : `${SITE.name} — ${SITE.tagline}`;
const canonical = new URL(Astro.url.pathname, SITE.url).href;
const ogImage = new URL(image, SITE.url).href;
---
<title>{fullTitle}</title>
<meta name="description" content={description} />
<link rel="canonical" href={canonical} />
<meta property="og:type" content={type} />
<meta property="og:title" content={fullTitle} />
<meta property="og:description" content={description} />
<meta property="og:url" content={canonical} />
<meta property="og:image" content={ogImage} />
<meta property="og:site_name" content={SITE.name} />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content={fullTitle} />
<meta name="twitter:description" content={description} />
<meta name="twitter:image" content={ogImage} />
{jsonLd && <script type="application/ld+json" set:html={JSON.stringify(jsonLd)} />}
```

- [ ] **Step 2: Create `web/src/components/Nav.astro`**

```astro
---
import { SITE, NAV } from '../config';
---
<header class="border-b border-honey-light/60 bg-cream/80 backdrop-blur sticky top-0 z-30">
  <nav class="container-x flex items-center justify-between py-4">
    <a href="/" class="font-display text-xl font-extrabold">{SITE.emoji} {SITE.name}</a>
    <ul class="hidden items-center gap-7 md:flex">
      {NAV.map((item) => (
        <li><a href={item.href} class="font-display font-bold text-ink hover:text-honey-dark">{item.label}</a></li>
      ))}
    </ul>
    <a href="/download" class="btn-primary hidden md:inline-flex">Get the app</a>
    <a href="/download" class="btn-primary md:hidden">Get</a>
  </nav>
</header>
```

- [ ] **Step 3: Create `web/src/components/Footer.astro`**

```astro
---
import { SITE, NAV, SOCIAL } from '../config';
const year = new Date().getFullYear();
---
<footer class="mt-24 border-t border-honey-light/60 bg-surface">
  <div class="container-x grid gap-8 py-12 sm:grid-cols-3">
    <div>
      <p class="font-display text-lg font-extrabold">{SITE.emoji} {SITE.name}</p>
      <p class="mt-2 max-w-xs text-sm text-muted">{SITE.tagline}</p>
    </div>
    <nav class="flex flex-col gap-2">
      {NAV.map((i) => <a class="text-sm text-muted hover:text-ink" href={i.href}>{i.label}</a>)}
      <a class="text-sm text-muted hover:text-ink" href="/privacy">Privacy</a>
    </nav>
    <div class="flex flex-col gap-2">
      <a class="text-sm text-muted hover:text-ink" href={SOCIAL.github}>GitHub</a>
      <a class="text-sm text-muted hover:text-ink" href="/rss.xml">RSS</a>
    </div>
  </div>
  <div class="container-x pb-8 text-xs text-muted">© {year} {SITE.name}. No accounts, no ads, no caps.</div>
</footer>
```

- [ ] **Step 4: Create `web/src/layouts/BaseLayout.astro`**

```astro
---
import '../styles/global.css';
import SEO from '../components/SEO.astro';
import Nav from '../components/Nav.astro';
import Footer from '../components/Footer.astro';
interface Props {
  title?: string;
  description?: string;
  image?: string;
  type?: 'website' | 'article';
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}
const props = Astro.props;
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="alternate" type="application/rss+xml" title="EvenJar Blog" href="/rss.xml" />
    <SEO {...props} />
  </head>
  <body>
    <Nav />
    <main><slot /></main>
    <Footer />
  </body>
</html>
```

- [ ] **Step 5: Verify build + check**

Run: `cd web && npm run check && npm run build`
Expected: 0 type errors; build succeeds.

- [ ] **Step 6: Commit**

```bash
git add web/src/components/SEO.astro web/src/components/Nav.astro web/src/components/Footer.astro web/src/layouts/BaseLayout.astro
git commit -m "feat(web): SEO component, base layout, nav, footer"
```

---

## Task 6: Reusable marketing components + Home page

**Files:**
- Create: `web/src/components/Hero.astro`
- Create: `web/src/components/FeatureCard.astro`
- Create: `web/src/components/Step.astro`
- Create: `web/src/components/CTA.astro`
- Create: `web/src/components/DownloadButtons.astro`
- Create: `web/src/components/FaqItem.astro`
- Modify (replace): `web/src/pages/index.astro`

- [ ] **Step 1: Create `web/src/components/DownloadButtons.astro`**

```astro
---
import { downloads } from '../config';
import { downloadState } from '../lib/downloads';
const platforms = [
  { label: 'Android (APK)', url: downloads.androidApkUrl },
  { label: 'Google Play', url: downloads.playStoreUrl },
  { label: 'App Store', url: downloads.appStoreUrl },
];
---
<div class="flex flex-wrap gap-3">
  {platforms.map((p) =>
    downloadState(p.url) === 'live' ? (
      <a href={p.url} class="btn-primary">⬇️ {p.label}</a>
    ) : (
      <span class="btn-secondary cursor-default opacity-70" aria-disabled="true">{p.label} · Coming soon</span>
    )
  )}
</div>
```

- [ ] **Step 2: Create `web/src/components/Hero.astro`**

```astro
---
import { SITE } from '../config';
import DownloadButtons from './DownloadButtons.astro';
---
<section class="container-x grid items-center gap-10 py-16 md:grid-cols-2 md:py-24">
  <div>
    <p class="font-display font-bold text-honey-dark">{SITE.emoji} The friend-group app</p>
    <h1 class="mt-3 text-4xl leading-tight sm:text-5xl">One jar for everything your group shares.</h1>
    <p class="mt-5 max-w-lg text-lg text-muted">
      Split bills fairly, share wishlists, remember birthdays, and track game-night scores —
      all in one app. No accounts. No ads. No caps.
    </p>
    <div class="mt-8"><DownloadButtons /></div>
    <p class="mt-3 text-sm text-muted">Free to use. Join a group with a 6-letter code in seconds.</p>
  </div>
  <div class="card grid place-items-center bg-honey-light/40 py-20">
    <span class="text-7xl" aria-hidden="true">🫙</span>
    <p class="mt-4 text-sm text-muted">App preview coming soon</p>
  </div>
</section>
```

- [ ] **Step 3: Create `web/src/components/FeatureCard.astro`**

```astro
---
interface Props { emoji: string; title: string; body: string; href?: string; }
const { emoji, title, body, href } = Astro.props;
const Tag = href ? 'a' : 'div';
---
<Tag href={href} class="card block hover:shadow-lg hover:-translate-y-0.5 transition">
  <span class="text-3xl" aria-hidden="true">{emoji}</span>
  <h3 class="mt-3 text-xl">{title}</h3>
  <p class="mt-2 text-muted">{body}</p>
  {href && <span class="mt-3 inline-block font-display font-bold text-honey-dark">Learn more →</span>}
</Tag>
```

- [ ] **Step 4: Create `web/src/components/Step.astro`**

```astro
---
interface Props { n: number; title: string; body: string; }
const { n, title, body } = Astro.props;
---
<div class="card text-center">
  <span class="mx-auto grid h-12 w-12 place-items-center rounded-full bg-honey font-display text-xl font-extrabold text-ink">{n}</span>
  <h3 class="mt-4 text-lg">{title}</h3>
  <p class="mt-2 text-sm text-muted">{body}</p>
</div>
```

- [ ] **Step 5: Create `web/src/components/CTA.astro`**

```astro
---
import DownloadButtons from './DownloadButtons.astro';
interface Props { heading?: string; }
const { heading = 'Ready to settle up — and everything else?' } = Astro.props;
---
<section class="container-x my-20">
  <div class="card flex flex-col items-center gap-6 bg-honey-light/50 py-14 text-center">
    <h2 class="text-3xl">{heading}</h2>
    <p class="max-w-md text-muted">Get EvenJar and bring your whole group into one place.</p>
    <DownloadButtons />
  </div>
</section>
```

- [ ] **Step 6: Create `web/src/components/FaqItem.astro`**

```astro
---
interface Props { q: string; }
const { q } = Astro.props;
---
<details class="card group">
  <summary class="cursor-pointer list-none font-display font-bold">{q}</summary>
  <div class="mt-3 text-muted"><slot /></div>
</details>
```

- [ ] **Step 7: Replace `web/src/pages/index.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import Hero from '../components/Hero.astro';
import FeatureCard from '../components/FeatureCard.astro';
import Step from '../components/Step.astro';
import CTA from '../components/CTA.astro';
import FaqItem from '../components/FaqItem.astro';
import { SITE } from '../config';

const features = [
  { emoji: '💸', title: 'Split bills fairly', body: 'Equal, custom, or percentage splits with multi-currency and debt-minimizing settle-up.', href: '/features#expenses' },
  { emoji: '🎁', title: 'Wishlists & gifting', body: 'Share what you want; friends claim gifts privately so surprises stay surprises.', href: '/features#wishlists' },
  { emoji: '🎂', title: 'Birthdays', body: 'Never miss a group birthday — everyone stays in the loop.', href: '/features#birthdays' },
  { emoji: '🎲', title: 'Game-night scores', body: 'Everyone joins the same scoreboard from their own phone. No passed-around device.', href: '/features#games' },
];

const faqs = [
  { q: 'Do I need an account?', a: 'No. EvenJar uses anonymous sign-in and 6-letter group codes — no email or password required.' },
  { q: 'Is it really free?', a: 'Yes. Core features are free with no ads and no limits on expenses or group size.' },
  { q: 'How is this different from Splitwise?', a: 'No accounts, no ads, no paywalled basics — plus wishlists, birthdays, and game-night scoring in the same app.' },
  { q: 'What currencies are supported?', a: 'Enter expenses in any currency; EvenJar converts to your group currency automatically.' },
  { q: 'Can friends join without installing?', a: 'A web companion at evenjar.app/g/CODE is on the roadmap; for now, sharing a link prompts install + join.' },
  { q: 'Where is my data stored?', a: 'Group and expense data live in Firebase. EvenJar collects no personally identifying information. See our Privacy page.' },
];

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
};
---
<BaseLayout jsonLd={jsonLd}>
  <Hero />

  <section class="container-x py-8">
    <h2 class="text-center text-3xl">Everything your group shares — in one app</h2>
    <div class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {features.map((f) => <FeatureCard {...f} />)}
    </div>
  </section>

  <section class="container-x py-16">
    <h2 class="text-center text-3xl">How it works</h2>
    <div class="mt-10 grid gap-6 sm:grid-cols-3">
      <Step n={1} title="Create or join a group" body="Start a group or join with a 6-letter code. No account needed." />
      <Step n={2} title="Use the tools" body="Add expenses, wishlists, birthdays, and scoreboards together." />
      <Step n={3} title="Stay even" body="EvenJar minimizes debts so the fewest payments settle the books." />
    </div>
  </section>

  <section class="container-x py-8">
    <h2 class="text-center text-3xl">The Splitwise you remember</h2>
    <p class="mx-auto mt-4 max-w-2xl text-center text-muted">No daily limits. No 10-second timers. No ads. EvenJar keeps the basics free, forever — and adds the rest of your group's life on top.</p>
  </section>

  <section class="container-x py-16">
    <h2 class="text-center text-3xl">Questions</h2>
    <div class="mx-auto mt-8 grid max-w-3xl gap-4">
      {faqs.map((f) => <FaqItem q={f.q}><p>{f.a}</p></FaqItem>)}
    </div>
  </section>

  <CTA />
</BaseLayout>
```

- [ ] **Step 8: Visual + build check**

Run: `cd web && npm run check && npm run build`
Then: `cd web && npm run preview` and open the printed URL; confirm the home page renders with hero, 4 feature cards, 3 steps, FAQ, CTA, "Coming soon" download badges.
Expected: renders correctly; no console errors.

- [ ] **Step 9: Commit**

```bash
git add web/src/components web/src/pages/index.astro
git commit -m "feat(web): home page + marketing components"
```

---

## Task 7: Features page

**Files:**
- Create: `web/src/pages/features.astro`

- [ ] **Step 1: Create `web/src/pages/features.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import CTA from '../components/CTA.astro';
import { SITE } from '../config';

const pillars = [
  { id: 'expenses', emoji: '💸', title: 'Split bills fairly',
    points: ['Equal, custom, or percentage splits', 'Multi-currency with automatic conversion', 'Recurring expenses (rent, utilities)', 'Debt minimization — fewest payments to settle', 'Per-debtor settle-up + CSV export'],
    tutorial: '/tutorials/add-an-expense' },
  { id: 'wishlists', emoji: '🎁', title: 'Wishlists & gifting',
    points: ['Share what you want with the group', 'Friends claim gifts privately', 'No duplicate gifts, no spoiled surprises'],
    tutorial: '/tutorials/wishlists-and-claiming-gifts' },
  { id: 'birthdays', emoji: '🎂', title: 'Birthdays',
    points: ['Group birthday awareness', 'Plan gifts ahead with wishlists', 'Keep everyone in the loop'],
    tutorial: '/tutorials/create-or-join-a-group' },
  { id: 'games', emoji: '🎲', title: 'Game-night scores',
    points: ['One scoreboard, every phone joins', 'No passed-around device', 'Live scores via the same join-code'],
    tutorial: '/tutorials/create-or-join-a-group' },
];

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: SITE.name,
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Android, iOS',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  description: SITE.description,
};
---
<BaseLayout title="Features" description="Everything EvenJar does: split bills, wishlists & gifting, birthdays, and game-night scorekeeping — in one free app." jsonLd={jsonLd}>
  <section class="container-x py-16 text-center">
    <h1 class="text-4xl sm:text-5xl">Everything your group shares</h1>
    <p class="mx-auto mt-4 max-w-2xl text-lg text-muted">Four tools, one app, zero accounts.</p>
  </section>

  {pillars.map((p, i) => (
    <section id={p.id} class="container-x py-12">
      <div class={`grid items-center gap-10 md:grid-cols-2 ${i % 2 ? 'md:[&>div:first-child]:order-2' : ''}`}>
        <div>
          <span class="text-4xl" aria-hidden="true">{p.emoji}</span>
          <h2 class="mt-3 text-3xl">{p.title}</h2>
          <ul class="mt-5 space-y-2">
            {p.points.map((pt) => <li class="flex gap-2 text-muted"><span aria-hidden="true">✅</span>{pt}</li>)}
          </ul>
          <a href={p.tutorial} class="mt-6 inline-block font-display font-bold text-honey-dark">See the tutorial →</a>
        </div>
        <div class="card grid place-items-center bg-honey-light/40 py-20"><span class="text-6xl" aria-hidden="true">{p.emoji}</span></div>
      </div>
    </section>
  ))}

  <CTA />
</BaseLayout>
```

- [ ] **Step 2: Build check**

Run: `cd web && npm run check && npm run build`
Expected: 0 errors; `dist/features/index.html` exists.

- [ ] **Step 3: Commit**

```bash
git add web/src/pages/features.astro
git commit -m "feat(web): features page"
```

---

## Task 8: Tutorials index + detail + remaining tutorial content

**Files:**
- Create: `web/src/layouts/TutorialLayout.astro`
- Create: `web/src/components/ArticleCard.astro`
- Create: `web/src/pages/tutorials/index.astro`
- Create: `web/src/pages/tutorials/[...slug].astro`
- Create: 5 more MDX files in `web/src/content/tutorials/` (see content specs)

- [ ] **Step 1: Create `web/src/components/ArticleCard.astro`**

```astro
---
interface Props { href: string; title: string; description: string; meta?: string; }
const { href, title, description, meta } = Astro.props;
---
<a href={href} class="card block hover:shadow-lg hover:-translate-y-0.5 transition">
  {meta && <p class="text-xs font-bold uppercase tracking-wide text-honey-dark">{meta}</p>}
  <h3 class="mt-1 text-xl">{title}</h3>
  <p class="mt-2 text-muted">{description}</p>
</a>
```

- [ ] **Step 2: Create `web/src/layouts/TutorialLayout.astro`**

```astro
---
import BaseLayout from './BaseLayout.astro';
import CTA from '../components/CTA.astro';
import { formatDate } from '../lib/content';
interface Props { title: string; description: string; updatedDate: Date; }
const { title, description, updatedDate } = Astro.props;
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: title,
  description,
  dateModified: updatedDate.toISOString(),
};
---
<BaseLayout title={title} description={description} type="article" jsonLd={jsonLd}>
  <article class="container-x max-w-3xl py-16">
    <a href="/tutorials" class="text-sm text-honey-dark">← All tutorials</a>
    <h1 class="mt-4 text-4xl">{title}</h1>
    <p class="mt-2 text-sm text-muted">Updated {formatDate(updatedDate)}</p>
    <div class="prose-evenjar mt-8 space-y-4 [&_h2]:mt-8 [&_h2]:text-2xl [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6 [&_a]:text-honey-dark [&_a]:underline">
      <slot />
    </div>
  </article>
  <CTA heading="Try it yourself" />
</BaseLayout>
```

- [ ] **Step 3: Create `web/src/pages/tutorials/index.astro`**

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import ArticleCard from '../../components/ArticleCard.astro';
import { sortByOrder } from '../../lib/content';
const all = (await getCollection('tutorials', ({ data }) => !data.draft));
const tutorials = sortByOrder(all);
const featureLabels: Record<string, string> = { expenses: 'Expenses', wishlists: 'Wishlists', birthdays: 'Birthdays', games: 'Game night', general: 'Getting started' };
---
<BaseLayout title="Tutorials" description="Step-by-step guides to get the most out of EvenJar — groups, expenses, wishlists, and more.">
  <section class="container-x py-16">
    <h1 class="text-4xl sm:text-5xl">Tutorials</h1>
    <p class="mt-4 max-w-2xl text-lg text-muted">Short, practical guides for every part of EvenJar.</p>
    <div class="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {tutorials.map((t) => (
        <ArticleCard href={`/tutorials/${t.slug}`} title={t.data.title} description={t.data.description} meta={featureLabels[t.data.feature]} />
      ))}
    </div>
  </section>
</BaseLayout>
```

- [ ] **Step 4: Create `web/src/pages/tutorials/[...slug].astro`**

```astro
---
import { getCollection } from 'astro:content';
import TutorialLayout from '../../layouts/TutorialLayout.astro';
export async function getStaticPaths() {
  const tutorials = await getCollection('tutorials', ({ data }) => !data.draft);
  return tutorials.map((t) => ({ params: { slug: t.slug }, props: { tutorial: t } }));
}
const { tutorial } = Astro.props;
const { Content } = await tutorial.render();
---
<TutorialLayout title={tutorial.data.title} description={tutorial.data.description} updatedDate={tutorial.data.updatedDate}>
  <Content />
</TutorialLayout>
```

- [ ] **Step 5: Write the 5 remaining tutorial MDX files**

Create each file below in `web/src/content/tutorials/` with frontmatter
(`title, description, order, feature, updatedDate: 2026-06-03`) and real step-by-step
body content following the seed file's style (intro paragraph + `## H2` sections +
numbered steps + a cross-link). Content specs:

| File | order | feature | title | description (meta) |
|---|---|---|---|---|
| `add-an-expense.mdx` | 2 | expenses | Add an expense and split it | Add a cost and split it equally, by exact amounts, or by percentage. |
| `multi-currency-expenses.mdx` | 3 | expenses | Add expenses in any currency | Enter a cost in any currency and let EvenJar convert it to your group's currency. |
| `settle-up-and-simplify-debts.mdx` | 4 | expenses | Settle up and simplify debts | See who owes whom and settle with the fewest possible payments. |
| `share-a-group-by-link.mdx` | 5 | general | Share a group by link | Invite friends with a tap — they open the link and join your group instantly. |
| `wishlists-and-claiming-gifts.mdx` | 6 | wishlists | Wishlists and claiming gifts | Share a wishlist and let friends claim gifts privately, so surprises stay secret. |

Body requirements per file (write real prose, not placeholders):
- `add-an-expense`: who paid, amount, split modes (Equal/Custom/Percentage), saving; note integer-cent accuracy.
- `multi-currency-expenses`: choosing a currency per expense, automatic conversion to group currency, where the converted total shows.
- `settle-up-and-simplify-debts`: the balances view, "simplify debts" concept (fewest payments), tapping "I paid this back" / "Mark settled" per debt row.
- `share-a-group-by-link`: copy/share link, what the recipient sees, the `evenjar://g/CODE` + `https://evenjar.app/g/CODE` formats, code entry fallback.
- `wishlists-and-claiming-gifts`: add wish items, how claiming is hidden from the owner, marking claimed, avoiding duplicate gifts.

- [ ] **Step 6: Build check (all tutorial pages generate)**

Run: `cd web && npm run check && npm run build`
Expected: 0 errors; `dist/tutorials/index.html` + one folder per tutorial slug exist.

- [ ] **Step 7: Commit**

```bash
git add web/src/layouts/TutorialLayout.astro web/src/components/ArticleCard.astro web/src/pages/tutorials web/src/content/tutorials
git commit -m "feat(web): tutorials index, detail pages, and 6 tutorials"
```

---

## Task 9: Blog index + detail + RSS + 4 SEO articles

**Files:**
- Create: `web/src/layouts/ArticleLayout.astro`
- Create: `web/src/pages/blog/index.astro`
- Create: `web/src/pages/blog/[...slug].astro`
- Create: `web/src/pages/rss.xml.ts`
- Create: 4 MDX files in `web/src/content/blog/`

- [ ] **Step 1: Create `web/src/layouts/ArticleLayout.astro`**

```astro
---
import BaseLayout from './BaseLayout.astro';
import CTA from '../components/CTA.astro';
import { formatDate } from '../lib/content';
interface Props { title: string; description: string; pubDate: Date; updatedDate?: Date; author: string; tags: string[]; image?: string; }
const { title, description, pubDate, updatedDate, author, tags, image } = Astro.props;
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: title,
  description,
  author: { '@type': 'Organization', name: author },
  datePublished: pubDate.toISOString(),
  dateModified: (updatedDate ?? pubDate).toISOString(),
};
---
<BaseLayout title={title} description={description} type="article" image={image} jsonLd={jsonLd}>
  <article class="container-x max-w-3xl py-16">
    <a href="/blog" class="text-sm text-honey-dark">← All articles</a>
    <h1 class="mt-4 text-4xl">{title}</h1>
    <p class="mt-2 text-sm text-muted">By {author} · {formatDate(pubDate)}</p>
    {tags.length > 0 && <div class="mt-3 flex flex-wrap gap-2">{tags.map((t) => <span class="rounded-full bg-honey-light px-3 py-1 text-xs font-bold text-honey-dark">{t}</span>)}</div>}
    <div class="prose-evenjar mt-8 space-y-4 [&_h2]:mt-8 [&_h2]:text-2xl [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6 [&_a]:text-honey-dark [&_a]:underline">
      <slot />
    </div>
  </article>
  <CTA />
</BaseLayout>
```

- [ ] **Step 2: Create `web/src/pages/blog/index.astro`**

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import ArticleCard from '../../components/ArticleCard.astro';
import { formatDate } from '../../lib/content';
const posts = (await getCollection('blog', ({ data }) => !data.draft))
  .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
---
<BaseLayout title="Blog" description="Guides and ideas for splitting costs, group gifting, and game nights — from the EvenJar team.">
  <section class="container-x py-16">
    <h1 class="text-4xl sm:text-5xl">Blog</h1>
    <p class="mt-4 max-w-2xl text-lg text-muted">Practical guides for shared expenses, gifting, and group life.</p>
    <div class="mt-10 grid gap-6 sm:grid-cols-2">
      {posts.map((p) => (
        <ArticleCard href={`/blog/${p.slug}`} title={p.data.title} description={p.data.description} meta={formatDate(p.data.pubDate)} />
      ))}
    </div>
  </section>
</BaseLayout>
```

- [ ] **Step 3: Create `web/src/pages/blog/[...slug].astro`**

```astro
---
import { getCollection } from 'astro:content';
import ArticleLayout from '../../layouts/ArticleLayout.astro';
export async function getStaticPaths() {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return posts.map((p) => ({ params: { slug: p.slug }, props: { post: p } }));
}
const { post } = Astro.props;
const { Content } = await post.render();
const d = post.data;
---
<ArticleLayout title={d.title} description={d.description} pubDate={d.pubDate} updatedDate={d.updatedDate} author={d.author} tags={d.tags} image={d.image}>
  <Content />
</ArticleLayout>
```

- [ ] **Step 4: Create `web/src/pages/rss.xml.ts`**

```ts
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE } from '../config';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = (await getCollection('blog', ({ data }) => !data.draft))
    .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
  return rss({
    title: `${SITE.name} Blog`,
    description: SITE.description,
    site: context.site ?? SITE.url,
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.description,
      pubDate: p.data.pubDate,
      link: `/blog/${p.slug}/`,
    })),
  });
}
```

- [ ] **Step 5: Write the 4 SEO article MDX files**

Create each in `web/src/content/blog/` with frontmatter
(`title, description, pubDate: 2026-06-03, tags, author: 'EvenJar'`) and real,
800–1200 word articles (intro, `## H2` sections, practical steps, internal links to
relevant `/tutorials/...` and `/features`, and a closing line nudging download).
Content specs:

| File (slug) | Target keyword | Title | Meta description |
|---|---|---|---|
| `best-splitwise-alternative-no-account.mdx` | splitwise alternative no account | The best Splitwise alternative with no account (2026) | Looking for a Splitwise alternative without sign-up, ads, or limits? Here's how EvenJar compares. |
| `how-to-split-rent-and-bills-with-roommates.mdx` | split rent and bills with roommates | How to split rent and bills with roommates fairly | A simple system for splitting rent, utilities, and shared costs with roommates — without awkward math. |
| `track-board-game-scores-from-everyones-phone.mdx` | board game score tracker app | Track board-game scores from everyone's phone | Stop passing one phone around the table. Here's how to run a shared scoreboard everyone joins. |
| `group-gift-wishlists-without-spoiling-the-surprise.mdx` | group gift wishlist app | Group gift wishlists without spoiling the surprise | How to organize group gifts and wishlists so nobody buys duplicates — and surprises stay secret. |

Each article MUST:
- Open with the problem and who it's for.
- Include at least 3 `## H2` sections with actionable advice.
- Link to ≥1 tutorial and the `/features` page using markdown links.
- End with a one-line CTA pointing to `/download`.
- Avoid keyword stuffing; write naturally for humans.

- [ ] **Step 6: Build check (blog pages + RSS generate)**

Run: `cd web && npm run check && npm run build`
Then confirm `dist/blog/index.html`, per-post folders, and `dist/rss.xml` exist.
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add web/src/layouts/ArticleLayout.astro web/src/pages/blog web/src/pages/rss.xml.ts web/src/content/blog
git commit -m "feat(web): blog index, articles, RSS, 4 SEO posts"
```

---

## Task 10: Download page + Privacy page + 404

**Files:**
- Create: `web/src/pages/download.astro`
- Create: `web/src/pages/privacy.astro`
- Create: `web/src/pages/404.astro`

- [ ] **Step 1: Create `web/src/pages/download.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import DownloadButtons from '../components/DownloadButtons.astro';
import { downloads } from '../config';
import { downloadState } from '../lib/downloads';
const androidLive = downloadState(downloads.androidApkUrl) === 'live';
---
<BaseLayout title="Download" description="Get EvenJar for Android and iOS. Free, no account required.">
  <section class="container-x max-w-2xl py-16 text-center">
    <h1 class="text-4xl sm:text-5xl">Get EvenJar</h1>
    <p class="mt-4 text-lg text-muted">Free to use. No account. Join a group with a 6-letter code in seconds.</p>
    <div class="mt-8 flex justify-center"><DownloadButtons /></div>

    <div class="card mt-12 text-left">
      <h2 class="text-xl">Installing the Android APK</h2>
      <ol class="mt-3 list-decimal space-y-1 pl-6 text-muted">
        <li>Tap the Android (APK) button above to download.</li>
        <li>Open the downloaded file; allow installs from your browser if prompted.</li>
        <li>Open EvenJar and create or join a group.</li>
      </ol>
      {!androidLive && <p class="mt-4 text-sm text-muted">Android build links go live soon — check back shortly.</p>}
    </div>

    <p class="mt-10 text-sm text-muted">No ads. No caps. No personally identifying information collected — see our <a class="text-honey-dark underline" href="/privacy">Privacy policy</a>.</p>
  </section>
</BaseLayout>
```

- [ ] **Step 2: Create `web/src/pages/privacy.astro`** (reflects the app's no-PII model)

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { SITE } from '../config';
const updated = 'June 3, 2026';
---
<BaseLayout title="Privacy Policy" description="How EvenJar handles your data: anonymous by default, no personally identifying information collected.">
  <article class="container-x max-w-3xl py-16 [&_h2]:mt-8 [&_h2]:text-2xl [&_p]:mt-3 [&_p]:text-muted [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-muted">
    <h1 class="text-4xl">Privacy Policy</h1>
    <p>Last updated: {updated}</p>

    <h2>The short version</h2>
    <p>{SITE.name} is designed to collect as little as possible. There are no accounts by default, no ads, and no tracking. We do not collect personally identifying information.</p>

    <h2>What we store</h2>
    <ul>
      <li><strong>Group and activity data</strong> — group names, expenses, wishlists, birthdays, and scores you enter — stored in Google Firebase so your group can sync.</li>
      <li><strong>An anonymous device identity</strong> — a random ID used to attribute your entries within a group. It is not linked to your real identity.</li>
      <li><strong>A display name</strong> you choose, visible only to members of your groups.</li>
    </ul>

    <h2>Optional Google sign-in</h2>
    <p>If you choose to link a Google account (optional), we use it only to recover your profile across devices. We never post anything or read your contacts.</p>

    <h2>What we do not do</h2>
    <ul>
      <li>No advertising or ad networks.</li>
      <li>No selling or sharing of data with third parties.</li>
      <li>No analytics SDKs that identify you.</li>
    </ul>

    <h2>Data deletion</h2>
    <p>You can leave or delete groups in the app. To request deletion of data associated with your device identity, contact us via our GitHub repository.</p>

    <h2>Contact</h2>
    <p>Questions? Reach us through the project's GitHub page linked in the footer.</p>
  </article>
</BaseLayout>
```

- [ ] **Step 3: Create `web/src/pages/404.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout title="Page not found" description="That page doesn't exist.">
  <section class="container-x max-w-xl py-24 text-center">
    <p class="text-6xl" aria-hidden="true">🫙</p>
    <h1 class="mt-4 text-4xl">This jar's empty</h1>
    <p class="mt-3 text-muted">We couldn't find that page.</p>
    <div class="mt-8 flex justify-center gap-3">
      <a href="/" class="btn-primary">Home</a>
      <a href="/tutorials" class="btn-secondary">Tutorials</a>
    </div>
  </section>
</BaseLayout>
```

- [ ] **Step 4: Build check**

Run: `cd web && npm run check && npm run build`
Expected: 0 errors; `dist/download/index.html`, `dist/privacy/index.html`, `dist/404.html` exist.

- [ ] **Step 5: Commit**

```bash
git add web/src/pages/download.astro web/src/pages/privacy.astro web/src/pages/404.astro
git commit -m "feat(web): download, privacy, and 404 pages"
```

---

## Task 11: Public assets (favicon, OG, robots) + final QA

**Files:**
- Create: `web/public/favicon.svg`
- Create: `web/public/robots.txt`
- Create: `web/public/og/og-default.png` (placeholder)
- Create: `web/public/downloads/.gitkeep`

- [ ] **Step 1: Create `web/public/favicon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="#FFE9C2"/><text x="50" y="68" font-size="58" text-anchor="middle">🫙</text></svg>
```

- [ ] **Step 2: Create `web/public/robots.txt`**

```
User-agent: *
Allow: /

Sitemap: https://evenjar.com/sitemap-index.xml
```

- [ ] **Step 3: Add a placeholder OG image and downloads keep-file**

Run:
```bash
mkdir -p web/public/og web/public/downloads
# Use any 1200x630 PNG as a placeholder; copy the app icon if available:
cp assets/icon.png web/public/og/og-default.png 2>/dev/null || echo "placeholder" > web/public/og/og-default.png
touch web/public/downloads/.gitkeep
```
Note: if `assets/icon.png` isn't a valid 1200x630 image, replace `og-default.png` later with a real OG image. Build does not fail either way.

- [ ] **Step 4: Full build + link/QA pass**

Run: `cd web && npm run check && npm run build`
Expected: 0 errors. Confirm `dist/sitemap-index.xml` exists.
Then: `cd web && npm run preview`, click through every nav item, every feature link, each tutorial, each blog post, download, privacy, and a bad URL (404). Confirm no broken links and "Coming soon" badges show.

- [ ] **Step 5: Lighthouse check (quality targets)**

In a browser, run Lighthouse on the previewed home page and one blog post.
Expected: Performance ≥ 95, SEO 100, Accessibility ≥ 95, Best Practices ≥ 95.
Fix any flagged issues (missing alt text, contrast, etc.) inline.

- [ ] **Step 6: Commit**

```bash
git add web/public
git commit -m "feat(web): favicon, robots, OG placeholder, final QA"
```

---

## Task 12: Web README (dev + deploy notes)

**Files:**
- Create: `web/README.md`

- [ ] **Step 1: Create `web/README.md`**

```markdown
# EvenJar Marketing Site

Astro static site for evenjar.com.

## Develop
```bash
cd web
npm install
npm run dev      # local dev server
npm run check    # type-check
npm run build    # static output -> dist/
npm run preview  # serve the built site
npm test         # unit tests (vitest)
```

## Authoring content
- Tutorials: add an `.mdx` file in `src/content/tutorials/` (frontmatter: title, description, order, feature, updatedDate).
- Articles: add an `.mdx` file in `src/content/blog/` (frontmatter: title, description, pubDate, tags).
- Set `draft: true` to exclude from production.

## Download links
Edit `src/config.ts` → `downloads`. Empty strings render a "Coming soon" badge.
Drop APKs in `public/downloads/` and point `androidApkUrl` at `/downloads/<file>.apk`.

## Deploy (Hostinger)
1. `npm run build` → upload the contents of `dist/` to the site root, or use the
   Hostinger hosting MCP `hosting_deployStaticWebsite` (needs an API token).
2. Point `evenjar.com` + `www` DNS at the Hostinger site.
3. `astro.config.mjs` `site` must stay `https://evenjar.com` for correct canonical/OG/sitemap URLs.
```

- [ ] **Step 2: Commit**

```bash
git add web/README.md
git commit -m "docs(web): local dev and deploy notes"
```

---

## Self-Review (completed by plan author)

**Spec coverage:** stack (T1–T2), repo layout `web/` (T1), all 7 page types (T6–T10),
content collections + schemas (T4), SEO component + JSON-LD + sitemap + RSS + robots
(T5, T9, T11), design tokens (T2), download config + coming-soon (T3, T6, T10), 6
tutorials (T8), 4 articles (T9), privacy (T10), build/deploy notes (T12), perf targets
(T11). All spec sections map to a task.

**Placeholder scan:** content MDX bodies are specified via concrete content specs
(exact slug, title, meta, keyword, required sections) rather than pre-written prose —
these are authoring instructions, not code placeholders. All code steps contain
complete code.

**Type consistency:** `downloadState` (T3) used in T6/T10; `sortByOrder`/`formatDate`
(T3) used in T8/T9; `SITE`/`NAV`/`downloads`/`SOCIAL` (T3) used across components;
collection schema fields (T4) match usage in layouts/pages (T8/T9). Consistent.
