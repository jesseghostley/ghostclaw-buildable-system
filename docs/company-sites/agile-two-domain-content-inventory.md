# Agile Two-Domain Content, SEO, and Migration Inventory

Status: working inventory
Date: 2026-09-15
Branch: `feat/agile-agency-v2-discovery`
Related PR: #30

## Purpose

This inventory compares the current public state of:

- `agilemarketingsystems.com` (AMS)
- `agilecontractormarketing.com` (ACM)

It is intended to drive four decisions:

1. what should be preserved in the V2 flagship site,
2. what should be rewritten,
3. what should redirect or consolidate,
4. what must be removed because it is compromised, obsolete, or off-brand.

This document is intentionally conservative: an item is not treated as reusable proof or a redirect target merely because it exists. Claims, testimonials, logos, results, permissions, traffic, backlinks, and conversion value still require validation.

---

# Executive findings

## 1. The two domains already have different useful roles

### `agilemarketingsystems.com`

Current positioning is broad agency/company positioning:

- leading marketing agency in Minneapolis
- SEO/rankings
- lower marketing cost
- more leads
- showcase work
- dominate local search
- Agile Marketer founder/operator positioning

This is the better domain for the future company/flagship product hub, but the offer and copy need to be substantially rewritten around the AI Website & Growth System.

### `agilecontractormarketing.com`

Current positioning is already contractor-specific:

- leading home services marketing agency
- proven plan
- stable revenue
- take back your time
- dependable stream of high-quality leads/jobs
- contractor marketing systems

This remains valuable as a contractor-facing acquisition property, but should not become a near-duplicate of the flagship site.

## 2. ACM currently has confirmed live/indexed spam content

Search results and direct page fetches show gambling/casino pages currently associated with `agilecontractormarketing.com`, including examples such as:

- `/slots-reel-uk/`
- `/good-blackjack-casino/`
- `/live-craps-game/`
- `/best-free-chips/`
- `/blackjack-mobile-home/`
- `/unlimited-casino-uk/`

A search result for `/about/` also showed a gambling/spam title even though a direct live fetch currently returns the legitimate About Agile Contractor Marketing page. This suggests either stale search-index compromise, prior title/content injection, or inconsistent compromise/cache behavior.

Direct fetch of `/slots-reel-uk/` and `/good-blackjack-casino/` returned live gambling content, so this is not merely an old search-cache artifact.

**Migration implication:** ACM must be treated as an SEO/security cleanup project before its organic value can be trusted. Spam URLs must not be imported into the V2 content model or redirected to commercial money pages. Their correct disposition should be determined after the compromised content is removed, normally toward `410 Gone` or a clean `404` unless a legitimate prior URL can be proven.

## 3. ACM contains a strategically important Project Pages product concept

`/apps/project-pages/` currently positions a **Contractor Project Pages App** around:

- local optimized project pages
- local brand authority
- conversion improvement
- local search rankings
- contractor-specific desktop/mobile workflow

This concept aligns strongly with the current Website Factory direction and the requirement that Projects and Case Studies become first-class content types.

**Recommendation:** preserve the product concept and relevant screenshots/asset ideas, but rewrite/rebuild it into the current agentic Project/Proof Engine rather than carrying the old page forward unchanged.

## 4. AMS has reusable legacy business-content pages

Search/fetch surfaced legitimate pages including:

- `/blog/`
- `/pricing/`
- `/branding/`
- `/case-studies/`
- `/email-marketing-system-best-email-marketing-software/`

The current `/case-studies/` page contains historical result claims and should be audited claim-by-claim before reuse.

The current `/pricing/` page reflects an older conventional agency package model and should not dictate V2 pricing architecture.

The current `/branding/` page is a legacy standalone branding offer and likely belongs either as an optional service/module or retirement/redirect candidate depending on current commercial strategy.

---

# Initial content classification

## agilemarketingsystems.com

| Current item | Initial classification | V2 treatment |
|---|---|---|
| Homepage | REWRITE | Keep domain and brand authority; replace generic agency positioning with flagship AI Website & Growth System positioning |
| Existing AMS logo/favicon assets | PRESERVE | Reuse where current branding still applies; create optimized production variants rather than hotlinking legacy WordPress assets |
| `/case-studies/` | PRESERVE + REWRITE | Preserve valid proof structure and verified cases; migrate into first-class case-study schema |
| `/pricing/` | REWRITE / POSSIBLE REDIRECT | Old agency-plan model should not automatically survive; map to current offer/pricing strategy once approved |
| `/branding/` | REVIEW / POSSIBLE RETIRE | Keep only if branding remains an active module/upgrade; otherwise redirect to the relevant current system/service page |
| `/blog/` | REVIEW | Inventory posts individually; preserve only topical/traffic/backlink value |
| Email marketing software article | REVIEW | Keep only if useful/accurate and aligned with current stack; otherwise consolidate/redirect |
| Founder/Agile Marketer identity | PRESERVE + MODERNIZE | Keep history/personality but move away from old generic-agency framing |
| Generic SEO/lead-generation copy | REWRITE | Replace with connected-system, constraints, Website Factory, automation, proof-engine language |

## agilecontractormarketing.com

| Current item | Initial classification | V2 treatment |
|---|---|---|
| Homepage | PRESERVE CONCEPT + REWRITE | Retain contractor-specific acquisition role; align offer with flagship system |
| Contractor/customer logo proof assets | REVIEW / PRESERVE | Verify permission, current customer relationship, and claim accuracy before reuse |
| `/about/` | PRESERVE + REWRITE | Keep contractor-specific company story; verify search-index spam title is fully cleared |
| `/apps/` | PRESERVE CONCEPT + RESTRUCTURE | Potential module/product hub for contractor tools, but align to current platform architecture |
| `/apps/project-pages/` | HIGH-VALUE PRESERVE + REBUILD | Recast as Project/Proof Engine; use structured project schema and AWF/EmDash workflows |
| Google-review/reputation assets | REVIEW | Reuse only if product/module remains part of current offering |
| Old partner badges | VERIFY BEFORE USE | Do not carry forward Facebook/Yelp/Google partner claims unless current and authorized |
| Gambling/casino spam URLs | REMOVE / DEINDEX | Security cleanup; do not migrate or redirect to unrelated commercial pages |

---

# Recommended domain roles for V2

## AMS: flagship/company/product hub

`agilemarketingsystems.com` should become the canonical public expression of:

- Agile Marketing Systems Inc.
- Agile AI Website & Growth System
- contractor Website Factory
- AWF/EmDash/Cloudflare reference implementation
- niche systems
- projects/case studies/proof engine
- lead capture/automation/integration story
- system ownership/exportability story

## ACM: contractor acquisition property

`agilecontractormarketing.com` should remain contractor-facing while V2 is built, but its long-term role should be decided after cleanup and analytics/backlink review.

Preferred options:

1. focused contractor acquisition site feeding the flagship,
2. campaign/landing-page property,
3. eventual consolidation/redirect if duplicate operational cost or SEO cannibalization outweighs independent value.

Do not make the final consolidation decision until Search Console/analytics/backlink data are reviewed.

---

# Project/Proof Engine migration concept

The old Contractor Project Pages concept should evolve into a first-class Project/Proof Engine.

Each project object should support at minimum:

```yaml
project:
  project_id: null
  title: null
  slug: null
  contractor: null
  niche: null
  service: null
  location:
    city: null
    region: null
  problem: null
  work_performed: []
  outcome: null
  photos: []
  testimonial_id: null
  related_services: []
  related_locations: []
  completed_date: null
  publish_status: draft
  approval_status: pending
  schema: []
```

One approved project should be reusable as source material for:

- project page
- case study
- service-page proof block
- location-page proof block
- social content
- GBP content
- email/newsletter content
- sales collateral
- AI landing-page proof selection

AI may transform approved project data, but must not invent location, work performed, outcomes, customer quotes, licenses, or metrics.

---

# SEO/security cleanup requirements for ACM

Before ACM is considered a trusted acquisition asset:

1. finish Hostinger malware/security cleanup,
2. remove confirmed malicious content and persistence mechanisms,
3. enumerate all WordPress posts/pages created or modified during the compromise window,
4. identify spam users/admins and malicious scheduled tasks if present,
5. inspect sitemap/index state,
6. remove spam URLs from site output,
7. return correct HTTP status for retired malicious URLs,
8. regenerate clean XML sitemaps,
9. verify canonical and robots directives,
10. submit clean sitemap through Search Console,
11. use Search Console removal tooling only where appropriate for urgent spam-result suppression,
12. monitor indexed-page counts and spam-query impressions after cleanup.

Do not redirect hacked gambling URLs to the homepage or flagship service pages merely to preserve theoretical link equity; that risks sending poor relevance and compromise residue into the new architecture.

---

# Preliminary redirect-map rules

Final redirects require analytics/backlink data, but these rules should govern the map.

## Preserve URL when

- the page has relevant ranking/backlink/conversion value,
- the page topic remains part of the new offer,
- intent remains materially the same.

## 301 redirect when

- legitimate old content has a clear one-to-one successor,
- a legacy service is consolidated into a current relevant service/module,
- a case study/project moves to the new structured route.

## 410 or clean 404 when

- URL is confirmed injected spam/malware,
- no legitimate historical counterpart exists,
- redirect would be unrelated or misleading.

## Do not mass-redirect all old URLs to `/`

That would erase topical relationships and can create soft-404 behavior.

---

# V2 canonical sitemap direction

## Flagship AMS

- `/`
- `/system/`
- `/ai-websites/`
- `/local-seo/`
- `/projects/`
- `/projects/{project-slug}/`
- `/case-studies/`
- `/case-studies/{case-study-slug}/`
- `/contractors/`
- `/contractors/restoration/`
- `/contractors/roofing/`
- `/contractors/foundation-repair/`
- `/contractors/garage-doors/`
- `/contractors/epoxy-flooring/`
- `/how-it-works/`
- `/about/`
- `/get-started/`

## ACM acquisition structure, if retained standalone

Keep materially smaller than AMS. Avoid duplicating flagship service copy.

Potential structure:

- `/`
- `/contractor-marketing-system/`
- `/project-pages/` or `/project-proof-engine/`
- selected contractor niche/campaign pages
- `/about/`
- `/get-started/`

Where appropriate, deep product/system explanations should link to canonical AMS pages rather than being cloned.

---

# Required data still missing

Before final redirect/cutover decisions:

- Google Search Console exports for both domains
- analytics landing-page/conversion data
- backlink data
- complete WordPress URL exports
- clean sitemap after security remediation
- list of current forms and conversion endpoints
- complete media inventory
- verified testimonial/client-logo permissions
- current offer/pricing canon
- current brand naming hierarchy

---

# Immediate next work

1. Treat ACM indexed gambling content as a confirmed remediation issue.
2. Finish Hostinger security cleanup before relying on ACM SEO data.
3. Export all legitimate URLs from both WordPress installs after cleanup.
4. Join those exports with Search Console/analytics/backlink data.
5. Produce a row-level redirect map with columns:
   - source domain
   - source URL
   - current title
   - content type
   - legitimacy/security state
   - traffic
   - backlinks
   - conversions
   - V2 classification
   - destination URL
   - HTTP action (`200`, `301`, `404`, `410`)
   - notes
6. Build V2 homepage and Project/Proof Engine schemas against the approved brand architecture.
