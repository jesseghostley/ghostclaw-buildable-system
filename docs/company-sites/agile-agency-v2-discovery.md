# Agile Agency V2 — Discovery and Brand Architecture

Status: discovery / planning
Date: 2026-09-15
Branch: `feat/agile-agency-v2-discovery`

## Purpose

This document consolidates what is already defined in the GhostClaw repository with a fresh comparison of the two current public sites:

- `agilemarketingsystems.com`
- `agilecontractormarketing.com`

The goal is to avoid rebuilding from assumptions and to define a clean role for each property before the flagship AI Website & Growth System site is implemented.

## Canonical GitHub context

The current GhostClaw repository defines the operating model as a structured execution pipeline:

`Signal -> Planner -> Jobs -> Agents -> Skills -> Artifacts -> Approval -> Publish -> Audit`

The repo explicitly says GhostClaw is not merely a content generator; it is an execution system.

The canonical system definition also states:

- one agent completes each site end-to-end
- `SITE_CONFIG.json` is the single source of truth
- no placeholder content is allowed
- outputs must be deploy-ready
- all actions must be auditable
- the primary use case is a contractor website factory producing 15+ deploy-ready sites per week with zero rework

The runtime execution specification separately identifies **Agile Contractor Marketing** as the initial GhostClaw MVP target and requires approval gates for website publishing, external outreach, marketplace publication, and pricing changes.

These repo-defined facts should directly shape the new agency site. The flagship site should demonstrate the same runtime principles the contractor website factory is intended to sell.

## Current public-site positioning

### agilemarketingsystems.com

Current positioning is broad/local-agency oriented:

- "Leading Marketing Agency in Minneapolis, MN"
- improve SEO/rankings
- save on marketing costs
- get more leads
- showcase work
- dominate local search
- "The Agile Marketer Never Sleeps"
- general digital-marketing and innovation messaging

Strengths worth preserving:

- established Agile Marketing Systems brand assets
- existing logo and favicon assets
- founder/operator identity and history
- usable testimonials, project proof, screenshots, and photography after verification
- any existing URLs with real traffic/backlinks/index equity

Weakness:

The site presents the business as a conventional digital marketing agency rather than the contractor-specific AI Website & Growth System the company is becoming.

### agilecontractormarketing.com

Current positioning is already much closer to the desired contractor offer:

- "Leading home services marketing agency"
- "Follow a Proven Plan"
- "Create Stable Revenue"
- "Take Back Your Time"
- "The Most Reliable Stream of high-quality leads and jobs"
- "Contractor Marketing Systems"
- explicit contractor-specific lead-generation language

The site also contains contractor-facing proof assets, including customer/client logos and results imagery.

Strength:

This property already speaks directly to contractors and home-service businesses rather than to a generic local-business audience.

Weakness:

The offer is still framed primarily as a marketing/lead-generation agency rather than as an integrated AI website, growth, automation, proof, and operating system.

## Recommended brand/property roles

### 1. agilemarketingsystems.com — flagship/company/product hub

Recommended role:

**The primary company and flagship product site for the Agile AI Website & Growth System.**

This should become the clearest expression of the company’s current direction:

- contractor-specific AI websites
- Website Factory / structured site generation
- local-search infrastructure
- project and case-study publishing
- lead capture and routing
- CRM/workflow integrations
- AI-assisted content
- automation
- reporting and optimization
- agentic but controlled landing-page generation

Recommended top-level positioning:

> AI Website & Growth Systems Built for Contractors

Alternative hero direction:

> Turn Your Website Into a Growth System

The message should move away from "we are a marketing agency" toward "we build the connected growth infrastructure contractors normally assemble from multiple vendors."

### 2. agilecontractormarketing.com — contractor acquisition / niche-facing property

Recommended role:

Keep this domain as a **contractor-specific acquisition property** rather than maintaining two nearly duplicate agency sites.

Possible long-term roles, in preferred order:

1. contractor-focused acquisition site that funnels qualified visitors into the flagship Agile Website & Growth System
2. campaign/landing-page property for contractor-specific paid and organic acquisition
3. redirect/consolidation target if maintaining two sites creates duplicate content, brand confusion, or operational drag

Do not decide between these options until traffic, backlinks, rankings, conversion history, and indexed URLs are inventoried.

## V2 flagship information architecture

Proposed initial routes for `agilemarketingsystems.com`:

- `/` — flagship system positioning
- `/system/` — complete AI Website & Growth System
- `/ai-websites/` — Website Factory / site-generation offer
- `/local-seo/` — local-search and content system
- `/projects/` — structured project/proof hub
- `/case-studies/` — transformation stories
- `/contractors/` — contractor niche hub
- `/contractors/restoration/`
- `/contractors/roofing/`
- `/contractors/foundation-repair/`
- `/contractors/garage-doors/`
- `/contractors/epoxy-flooring/`
- `/how-it-works/`
- `/about/`
- `/get-started/`

## Homepage V2 story

1. **Hero** — AI Website & Growth System Built for Contractors
2. **Constraint problem** — fragmented website/SEO/CRM/content/review/automation stack
3. **One connected system** — website, local search, content, projects, leads, automation, reputation, reporting
4. **Niche-specific configuration** — standardize roughly 60–80%, adapt roughly 20–40% by niche and sales process
5. **Projects/proof engine** — every completed job should help win the next job
6. **How it works** — diagnose -> configure -> build -> connect -> grow
7. **Technology/ownership** — fast, portable, client-controlled data/content/domain, controlled AI generation
8. **Case studies** — results and system implementation stories
9. **CTA** — show the contractor what would be built for their market

## Projects and case studies must be first-class content types

Each project should support structured fields such as:

- service
- city / market
- problem
- work performed
- photos
- result
- related service
- related location
- testimonial
- schema data

A completed project should be reusable as:

- a project page
- a local SEO asset
- a case study
- source material for social posts
- sales proof
- supporting content for service/location pages

This must be part of the platform model, not a late blog feature.

## AWF / EmDash / Cloudflare direction

Target architecture for the flagship site:

- **Cloudflare** — production delivery layer
- **EmDash** — rendering / page-generation layer
- **AWF / Website Factory** — configuration and orchestration layer
- **GhostClaw** — runtime execution / agent workflow layer where applicable
- **specialized back-office tools** — CRM, forms, scheduling, reporting, etc.

The flagship site should itself be a reference implementation of the product being sold.

WordPress should be treated as the legacy/source system during migration rather than automatically retained as the final presentation layer.

## Agentic page-generation rules

AI may:

- assemble approved sections
- adapt niche language
- select approved proof
- expand controlled service/location/project page sets
- refresh copy based on approved structured inputs

AI must not invent:

- pricing
- guarantees
- customer results
- service areas
- licenses
- reviews
- regulatory claims
- case-study outcomes

Those facts must come from structured source data.

## Suggested page schema

```yaml
page:
  slug: contractors/restoration
  page_type: niche_landing
  niche: restoration
  audience: owner_operator
  primary_goal: booked_consultation
  market_scope: national

offer:
  name: AI Website & Growth System
  positioning: contractor_growth_system
  primary_outcome: more_qualified_leads
  secondary_outcomes:
    - stronger_local_visibility
    - faster_follow_up
    - better_proof
    - lower_marketing_fragmentation

sections:
  - hero
  - niche_problem
  - system_overview
  - niche_modules
  - proof
  - project_engine
  - process
  - case_studies
  - faq
  - cta

proof:
  case_studies: []
  testimonials: []
  example_sites: []
  projects: []

seo:
  title: null
  description: null
  canonical: null
  schema: []
  internal_links: []
```

## Migration strategy

### Phase 1 — Stabilize and secure

- keep current WordPress production available
- complete security remediation
- avoid unnecessary redesign work on the old stack

### Phase 2 — Inventory

For both current domains, capture:

- every public URL
- titles/meta/canonicals
- traffic and ranking value where available
- backlinks where available
- copy worth preserving
- testimonials
- client/project proof
- logos and brand assets
- photographs/screenshots
- forms/CTAs
- analytics/conversion events

Classify each item as:

- preserve
- rewrite
- redirect
- retire

### Phase 3 — Lock V2 product/offer architecture

Define:

- flagship positioning
- niche matrix
- page taxonomy
- component library
- approved claims
- CTA model
- project/case-study schema

### Phase 4 — Build through AWF / EmDash

Use structured configuration and approved component patterns rather than unconstrained page generation.

### Phase 5 — Parallel QA

Before cutover validate:

- mobile
- forms
- metadata
- schema
- canonical URLs
- redirects
- analytics
- conversion events
- accessibility
- performance
- indexing controls

### Phase 6 — Cutover

Point `agilemarketingsystems.com` to the new Cloudflare-based production site only after QA passes.

Keep the legacy WordPress property available temporarily as rollback/archive until post-launch stability is proven.

## Open decisions

1. Does `agilecontractormarketing.com` remain a standalone acquisition site, become a campaign property, or consolidate through redirects?
2. Which existing URLs on both sites carry meaningful organic/backlink/conversion value?
3. Which existing testimonials, client logos, and results can be reused with current permission and accurate claims?
4. Which contractor niches launch in V2 versus phase 2?
5. Which back-office modules are core versus niche-specific upgrades?
6. What exact public naming hierarchy should be used between Agile Marketing Systems, Agile Contractor Marketing, and the AI Website & Growth System product?

## Next implementation artifacts

- complete URL/content inventory of both sites
- redirect map
- V2 homepage final copy
- reusable component inventory
- niche configuration schema
- project/case-study schema
- conversion/analytics event schema
- launch QA checklist
- production cutover plan
