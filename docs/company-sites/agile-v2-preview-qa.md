# Agile V2 Homepage Preview QA

**Branch:** `feat/agile-agency-v2-discovery`  
**Validated commit:** `52d647c43544273d76a2b28820af7b9bb4f530ee`  
**CI run:** #12  
**Preview artifact:** `agile-v2-preview` (artifact ID `10429807813`)  
**Artifact digest:** `sha256:e23f1b87fad448c962b180eef58ff2b0c82bc1a79b17cbb416a4a0b87b327723`

## CI result

The complete CI path passed:

- dependency install
- TypeScript build
- full Jest suite
- Agile V2 preview build
- preview artifact upload

## Rendered preview inspected

The generated `index.html` from the CI artifact was rendered in Chromium at three viewport sizes and inspected programmatically and visually.

| Viewport | Width | Document scroll width | Horizontal overflow | Full-page height |
| --- | ---: | ---: | --- | ---: |
| Mobile | 390 px | 390 px | None detected | 6434 px |
| Tablet | 768 px | 768 px | None detected | 4563 px |
| Desktop | 1440 px | 1440 px | None detected | 4718 px |

The page remained readable and structurally intact at all three sizes. The responsive grid collapses appropriately on mobile and no content extended beyond the viewport.

## Content / structure smoke check

Observed in the generated page:

- exactly one `h1`
- document language is `en`
- one semantic `main` region
- no duplicate element IDs
- no empty-link labels
- FAQ entries use `details` + `summary`
- normal heading progression from `h1` to section `h2` and card/step `h3`
- canonical, title and meta description emitted
- Projects and Case Studies are absent when verified proof arrays are empty

## CTA checks

Primary/secondary CTAs are present in the rendered preview with the expected routes and analytics identifiers:

- `See What We’d Build for Your Market` → `/get-started/` → `cta_hero_get_started`
- `Explore the System` → `/system/` → `cta_hero_explore_system`
- `Build My Growth Plan` → `/get-started/` → `cta_footer_build_growth_plan`

The CTA markup is valid and clickable. The linked pages are intentionally not part of this homepage-only preview yet and are therefore classified as **intentional preview stubs**, not broken production routes.

Niche card routes are also intentional stubs for the next page-build phase:

- `/contractors/restoration/`
- `/contractors/roofing/`
- `/contractors/foundation-repair/`
- `/contractors/garage-doors/`
- `/contractors/epoxy-flooring/`

## Visual observations

The current preview is clean and usable as a structural reference implementation. It is intentionally minimal rather than final brand polish.

Strengths observed:

- clear hero hierarchy
- readable section separation
- system and niche cards remain legible across widths
- strong single-column mobile behavior
- CTA buttons remain visible and usable on mobile
- no fabricated proof blocks appear

Items for the later design-polish phase rather than this render gate:

- replace text-only header with final brand/navigation treatment
- introduce preserved Agile brand assets/logo where approved
- refine typography scale and spacing after the visual design direction is locked
- add verified project/case-study proof once clean source data is approved
- add production navigation/footer patterns after the linked V2 pages exist

## Accessibility smoke check

This is a smoke check, not a WCAG audit. The generated markup passes the basic structural checks above, but a full accessibility audit still requires automated and manual testing once the branded component layer is in place.

## Performance gate

A Lighthouse score has **not** been recorded yet. Do not call the performance acceptance criterion complete until Lighthouse (or the agreed production performance audit) is run against a served preview URL.

## Current preview gate

Proven now:

- config-driven render
- full CI green
- generated artifact exists
- responsive render inspected at mobile/tablet/desktop sizes
- no horizontal overflow detected
- CTA markup and analytics identifiers verified
- internal routes explicitly classified as preview stubs
- metadata/canonical verified
- no fabricated Project/Case Study proof
- basic accessibility structure smoke-tested

Still open before calling Issue #32 fully complete:

- Lighthouse/performance check against a served preview
- broader accessibility audit after brand/component polish
- optional browser/device matrix beyond the three inspected viewport widths
