# Agile Contractor Growth Constraint Audit

Status: Draft agency product/funnel contract
Site: `agilemarketingsystems.com`

## Front-end offer

> **Find the #1 bottleneck keeping your contractor business from producing more profitable jobs.**

This replaces the generic "free website audit" framing.

The audit is not limited to website design or SEO. It is a structured diagnosis of the contractor throughput chain:

**Demand → Visibility → Trust → Lead Capture → Speed-to-Lead → Appointment → Estimate → Close → Completed Job → Review / Referral / Repeat**

## Public promise

The audit should identify:

1. the most likely current constraint
2. the evidence supporting that diagnosis
3. the smallest practical intervention to test or implement first
4. the primary metric that should improve if the diagnosis is correct
5. whether upstream demand expansion should be suppressed because of downstream leakage or capacity

Do not promise a specific lift or guarantee that the diagnosis is correct. The audit should expose confidence/evidence and allow operator review.

## Audit categories

- Demand
- Visibility
- Trust
- Conversion
- Response
- Appointment / Estimate
- Sales
- Follow-up
- Reputation
- Capacity

## Intake design

The staged intake should be thumb-friendly and avoid a giant generic form.

Suggested steps:

1. **Trade / niche**
2. **Primary services**
3. **Primary market / service area**
4. **Current monthly completed jobs**
5. **Estimated sustainable monthly capacity**
6. **Approximate monthly inquiries / leads**
7. **How quickly new leads are normally answered**
8. **Approximate appointments / estimates**
9. **Approximate closed jobs**
10. **Current review / project-proof situation**
11. **Current website / CRM / call tracking availability**
12. **Biggest perceived growth problem**
13. **Contact details / strategy-call option**

The system may allow `unknown` values. Missing data should reduce confidence rather than trigger fabricated estimates.

## Example output

```yaml
constraint_audit:
  primary_constraint:
    category: response
    confidence: medium

  evidence:
    - monthly inquiry volume appears sufficient for current capacity
    - only about half of new inquiries are answered live
    - median reported follow-up is greater than 30 minutes
    - close rate after estimate appears acceptable

  recommendation:
    intervention:
      - improve call routing
      - add missed-call text-back
      - establish lead-response SLA
    suppress_demand_expansion: true

  primary_metric:
    answered_qualified_lead_rate

  next_review:
    after_30_days_or_sufficient_sample
```

## Agency messaging

### Headline direction

**More leads are not always the answer. Find the bottleneck first.**

### Supporting copy

A contractor business is only growing as fast as its current limiting constraint allows. We look across demand, visibility, trust, lead response, sales, follow-up, reputation and capacity to identify what is actually limiting profitable completed jobs.

Sometimes the right move is more local visibility. Sometimes it is stronger project proof, faster response, better follow-up, a clearer estimate path, or more fulfillment capacity.

The system should improve the constraint that matters — not sell more marketing activity by default.

## CTA language

Primary:

**Find My Growth Constraint**

Alternates for controlled testing after launch:

- Diagnose My Bottleneck
- Map My Contractor Growth System
- Find What Is Limiting More Jobs

CTA testing remains subordinate to the diagnosed agency-funnel constraint and verified business outcomes.

## Qualification output

The audit should also classify fit for managed optimization without treating every contractor as equally ready.

Suggested states:

- `managed_service_fit`
- `build_only_fit`
- `measurement_setup_first`
- `capacity_constraint_first`
- `operational_constraint_first`
- `not_enough_information`

The qualification decision should consider service economics, market opportunity, measurement access, proof availability, operational willingness, capacity, decision-maker participation, and economic value of incremental jobs.

## Website integration

Recommended route:

`/growth-constraint-audit/`

Recommended placement:

- homepage primary or secondary CTA
- `/system/`
- `/get-started/`
- contractor niche pages
- sales follow-up links

The route should remain preview/noindex until the real approved intake endpoint and data handling are configured.

## Data flow target

`Audit intake → constraint record → capacity record → SITE_CONFIG / client profile → intervention plan → experiment/workflow proposal → managed-service roadmap`

No live CRM, form, or booking changes are authorized by this document alone.
