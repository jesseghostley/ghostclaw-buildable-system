# Agile Marketing Systems V2 — Homepage Copy and Component Inventory

Status: implementation planning
Date: 2026-09-15
Branch: `feat/agile-agency-v2-discovery`

## Objective

Define the flagship homepage copy and the reusable component inventory for the new `agilemarketingsystems.com` site.

The new site should demonstrate the product it sells:

- contractor-specific AI websites
- local search infrastructure
- project / case-study publishing
- lead capture and routing
- automation
- reporting
- controlled agentic landing-page generation
- Cloudflare delivery
- AWF / EmDash orchestration

The site should not read like a generic marketing agency.

## Brand role

`agilemarketingsystems.com` = flagship company + product site.

Primary positioning:

> AI Website & Growth Systems Built for Contractors

Supporting promise:

> We build the connected website, local search, proof, lead-capture, and automation system contractors usually have to assemble from multiple vendors.

`agilecontractormarketing.com` remains contractor-acquisition / historical proof until its security cleanup and SEO review are complete.

## Homepage final-copy draft

### 1. Hero

Eyebrow:

**AI Website & Growth Systems for Contractors**

H1:

**Turn Your Website Into a Growth System**

Supporting copy:

Your website should do more than look good. We build contractor-specific websites, local search infrastructure, project publishing, lead capture, automation, and reporting as one connected growth system.

Primary CTA:

**See What We’d Build for Your Market**

Secondary CTA:

**Explore the System**

Proof line:

Built for restoration, roofing, foundation repair, garage doors, epoxy flooring, and other local-service contractors.

### 2. Constraint section

H2:

**Your website probably isn’t the real problem.**

Body:

Most contractors are running a chain of disconnected marketing tools and vendors:

- a website that does not convert well
- SEO that is not connected to sales
- leads sitting in inboxes
- completed jobs never turned into proof
- reviews scattered across platforms
- content published inconsistently
- CRM and automation added as an afterthought

Closing line:

**The limiting step is usually the system around the website.**

### 3. Connected system section

H2:

**One connected contractor growth system**

Intro:

We connect the pieces that drive visibility, trust, conversion, and follow-up instead of treating them as separate services.

Core system cards:

#### AI Website
Fast, conversion-focused, niche-specific, and structured for local service growth.

#### Local Search
Service pages, location pages, schema, internal linking, project signals, and content architecture.

#### Project Engine
Turn completed jobs into project pages, case studies, local proof, sales assets, and social content.

#### Lead Capture
Forms, calls, qualification, tracking, routing, and handoff.

#### Automation
Follow-up, scheduling, notifications, CRM workflows, and task routing.

#### Reputation
Reviews, proof distribution, and authority-building workflows.

#### Content Engine
Educational, authority, story, niche, and proof content generated from approved inputs.

#### Reporting
See what is producing leads, where the bottleneck is, and what should be improved next.

### 4. Niche-specific system section

H2:

**Built for your niche, not adapted after the fact**

Body:

The core growth system is standardized where that creates speed and reliability. The rest is configured around your niche, sales cycle, service mix, and local market.

Operating principle:

> Standardize the 60–80% every contractor growth system needs. Configure the remaining 20–40% around the niche.

Examples:

#### Restoration
- emergency lead capture
- water / fire / mold architecture
- insurance-driven education
- project documentation
- rapid-response calls to action

#### Roofing
- storm and insurance pages
- inspections
- financing
- project galleries
- seasonal campaigns

#### Foundation Repair
- symptom / problem pages
- diagnostic lead forms
- high-ticket education
- financing
- case-study depth

#### Garage Doors
- repair / replacement split
- emergency service
- product galleries
- maintenance offers
- local service pages

### 5. Project / proof section

H2:

**Every completed job should make the next sale easier.**

Body:

Most contractors finish a project and lose the marketing value the moment the truck leaves. Our Project Engine turns real jobs into reusable proof.

Each approved project can become:

- a project page
- a local SEO asset
- a case study
- a sales proof asset
- social content
- supporting content for related service and location pages

Example project card:

**Water Damage Cleanup — Eden Prairie, MN**

Basement supply-line loss · drying and mitigation · project photos · work performed · result · related service page.

CTA:

**See the Project Engine**

### 6. Process section

H2:

**From constraint to launch**

#### 1. Diagnose
Identify the biggest constraint in visibility, conversion, follow-up, proof, or lead flow.

#### 2. Configure
Select the niche structure, offers, pages, proof model, workflows, and modules required.

#### 3. Build
Generate and QA the site through the Website Factory and approved component system.

#### 4. Connect
Integrate forms, CRM, scheduling, analytics, reviews, and reporting.

#### 5. Grow
Add project proof, locations, service depth, campaigns, and automation based on actual constraints and performance.

### 7. Ownership / technology section

H2:

**Fast, portable, and built around your business**

Buyer-facing bullets:

- fast Cloudflare delivery
- no bloated WordPress frontend required
- structured and exportable site output
- client-owned domain, content, and business data
- connected forms and operating tools
- controlled AI-assisted page generation
- human QA before publish
- no invented reviews, results, pricing, or service claims

Technical-detail disclosure can live behind an expandable block or dedicated `/website-factory/` page.

### 8. Proof / case studies section

H2:

**Built from real systems, not theory**

Use two proof types:

1. **Results case studies** — leads, traffic, calls, conversions, ranking growth, cost savings.
2. **System case studies** — how a niche-specific site / growth system was designed and deployed.

No legacy claim should be reused without verification.

### 9. Final CTA

H2:

**See what your contractor growth system should look like.**

Body:

We’ll map your current website and marketing stack, identify the biggest constraint, and show you what we would build around your niche and market.

Primary CTA:

**Build My Growth Plan**

Secondary CTA:

**See Example Systems**

## Recommended navigation

Primary nav:

- System
- AI Websites
- Local SEO
- Projects
- Case Studies
- Contractor Niches
- How It Works
- About

Persistent CTA:

**Get Started**

## Component inventory

The EmDash / AWF implementation should use reusable components with structured inputs rather than page-specific one-off markup.

### Global components

- `SiteHeader`
- `SiteFooter`
- `PrimaryNav`
- `MobileNav`
- `Breadcrumbs`
- `AnnouncementBar`
- `PrimaryCTA`
- `SecondaryCTA`
- `TrustStrip`

### Hero components

- `HeroFlagship`
- `HeroNiche`
- `HeroService`
- `HeroCaseStudy`
- `HeroProject`

Required structured fields:

- eyebrow
- h1
- supporting_copy
- primary_cta
- secondary_cta
- proof_line
- hero_media

### Problem / constraint components

- `ConstraintStatement`
- `ProblemList`
- `BeforeAfterSystem`
- `BottleneckCallout`

### System components

- `SystemCardGrid`
- `SystemModuleCard`
- `SystemArchitectureFlow`
- `CoreVsNicheModules`
- `IntegrationStrip`

### Niche components

- `NicheCardGrid`
- `NicheFeatureList`
- `NicheWorkflow`
- `NicheCTA`
- `ServiceTaxonomyPreview`

### Project / proof components

- `ProjectCard`
- `ProjectGrid`
- `ProjectDetailHero`
- `ProjectFacts`
- `ProjectGallery`
- `ProjectOutcome`
- `RelatedServiceLinks`
- `RelatedLocationLinks`
- `CaseStudyCard`
- `CaseStudyMetrics`
- `TestimonialCard`
- `ClientLogoStrip`

### Process components

- `ProcessSteps`
- `Timeline`
- `DeliveryChecklist`
- `LaunchGate`

### Conversion components

- `ConsultationCTA`
- `QualificationForm`
- `MarketAssessmentForm`
- `InlineLeadForm`
- `StickyMobileCTA`
- `PhoneCTA`

### Content / SEO components

- `FAQGroup`
- `InternalLinkGrid`
- `RelatedContent`
- `AuthorBlock`
- `SchemaBlock`
- `LocationProof`

### Technical proof components

- `PerformanceProof`
- `OwnershipModel`
- `ExportabilityCallout`
- `TechStackDisclosure`
- `AgenticGenerationExplainer`

## Component rules

Every component should declare:

- component id
- accepted page types
- required fields
- optional fields
- allowed proof types
- CTA compatibility
- schema contribution
- internal-link contribution
- analytics events
- accessibility requirements

Example:

```yaml
component:
  id: project_card
  page_types:
    - homepage
    - projects_hub
    - service
    - location
    - niche_landing
  required:
    - project_title
    - service
    - city
    - summary
  optional:
    - thumbnail
    - result_summary
    - testimonial
  analytics:
    on_click: project_card_open
```

## Homepage page-config model

```yaml
page:
  slug: /
  page_type: flagship_home
  audience: contractor_owner
  primary_goal: qualified_strategy_call

brand:
  company: Agile Marketing Systems Inc.
  product: Agile AI Website & Growth System
  market: contractors

sections:
  - hero_flagship
  - constraint_statement
  - system_card_grid
  - niche_card_grid
  - project_engine
  - process_steps
  - ownership_model
  - case_study_grid
  - final_cta

proof:
  testimonials: verified_only
  case_studies: verified_only
  project_examples: verified_only
  client_logos: permission_verified_only

ai_rules:
  may_adapt_niche_language: true
  may_select_approved_components: true
  may_generate_unverified_results: false
  may_generate_reviews: false
  may_generate_pricing: false
  may_generate_service_areas: false
  may_generate_license_claims: false
```

## Analytics events

Initial homepage events:

- `hero_primary_cta_click`
- `hero_secondary_cta_click`
- `system_module_open`
- `niche_card_open`
- `project_card_open`
- `case_study_open`
- `qualification_form_start`
- `qualification_form_submit`
- `phone_cta_click`
- `final_cta_click`

All events should include page type, niche when applicable, traffic source, and session attribution where available.

## Content-migration guidance

### Preserve / reuse after verification

- Agile brand identity
- logo / favicon assets
- legitimate contractor proof
- Project Pages concept and selected screenshots
- verified client logos
- verified testimonials
- verified case studies
- useful founder/company history

### Rewrite

- generic agency positioning
- old SEO-service framing
- old lead-generation guarantees
- old pricing plan language
- generic branding-service pages
- broad Minneapolis-agency positioning

### Exclude

- any spam or hacked content
- any claim that cannot be verified
- any casino/gambling page or asset from ACM
- malware-contaminated database content
- legacy redirects created solely by compromise

## Build order

1. flagship homepage
2. `/system/`
3. `/ai-websites/`
4. `/projects/`
5. `/case-studies/`
6. `/contractors/`
7. first niche pages
8. `/local-seo/`
9. `/how-it-works/`
10. `/about/`
11. `/get-started/`
12. `/website-factory/`

## Launch gate for homepage

Do not publish until:

- all claims verified
- all proof assets approved
- project/case-study data clean
- forms route correctly
- analytics events fire
- metadata/canonical/schema validated
- mobile QA passes
- accessibility QA passes
- performance QA passes
- redirect map is ready
- legacy WordPress rollback remains available

## Next implementation artifact

Create the machine-readable component schema and first `SITE_CONFIG` / EmDash page-config fixture for the flagship homepage.
