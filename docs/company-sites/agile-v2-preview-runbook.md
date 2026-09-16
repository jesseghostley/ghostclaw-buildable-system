# Agile V2 Preview Runbook

Status: implementation support
Related: PR #30, Issue #32

## Purpose

Provide a repeatable local/CI path for generating and validating the first config-driven Agile Marketing Systems V2 homepage preview.

## Source of truth

The preview consumes:

- `__tests__/fixtures/agile-v2-homepage.json`
- `packages/core/src/skills/render_emdash_homepage.ts`

The JSON fixture is the executable test representation of the documented V2 homepage configuration. The renderer must not invent proof, pricing, guarantees, service areas, licenses, reviews, metrics, or customer outcomes.

## Generate preview

Run:

```bash
npm ci
npm run build
npm test -- --runInBand
npm run preview:agile-v2
```

Expected output:

- `outputs/agile-v2-preview/index.html`

The preview command prints a small JSON summary including renderer id, status, output path, and rendered sections.

## Required manual preview QA

Open the generated `index.html` in a browser and verify:

1. Desktop, tablet and mobile widths render without horizontal overflow.
2. Hero headline and both CTAs render.
3. Contractor system cards render.
4. Niche cards render.
5. Project/Proof section stays hidden while verified project cards are empty.
6. Case Studies section stays hidden while verified case-study cards are empty.
7. Process, technology, FAQ and final CTA render.
8. Primary CTA links to `/get-started/`.
9. Secondary CTA links to `/system/`.
10. No placeholder copy, invented testimonials, invented metrics, pricing or guarantees appear.

## HTML/SEO checks

Verify generated HTML contains:

- one `<h1>`
- `<title>` from fixture
- meta description from fixture
- canonical `https://agilemarketingsystems.com/`
- responsive viewport meta tag
- analytics attributes for:
  - `cta_hero_get_started`
  - `cta_hero_explore_system`
  - `cta_footer_build_growth_plan`

## Security/content migration boundary

Do not import the `agilecontractormarketing.com` WordPress database, uploads tree, plugin files, theme files, or generated content wholesale into the preview.

Only verified clean assets and approved content may be promoted after Issue #31 security cleanup.

Casino/gambling spam and other unauthorized content must never receive V2 redirects or be incorporated into training/configuration source material.

## Preview acceptance gate

The homepage can be called preview-ready only when:

- TypeScript build passes
- full test suite passes
- fixture integration test passes
- generated preview opens correctly
- responsive smoke QA passes
- metadata/canonical checks pass
- no fabricated proof is shown
- no production DNS/deployment change has occurred

Production cutover is a separate approval gate.
