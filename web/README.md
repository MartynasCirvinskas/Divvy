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

## Pre-launch TODO
- Replace `public/og/og-default.png` (currently a square app-icon placeholder) with a real **1200×630** PNG before launch so OG/Twitter card previews render correctly across all platforms.
