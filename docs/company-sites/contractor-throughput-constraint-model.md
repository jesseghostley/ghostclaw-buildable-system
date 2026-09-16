# Contractor Throughput & Constraint Model

Status: Draft implementation contract
Scope: Website Factory runtime + Agile contractor-growth product + agency funnel

## Governing principle

A contractor business is only growing as fast as its current limiting constraint allows.

The system should optimize for **profitable completed jobs per period**, not for traffic, impressions, clicks, pages published, raw lead volume, or any other upstream activity in isolation.

## Top-level operating loop

The Website Factory optimization model is:

**Build → Measure → Diagnose Constraint → Exploit Constraint → Test → Improve Throughput → Find Next Constraint → Repeat**

Conversion testing remains an important subsystem, but it is subordinate to constraint diagnosis. Experiments should normally exist to relieve a diagnosed constraint rather than because testing is technically available.

## Contractor throughput chain

Model the contractor customer journey as a measurable chain:

**Demand → Visibility → Trust → Lead Capture → Speed-to-Lead → Appointment → Estimate → Close → Completed Job → Review / Referral / Repeat**

The runtime should allow measurement at each stage when integrations or verified operator inputs are available.

## Constraint categories

Initial schema should allow at least:

- `market` — insufficient demand or addressable opportunity
- `visibility` — demand exists but the contractor is not discovered
- `trust` — prospects lack enough confidence, proof, clarity, or credibility
- `conversion` — qualified traffic does not inquire
- `response` — inbound leads are not answered or routed quickly enough
- `appointment` — inquiries do not become scheduled appointments
- `estimate` — appointments do not produce estimates/proposals consistently
- `sales` — estimates do not close at an acceptable rate
- `capacity` — fulfillment capacity is limiting completed jobs
- `reputation` — insufficient reviews, project proof, or third-party trust
- `follow_up` — opportunities/customers are not being nurtured
- `leadership_process` — approvals, decisions, staffing, or operating process throttle throughput

V1 does not need full automation for every category. The data model should support them from the beginning.

## Constraint object

```yaml
constraint:
  id: trust_001
  category: trust
  stage: evaluation
  status: active

  hypothesis: >-
    Qualified visitors lack enough local project proof to confidently request an estimate.

  evidence:
    - strong organic traffic
    - acceptable service-page engagement
    - low visitor-to-qualified-lead conversion
    - few project pages
    - weak before/after proof
    - sales calls repeatedly ask for examples of similar work

  throughput_metric:
    primary: qualified_lead_rate

  supporting_metrics:
    - project_page_engagement
    - CTA_rate
    - form_start_rate

  interventions:
    - add local project pages
    - move proof higher on service pages
    - add relevant case studies
    - improve review presentation

  protected_facts:
    - service claims
    - licenses
    - warranties
    - locations served
    - customer quotes
```

## Constraint lifecycle

Recommended statuses:

- `candidate`
- `diagnosing`
- `active`
- `being_exploited`
- `testing_intervention`
- `relieved`
- `superseded`
- `inconclusive`

Only one constraint should normally be designated `primary` for a given operating period, though secondary constraints may be recorded.

## Exploit before expand

The runtime should default to an **exploit-before-expand** policy.

If enough demand already exists but throughput is being lost downstream, do not automatically prescribe more SEO, ads, content, or lead volume.

Example:

```text
100 inquiries
→ 55 answered
→ 30 estimates
→ 10 jobs
```

A plausible first intervention is response/follow-up, not another 100 inquiries.

The system must be able to produce a recommendation such as:

> Traffic is not the current limiting constraint.

Upstream demand expansion should require evidence that the downstream constraint has sufficient capacity to absorb additional volume.

## Capacity gate

Capacity must be modeled explicitly.

```yaml
capacity:
  current_completed_jobs: 28
  estimated_sustainable_capacity: 35
  demand_pressure: near_capacity
  recommendation:
    suppress_demand_expansion: true
```

Suggested demand-pressure states:

- `underutilized`
- `balanced`
- `near_capacity`
- `over_capacity`
- `unknown`

The capacity object may begin as intake/operator-entered data and later become integration-driven.

If current qualified demand already exceeds sustainable capacity, the system should not treat more demand as the default growth prescription.

## Throughput metric hierarchy

Primary hierarchy:

1. profitable completed job
2. revenue / closed job
3. closed job
4. qualified lead
5. booked appointment
6. completed intake
7. qualified phone call

Constraint-specific metrics may sit between these levels when they are causally useful, for example:

- lead response rate
- median speed-to-lead
- appointment set rate
- estimate issued rate
- close rate
- completion capacity utilization
- review request completion rate

Supporting/diagnostic metrics include:

- CTA click
- form start
- scroll depth
- bounce
- page engagement
- project-page engagement

A supporting metric must never independently determine success when a more downstream business outcome is available.

## Relationship to experiments

Every experiment should reference a diagnosed constraint whenever possible.

```yaml
experiment:
  id: trust_001_project_proof_hero
  constraint_id: trust_001
  route: /water-damage/
  component: proof_strip
  hypothesis: placing verified local project proof above the first CTA will improve qualified-lead rate
  primary_metric: qualified_lead_rate
```

Random experimentation is discouraged. The preferred sequence is:

**constraint hypothesis → evidence → exploit/intervention → experiment if uncertainty remains → throughput result → re-diagnose**

## Intervention types

The planner should eventually support interventions such as:

- website messaging/layout
- local SEO architecture
- project/proof publishing
- review/reputation improvements
- lead-routing changes
- response automation
- booking/intake changes
- follow-up sequences
- sales enablement
- capacity/process recommendations

Not every intervention is a website experiment.

## Contractor Growth Constraint Audit

This should become a first-class front-end product and qualification mechanism.

Public offer:

> **Find the #1 bottleneck keeping your contractor business from producing more profitable jobs.**

Initial audit categories:

- Demand
- Visibility
- Trust
- Conversion
- Response
- Sales
- Follow-up
- Reputation
- Capacity

Audit output:

```yaml
constraint_audit:
  primary_constraint: response
  evidence:
    - 42 percent of inbound calls go unanswered during business hours
    - median first response is 47 minutes
    - estimate close rate is otherwise acceptable
  recommended_intervention:
    - improve call routing
    - add missed-call text-back
    - add lead-response SLA
  primary_metric: answered_qualified_lead_rate
```

The audit should later feed:

- `SITE_CONFIG`
- CRM/intake facts
- project-page strategy
- automation configuration
- experiment proposals
- managed-service roadmap

## Client qualification

The best-fit managed-service customer is not simply a contractor who needs a website.

Qualification should assess whether there is enough economic opportunity to improve throughput and whether the contractor can absorb and operationalize growth.

Suggested qualification dimensions:

- viable service economics / gross-margin room
- identifiable demand or realistic market opportunity
- ability to measure at least some funnel stages
- willingness to connect CRM/call/booking data where practical
- availability of proof or ability to build it
- operational willingness to improve response/follow-up/sales process
- current or expandable fulfillment capacity
- decision-maker participation
- sufficient lead/job value to justify managed optimization

A contractor with no capacity, no willingness to follow up, and no ability to fulfill additional profitable work may be a poor fit for demand-generation services until the actual constraint changes.

## Runtime decision rules

1. Do not assume traffic is the constraint.
2. Prefer the deepest reliable business outcome available.
3. Diagnose before prescribing.
4. Exploit the active constraint before expanding upstream load.
5. Respect the capacity gate.
6. Attach experiments to a constraint when possible.
7. Do not declare success from vanity metrics alone.
8. After an intervention improves throughput, re-diagnose because the constraint may have moved.
9. Keep verified business facts protected throughout testing and optimization.
10. Require human approval for material operational or public-offer changes in the initial implementation.

## Website Factory architecture

The Website Factory should evolve into these layers:

1. **Build Layer** — niche site generation from verified structured facts.
2. **Measurement Layer** — connect web, call, booking, CRM, sales, completion, review, and capacity signals where available.
3. **Constraint Engine** — identify and rank candidate constraints with evidence/confidence.
4. **Intervention Planner** — propose the smallest useful action to exploit/relieve the active constraint.
5. **Experiment Engine** — test presentation/workflow alternatives when uncertainty warrants testing.
6. **Throughput Evaluation** — judge intervention effect using downstream business outcomes.
7. **Canon / Workflow Promotion** — promote approved winners into configuration or operating workflow.
8. **Re-Diagnosis Loop** — identify the next constraint.

This fits GhostClaw's execution model:

`Signal → Planner → Jobs → Agents → Skills → Artifacts → Approval → Publish → Audit`

The constraint object should become part of planner context so Website Factory jobs are generated around the diagnosed bottleneck rather than generic marketing activity.

## Agency positioning

Agile's public positioning should move from "more traffic / more leads" toward:

> **We find and improve the constraint limiting profitable completed jobs.**

Supporting message:

> Sometimes the answer is more visibility. Sometimes it is proof, response time, follow-up, close rate, or capacity. We measure the system first, then improve the bottleneck that is actually limiting growth.

This is a stronger distinction from agencies that default to selling more SEO, ads, pages, or lead volume regardless of the client's operating constraint.
