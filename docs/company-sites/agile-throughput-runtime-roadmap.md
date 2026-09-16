# Agile Throughput Runtime Roadmap

Status: Draft execution roadmap

## Objective

Implement contractor throughput and Theory of Constraints as the governing optimization model for the Website Factory runtime.

## Runtime sequence

`Measure → Diagnose Constraint → Exploit Constraint → Test if useful → Evaluate Throughput → Re-Diagnose`

## Phase 1 — data contracts

- `constraint` object
- `capacity` object
- throughput-stage metrics
- client qualification state
- experiment objects reference `constraint_id`
- protected business facts remain locked

## Phase 2 — diagnosis skill

Add a runtime skill conceptually equivalent to `diagnose_contractor_constraint`.

Inputs:
- verified funnel-stage measurements
- capacity state
- client/operator evidence
- known business facts

Outputs:
- primary candidate constraint
- confidence
- evidence
- recommended first intervention
- recommended primary metric
- whether demand expansion should be suppressed

The skill must support an `insufficient_evidence` outcome.

## Phase 3 — intervention planner

Add planner logic that chooses the smallest useful intervention to exploit the active constraint.

Possible intervention families:
- visibility / local SEO
- trust / proof
- website conversion
- speed-to-lead / routing
- appointment / intake
- follow-up
- sales enablement
- reputation
- capacity/process

Not every intervention becomes an A/B test.

## Phase 4 — capacity gate

Before prescribing more demand, evaluate:
- current completed jobs
- sustainable capacity
- qualified demand pressure
- downstream leakage

When `near_capacity` or `over_capacity`, upstream demand expansion should be suppressed by default.

## Phase 5 — experiment binding

Experiments should normally require:
- `constraint_id`
- intervention objective
- primary downstream metric
- supporting metrics
- protected facts
- approval state

## Phase 6 — operator dashboard

Show:
- throughput chain
- current primary constraint
- evidence/confidence
- capacity state
- active intervention
- active experiments
- downstream business outcomes
- next re-diagnosis date

## Phase 7 — agency audit integration

The Contractor Growth Constraint Audit should create or seed:
- a provisional constraint record
- a capacity record
- client qualification state
- measurement gaps
- recommended setup work

## Non-goals for initial implementation

- no autonomous changes to CRM routing or sales process
- no autonomous ad-budget changes
- no autonomous production traffic allocation
- no unsupported profitability inference
- no pretending missing funnel data is known
