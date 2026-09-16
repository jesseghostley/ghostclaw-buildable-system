# Agile Conversion Learning Loop

Status: Draft implementation contract
Scope: Website Factory experiment subsystem + `agilemarketingsystems.com` flagship reference implementation

## Governing relationship

Conversion learning is **not** the top-level optimization model.

The governing model is the Contractor Throughput & Constraint Model documented in:

`docs/company-sites/contractor-throughput-constraint-model.md`

The top-level objective is **profitable completed jobs per period**.

The operating loop is:

**Build → Measure → Diagnose Constraint → Exploit Constraint → Test → Improve Throughput → Find Next Constraint → Repeat**

Conversion testing sits inside that loop and should normally be used to relieve a diagnosed constraint.

## Product model

1. **Website Factory** — generate the niche-specific site from structured business facts, verified proof, approved brand rules, reusable components and route configuration.
2. **Measurement Layer** — connect web, call, booking, CRM, sales, completion, review and capacity signals where available.
3. **Constraint Engine** — identify the stage currently limiting profitable completed jobs.
4. **Intervention Planner** — choose the smallest useful intervention to exploit or relieve the active constraint.
5. **Experiment Engine** — generate controlled variants when uncertainty warrants testing.
6. **Throughput Evaluation** — judge outcomes by downstream business results rather than vanity metrics.
7. **Canon Promotion** — after approval, promote proven presentation/workflow changes back into canonical configuration.
8. **Re-Diagnosis** — find the next limiting constraint.

## Core principle

**Do not test because testing is available. Test because a diagnosed constraint creates a useful hypothesis.**

## Metric hierarchy

Preferred business-outcome order:

1. profitable completed job
2. revenue / closed job
3. closed job
4. qualified lead
5. booked appointment
6. completed intake
7. qualified phone call

Constraint-specific metrics may include response rate, speed-to-lead, appointment-set rate, estimate rate, close rate, capacity utilization and review-generation rate.

Supporting metrics may include CTA clicks, form starts, route progression, scroll depth, engagement and bounce.

A supporting metric must not override a worse downstream business outcome.

## Experiment object

```yaml
experiment:
  id: trust_001_project_proof_hero
  constraint_id: trust_001
  route: /water-damage/
  component: proof_strip
  objective: relieve the active trust constraint
  hypothesis: verified local project proof placed above the first CTA will improve qualified-lead rate
  primary_metric: qualified_lead_rate
  secondary_metrics:
    - project_page_engagement
    - cta_click
    - form_start
  variants:
    - id: control
      weight: 50
      fields:
        placement: below_services
    - id: proof_high
      weight: 50
      fields:
        placement: above_primary_cta
  status: draft
  winner: null
  promotion_status: not_evaluated
```

Experiments without a `constraint_id` should be allowed only when explicitly justified, for example initial baseline research or a low-risk discovery test.

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

Not every intervention should be an A/B test. Response routing, follow-up workflows, sales process, reputation, or capacity changes may be better interventions for the active constraint.

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

The flagship should communicate the larger throughput model first:

**Measure the business → find the bottleneck → improve it → measure throughput → find the next bottleneck.**

Conversion learning is one tool inside that system.

Recommended public message:

### Built to improve the constraint that matters

Most marketing starts by adding more traffic. We start by asking what is actually limiting profitable completed jobs.

Sometimes the answer is visibility. Sometimes it is proof, conversion, response time, follow-up, close rate or capacity. Once the limiting step is clear, we improve that part of the system and measure whether throughput actually improves.

Supporting cards:

- **Measure the right outcome** — Optimize around profitable completed jobs and downstream business outcomes where available.
- **Diagnose before testing** — Experiments should target the active bottleneck, not random page elements.
- **Exploit before expanding** — Do not buy or create more demand when the current system is leaking existing demand.
- **Promote proven improvements** — Approved winners become canonical configuration or workflow rather than one-off edits.

## Website Factory workflow

### Initial build

`Business facts → niche configuration → approved modules → render → QA → launch`

### Post-launch loop

`Measurement → constraint diagnosis → exploit/intervention → experiment if useful → throughput evaluation → approval → canon/workflow promotion → re-diagnosis → audit`

This fits GhostClaw:

`Signal → Planner → Jobs → Agents → Skills → Artifacts → Approval → Publish → Audit`

Experiment creation, launch and canon promotion should each be auditable actions.

## Approval gates

Human approval is required before:

- launching a new experiment that materially changes the public offer
- changing pricing or guarantee language
- changing form destinations or booking behavior
- promoting a winner when the result changes positioning materially
- publishing a variant that uses new proof
- operational recommendations that materially alter lead routing, sales process or capacity commitments

## Mobile-first conversion design

The conversion interaction itself remains part of the product.

For contractor traffic, `/get-started/` should evolve toward a low-friction staged intake that also captures enough context to begin a constraint diagnosis.

Proposed sequence:

1. Contractor trade / niche
2. Current business goal
3. Primary market / service area
4. Current website
5. Demand / lead-flow context
6. Response / booking / sales context
7. Capacity context
8. Contact information
9. Booking option

No production form should render without a configured, approved submission endpoint.

## Experiment data requirements

Each experiment record should preserve:

- experiment ID
- constraint ID
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
- downstream outcome summary
- decision
- winner, if any
- promotion commit / config change reference
- rollback reference

## Evidence rules

- primary business metric takes precedence
- minimum sample/evidence thresholds must be configured before winner declaration
- an experiment may end as inconclusive
- a variant must not be called a winner because CTR improved while downstream outcomes worsened
- no automatic public claims such as “X% conversion lift” without verified analytics records and approval
- historical experiment outcomes are evidence records, not copy-generation prompts by default

## Implementation phases

### Phase 1 — constraint contract + flagship messaging

- constraint schema
- capacity schema
- throughput-stage model
- conversion experiments reference diagnosed constraints
- Contractor Growth Constraint Audit route/funnel

### Phase 2 — experiment runtime

- deterministic visitor assignment
- experiment and variant identifiers in rendered output
- event payload attribution
- experiment state persistence

### Phase 3 — throughput reporting and diagnosis

- operator view of funnel stages
- constraint candidates with evidence/confidence
- capacity gate
- exploit-before-expand recommendations

### Phase 4 — canon/workflow promotion

- approved winner writes back to structured config or approved operating workflow
- rerender + QA
- rollback reference retained
- re-diagnose next constraint

## Non-goals for current PR

- no production traffic splitting yet
- no autonomous winner promotion
- no autonomous operational change to CRM, call routing or capacity
- no claim that Agile or a client has achieved a specific lift
- no live intake endpoint change
- no DNS or production cutover
