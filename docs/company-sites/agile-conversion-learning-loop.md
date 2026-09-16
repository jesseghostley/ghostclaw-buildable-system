# Agile Conversion Learning Loop

Status: Draft implementation contract
Scope: Website Factory product architecture + `agilemarketingsystems.com` flagship reference implementation

## Purpose

The Website Factory should not stop at generating and launching a contractor website. It should create a measurable conversion system that can learn from visitor behavior, test controlled variations, identify the current limiting step in the funnel, and promote verified winners back into the site configuration.

The flagship Agile Marketing Systems site should demonstrate this operating model directly.

## Product model

The system is five connected layers:

1. **Website Factory** — generate the niche-specific site from structured business facts, verified proof, approved brand rules, reusable components and route configuration.
2. **Conversion Instrumentation** — track meaningful visitor actions such as qualified leads, booked calls, CTA interactions, form starts/completions, calls and route progression.
3. **Experiment Engine** — generate controlled variants of approved components without changing verified business facts or inventing proof.
4. **Learning Loop** — compare experiment outcomes against defined primary and secondary metrics and identify which variant improves the targeted constraint.
5. **Canon Promotion** — after a winner meets the approved evidence threshold, promote its component values back into canonical `SITE_CONFIG` rather than leaving the winning variation as ad-hoc markup.

## Core principle

**Build once. Learn continuously. Improve the constraint that matters.**

The objective is not aesthetic churn. The objective is measurable improvement in qualified business outcomes.

## Metric hierarchy

Primary metrics should represent business outcomes whenever the integration permits it.

Preferred order:

1. revenue / closed job attribution
2. qualified lead
3. booked strategy call / appointment
4. completed intake or form submission
5. phone call meeting duration/quality threshold

Supporting metrics may include:

- primary CTA click
- secondary CTA click
- demo/video engagement
- form start
- route progression
- scroll depth
- engagement time
- bounce / exit behavior

A supporting metric must not automatically override a worse primary business outcome.

## Experiment object

```yaml
experiment:
  id: homepage_hero_001
  route: /
  component: hero
  objective: increase qualified contractor inquiries
  hypothesis: a constraint-led headline will outperform the control for qualified lead rate
  primary_metric: qualified_lead
  secondary_metrics:
    - cta_click
    - form_start
    - bounce
  variants:
    - id: control
      weight: 34
      fields:
        headline: Turn Your Website Into a Growth System
    - id: constraint
      weight: 33
      fields:
        headline: Stop Losing Leads Between Your Website and Follow-Up
    - id: outcome
      weight: 33
      fields:
        headline: Build a Contractor Growth System That Turns More Traffic Into Jobs
  status: draft
  winner: null
  promotion_status: not_evaluated
```

## Allowed experiment targets

Initially support controlled experiments on:

- hero headline
- hero subhead
- primary CTA label
- secondary CTA presence / label
- hero proof placement
- section order within an approved set
- FAQ presence and ordering
- Project/Proof placement
- demo/explainer CTA placement
- get-started step wording
- booking/intake interaction flow

Later support component-level layout treatments, provided accessibility and brand constraints remain intact.

## Locked data during experiments

Experiments must not alter or fabricate:

- pricing
- guarantees
- customer names
- testimonials
- project outcomes
- case-study metrics
- licenses
- certifications
- service areas
- business addresses
- phone numbers
- regulatory claims
- financing terms
- factual service capabilities

Verified facts remain locked source data. Experiments change presentation and approved messaging, not truth.

## Agency-site implementation

`agilemarketingsystems.com` should communicate that the product is not a one-time website build. The flagship should visibly demonstrate the cycle:

**Diagnose → Build → Measure → Test → Learn → Improve**

Recommended homepage addition:

### Built to improve after launch

Most websites are treated as finished projects. Ours are designed as measurable growth systems.

We instrument the important conversion paths, identify where prospects drop out, test controlled improvements and use evidence to decide what becomes the new standard.

Suggested supporting cards:

- **Measure the right outcome** — Optimize around qualified leads, booked calls and revenue where available, not vanity clicks alone.
- **Test the limiting step** — Focus experiments on the page, message or interaction that is actually constraining throughput.
- **Promote proven winners** — Winning variants become part of the canonical configuration so the system learns instead of accumulating one-off edits.

## Website Factory workflow

### Initial build

`Business facts → niche configuration → approved modules → render → QA → launch`

### Post-launch loop

`Analytics → constraint diagnosis → experiment proposal → approval gate → variant render → traffic allocation → measurement → evaluation → canon promotion → audit`

This fits the GhostClaw execution model:

`Signal → Planner → Jobs → Agents → Skills → Artifacts → Approval → Publish → Audit`

Experiment creation, launch and canon promotion should each be auditable actions.

## Approval gates

Human approval is required before:

- launching a new experiment that materially changes the public offer
- changing pricing or guarantee language
- changing form destinations or booking behavior
- promoting a winner when the result changes positioning materially
- publishing a variant that uses new proof

Low-risk wording tests may later be eligible for policy-controlled auto-approval, but that is not part of the initial implementation.

## Mobile-first conversion design

The factory should treat the conversion interaction itself as part of the product.

For contractor traffic, especially paid-social traffic, `/get-started/` should evolve toward a low-friction thumb-friendly staged intake rather than a generic embedded form.

Proposed sequence:

1. Contractor trade / niche
2. Primary growth constraint
3. Primary market / service area
4. Current website
5. Current lead source / rough lead-flow context
6. Contact information
7. Booking option

No production form should render without a configured, approved submission endpoint.

## Experiment data requirements

Each experiment record should preserve:

- experiment ID
- route
- component
- hypothesis
- owner
- start/end timestamps
- primary metric
- secondary metrics
- traffic weights
- variant field diffs
- sample counts
- outcome summary
- decision
- winner, if any
- promotion commit / config change reference
- rollback reference

## Evidence rules

The platform should not claim an experiment winner merely because one variant has more raw clicks.

Initial decision policy:

- primary business metric takes precedence
- minimum sample threshold must be configured before winner declaration
- experiment may end as inconclusive
- no automatic public claims such as “X% conversion lift” without verified analytics records and approval
- historical experiment outcomes are evidence records, not copy-generation prompts by default

## Website Factory product positioning

This adds a differentiated system layer to the offer:

> We do not just build contractor websites. We build measurable website and growth systems designed to learn which messages, pages and conversion paths produce better qualified outcomes — then improve the constraint that matters.

The public version should stay simpler than the internal architecture. The flagship can explain the learning loop without exposing internal credentials, model routing, infrastructure secrets or unverified performance claims.

## Implementation phases

### Phase 1 — contract and flagship messaging

- add experiment schema to component/site configuration
- add a conversion-learning section to the Agile homepage
- define primary/secondary metric hierarchy
- preserve CTA analytics events
- add tests preventing fabricated results

### Phase 2 — experiment runtime

- deterministic visitor assignment
- experiment and variant identifiers in rendered output
- event payload attribution
- Cloudflare-compatible experiment routing or edge assignment
- experiment state persistence

### Phase 3 — reporting and evaluation

- dashboard / operator view
- qualified conversion comparison
- experiment health / sample counts
- inconclusive/winner decision state

### Phase 4 — canon promotion

- approved winner writes back to structured config through an auditable change
- rerender + QA
- rollback reference retained

## Non-goals for current PR

- no production traffic splitting yet
- no autonomous winner promotion
- no claim that Agile or a client has achieved a specific conversion lift
- no live intake endpoint change
- no DNS or production cutover
