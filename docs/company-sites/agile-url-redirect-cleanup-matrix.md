# Agile Sites — URL Redirect and Cleanup Matrix

Status: discovery / implementation planning
Date: 2026-09-15
Branch: `feat/agile-agency-v2-discovery`

## Purpose

This document turns the two-domain discovery work into an actionable URL-level migration and cleanup matrix for:

- `agilemarketingsystems.com` (AMS)
- `agilecontractormarketing.com` (ACM)

The goal is to preserve legitimate brand/SEO value, keep useful proof/assets, remove compromised spam from the migration model, and define where each legitimate URL should land in the V2 Agile AI Website & Growth System architecture.

This is not yet the final production redirect file. Final redirects must be generated after WordPress exports, Search Console/analytics review, backlink review, and malware cleanup are complete.

---

## Classification rules

### PRESERVE
Keep the page/concept and migrate its useful content into V2.

### REWRITE
Keep the topic/intent, but rebuild the page around the current offer and architecture.

### REDIRECT
The old URL should 301 to a clearly equivalent V2 destination once the replacement exists.

### RETIRE
The content is obsolete, weak, duplicative, or not aligned with the current offer.

### SECURITY REMOVE
The URL/content is unauthorized spam or otherwise tied to compromise. It must not redirect to a legitimate V2 page merely to preserve traffic. Preferred behavior is 404/410 after removal unless forensic evidence proves it replaced a legitimate historical URL.

### VERIFY BEFORE MIGRATION
Do not reuse claims, logos, testimonials, screenshots, partner badges, or results until accuracy/permission/current status is confirmed.

---

# A. agilemarketingsystems.com

## A1. Homepage

| Current URL | Current role | V2 action | Proposed destination | Notes |
|---|---|---|---|---|
| `/` | Broad Minneapolis digital-marketing agency homepage | REWRITE / PRESERVE DOMAIN | `/` | Becomes flagship Agile AI Website & Growth System homepage. Preserve brand identity/assets; replace generic agency positioning. |

## A2. High-value legitimate pages

| Current URL | Current role | V2 action | Proposed destination | Notes |
|---|---|---|---|---|
| `/case-studies/` | Legacy client-results/case-study hub | PRESERVE + REWRITE | `/case-studies/` | Strong concept. Verify every numeric claim and client permission before reuse. Expand to system implementation stories and contractor case studies. |
| `/blog/` | Legacy blog hub | REWRITE | `/insights/` or retain `/blog/` | Final URL should be chosen based on existing traffic/backlinks. Content taxonomy should support education, authority, story, niche, and project-derived content. |
| `/pricing/` | Legacy agency package pricing | RETIRE / REWRITE | `/get-started/` or `/system/` | Old package model should not govern V2. Do not preserve outdated pricing or package promises. |
| `/branding/` | Standalone branding package | RETIRE AS PRIMARY OFFER | `/system/` or future add-on page | Branding may remain an optional module/add-on, not a flagship offer. |
| `/email-marketing-system-best-email-marketing-software/` | Legacy email-marketing article/offer page | VERIFY / LIKELY RETIRE | Relevant modern automation/content destination if equity exists | Keep only if meaningful traffic/backlinks justify a modern equivalent. Otherwise retire. |

## A3. Brand assets to preserve

Preserve and re-evaluate:

- Agile Marketing Systems logo variants
- favicon / brand icon
- founder/operator photography and identity assets
- legitimate client/project imagery
- verified testimonials
- verified case-study screenshots
- existing design cues that still fit the new visual system

Do not simply copy old copy blocks into V2.

---

# B. agilecontractormarketing.com

## B1. Legitimate contractor-facing pages

| Current URL | Current role | V2 action | Proposed destination | Notes |
|---|---|---|---|---|
| `/` | Contractor/home-services marketing homepage | PRESERVE CONCEPT + REWRITE | Remain ACM acquisition homepage or eventually redirect to AMS `/contractors/` | Do not consolidate until organic/backlink/conversion data is reviewed. |
| `/about/` | Legitimate ACM company/about content currently renders on the live site | PRESERVE CONCEPT + REWRITE | ACM `/about/` or AMS `/about/` | Search results have shown contaminated/spam title history for this legitimate URL, so request recrawl/reindex after cleanup. |
| `/apps/` | Contractor apps/product hub | PRESERVE + REFRAME | `/tools/`, `/system/`, or ACM-specific product hub | Useful evidence that the business already had contractor-product direction. Reframe around current Website Factory/growth-system architecture. |
| `/apps/project-pages/` | Contractor Project Pages App | HIGH-VALUE PRESERVE + REBUILD | AMS `/projects/` and/or `/project-engine/` | This is a direct predecessor to the planned Project/Proof Engine. Preserve concepts, screenshots/assets where valid, and modernize implementation. |

## B2. Project Pages / Proof Engine migration

The existing Contractor Project Pages concept should become a first-class V2 capability rather than a retired legacy app.

Target V2 model:

`completed job -> structured project record -> project page -> case study -> local SEO signal -> social content source -> service/location proof -> sales asset`

Required structured fields should include:

- project title
- contractor/site ID
- service
- service category
- city
- state/region
- project date
- problem / customer need
- work performed
- outcome
- approved photos
- related service URLs
- related location URLs
- testimonial/reference if approved
- schema fields
- status/approval state
- source provenance

Agentic generation may transform approved structured facts into page copy, but may not invent project outcomes, locations, customer quotes, pricing, guarantees, licenses, or results.

---

# C. Confirmed spam / compromised URL corpus on ACM

The following URLs were surfaced in current public search results as casino/gambling content and are not legitimate contractor-marketing content.

These URLs must be excluded from any normal SEO migration/301 preservation workflow.

| URL | Classification | Production treatment after cleanup |
|---|---|---|
| `/slots-reel-uk/` | SECURITY REMOVE | Remove malicious content; return 410 or clean 404; no redirect to flagship content |
| `/good-blackjack-casino/` | SECURITY REMOVE | Remove; 410/404 |
| `/live-craps-game/` | SECURITY REMOVE | Remove; 410/404 |
| `/best-free-chips/` | SECURITY REMOVE | Remove; 410/404 |
| `/blackjack-mobile-home/` | SECURITY REMOVE | Remove; 410/404 |
| `/unlimited-casino-uk/` | SECURITY REMOVE | Remove; 410/404 |
| `/best-irish-casino/` | SECURITY REMOVE | Remove; 410/404 |
| `/premium-casino-uk/` | SECURITY REMOVE | Remove; 410/404 |
| `/blackjack-casino-tipps/` | SECURITY REMOVE | Remove; 410/404 |
| `/10-free-slots/` | SECURITY REMOVE | Remove; 410/404 |
| `/best-high-roller-casino/` | SECURITY REMOVE | Remove; 410/404 |
| `/best-real-money-casino/` | SECURITY REMOVE | Remove; 410/404 |
| `/casinos-in-central-uk/` | SECURITY REMOVE | Remove; 410/404 |
| `/best-zombie-slots-uk/` | SECURITY REMOVE | Remove; 410/404 |
| `/progressive-slots-games-uk/` | SECURITY REMOVE | Remove; 410/404 |
| `/biggest-slot-wins-uk/` | SECURITY REMOVE | Remove; 410/404 |

This is a minimum confirmed corpus, not necessarily the full spam corpus.

### Important SEO rule

Do **not** 301 hacked spam URLs to the homepage, `/contractors/`, or another valuable page. That risks carrying irrelevant/spam signals into legitimate destinations and creates a misleading migration map.

After the compromised content and persistence mechanisms are removed:

1. serve 410 for confidently malicious URLs where practical, otherwise clean 404;
2. remove them from all XML sitemaps and internal links;
3. verify they are absent from the database/posts and filesystem routes;
4. request search-engine recrawl/removal where appropriate;
5. monitor Search Console for newly discovered spam URLs;
6. repeat security scan before trusting the domain as clean.

---

# D. Preliminary V2 redirect targets

These mappings are conceptual until final URL inventory and search-equity data are available.

| Legacy concept | Preferred V2 destination |
|---|---|
| Generic agency homepage | AMS `/` |
| Contractor marketing systems | AMS `/contractors/` or ACM acquisition homepage |
| Website creation / site systems | AMS `/ai-websites/` |
| Local SEO | AMS `/local-seo/` |
| Contractor Project Pages | AMS `/projects/` and product detail page if needed |
| Case studies | AMS `/case-studies/` |
| Niche-specific offers | AMS `/contractors/{niche}/` |
| Process / proven plan | AMS `/how-it-works/` |
| Generic old pricing | AMS `/get-started/` only if semantic intent is appropriate; otherwise retire |
| Old branding package | Relevant system/add-on section only if preserved |

---

# E. Data required before final redirect implementation

The final redirect file must not be created from public search results alone.

Collect for both domains:

1. WordPress URL export / post + page inventory
2. XML sitemaps
3. Google Search Console indexed pages and performance
4. analytics landing-page traffic and conversions
5. backlink/referring-domain data
6. canonical tags
7. current HTTP status
8. robots directives
9. internal-link counts
10. legitimate media/assets tied to each URL
11. publication/update date where meaningful
12. security classification for ACM URLs

Add columns in the implementation dataset for:

- `source_domain`
- `source_path`
- `content_type`
- `security_state`
- `traffic_value`
- `backlink_value`
- `conversion_value`
- `index_state`
- `action`
- `target_url`
- `redirect_code`
- `reason`
- `qa_status`

---

# F. Cutover rules

1. No AMS V2 DNS cutover until the new Cloudflare/EmDash build passes production QA.
2. No ACM consolidation decision until security cleanup is complete and clean SEO data is available.
3. Never import ACM WordPress database/content wholesale into the new V2 system.
4. Only verified legitimate content/assets move into structured V2 source data.
5. No spam URL receives a 301 merely because it is indexed.
6. Every production redirect must have a documented semantic destination.
7. Redirect chains should be avoided; legacy URLs should point directly to final V2 URLs.
8. Preserve query strings only where intentionally needed for analytics/campaign behavior.
9. Keep the old WordPress installations isolated/archived long enough for rollback and forensic reference, but do not leave compromised public endpoints accessible indefinitely.
10. Post-cutover monitoring must include 404s, redirect errors, indexing anomalies, traffic changes, form/conversion events, and security signals.

---

# G. Immediate next actions

## Security / ACM

- finish Hostinger malware cleanup and vulnerability patching
- identify and delete/retire all unauthorized spam posts/pages
- inspect admin users, cron, uploads PHP, mu-plugins, `.htaccess`, and modified core/plugin files
- regenerate clean sitemap
- rerun malware scan
- verify legitimate URLs render expected content
- submit/request recrawl after cleanup

## V2 build planning

- finalize AMS homepage V2 copy
- define component inventory
- define `SITE_CONFIG` extensions for agency/niche/product pages
- define Project/Proof Engine schema
- define case-study schema
- define analytics/conversion event schema
- create launch QA checklist

## SEO migration

- export WordPress URLs from both sites
- overlay Search Console / analytics / backlink data
- upgrade this preliminary matrix into the final production redirect dataset

---

## Working conclusion

`agilemarketingsystems.com` should carry the future flagship/company/product role.

`agilecontractormarketing.com` contains valuable contractor-specific concepts — especially the Project Pages lineage — but its current organic footprint is contaminated by confirmed hacked casino content. Its legitimate value should be extracted carefully, not blindly migrated.

The correct sequence is:

**secure -> inventory -> classify -> build V2 -> validate -> redirect/cut over -> monitor**
