# Contractor Execution Operating System

Status: Draft architecture contract
Scope: Website Factory runtime + Agile operating system + managed contractor systems

## Purpose

The Contractor Throughput / Theory of Constraints model determines **what deserves attention**. The Execution Operating System determines **what physically happens next, who owns it, and how the system guarantees it does not disappear**.

This layer sits underneath the constraint engine and above individual tools such as CRM, booking, forms, project publishing, reputation, content, email, phone and payment integrations.

## Governing loops

### Strategic throughput loop

`Build → Measure → Diagnose Constraint → Exploit Constraint → Select Intervention → Fix / Implement / Experiment → Improve Throughput → Reassess Constraint → Repeat`

### Execution loop

`Capture → Clarify → Define Next Action → Execute / Automate / Delegate → Wait / Trigger / Follow Up → Measure → Review`

### Learning loop

`Evidence → Intervention → Actions → Outcome → Learning → Institutional Memory → Next Constraint`

The three loops are connected. Diagnosis without execution is incomplete. Execution without constraint priority creates activity without throughput. Learning without provenance creates unreliable institutional memory.

## Core invariants

### Active commitment integrity

Every active commitment must have at least one of:

- a next executable action
- a waiting condition / dependency
- a scheduled time trigger
- an event trigger

If none exists, the record is operationally **orphaned**.

This invariant applies to active commitments, not passive backlog/LATER ideas.

Conceptually:

```ts
if (
  object.commitmentState === 'active' &&
  !object.nextAction &&
  !object.waitingOn &&
  !object.scheduledTrigger
) {
  object.integrityState = 'orphaned';
}
```

### Ownership

Every actionable record must have one accountable owner. Delegation does not remove accountability; delegated work becomes WAITING ON the delegate or system while remaining visible to the accountable owner.

### Provenance

AI may clarify and structure aggressively, but must preserve whether a value is:

- explicitly stated fact
- system-observed fact
- AI inference
- uncertain assumption
- human-approved conclusion

### No activity optimization in isolation

Execution exists to relieve the current constraint on profitable completed-job throughput. The system should not manufacture tasks simply because automation or content generation is available.

## Universal execution primitive

Initial contract:

```yaml
execution_state:
  object_id:
  object_type:
  commitment_state: active | passive
  queue: now | waiting | scheduled | later | completed | cancelled
  integrity_state: healthy | orphaned | overdue | stale | blocked

  owner:
  next_action:
  waiting_on:
  scheduled_trigger:
    type: time | event
    at:
    event:
  due_at:

  source:
  related_client:
  related_project:
  related_constraint:
  related_intervention:

  evidence_source:
  confidence:
  approval_state:

  created_at:
  updated_at:
```

Field names may evolve, but the semantic contract is stable.

## Four operating queues

### NOW
Actionable now. It should contain executable actions, not vague outcomes.

### WAITING
Blocked by another person, system, dependency or external event. A follow-up or trigger should exist where appropriate.

### SCHEDULED
Intentionally deferred until a known time or event trigger.

### LATER
Potential work that is not currently an active commitment. LATER records are not orphaned merely because they lack a next action.

## Projects versus next actions

A project is a multi-step outcome. A next action is physically executable.

Bad:

`Improve contractor trust`

Better:

```text
PROJECT: Improve local trust
CONSTRAINT: Trust
INTERVENTION: Local project proof
NEXT ACTION: Request photos from three completed jobs
WAITING ON: Client after request is sent
TRIGGER: client_assets_received
THEN: Generate first-pass project pages
THEN: Human approval
THEN: Publish
THEN: Measure qualified-lead rate
THEN: Reassess constraint
```

## Universal capture

Capture sources may include:

- website forms
- email
- phone/call transcripts
- SMS
- bookings
- CRM events
- payment events
- webhooks
- files/photos
- client requests
- manual notes
- AI conversations
- GitHub/development events

Principle:

**Humans capture. The system organizes.**

A capture does not require the human to know its final destination.

## Confidence and approval

Keep separate:

- constraint confidence
- intervention confidence
- action confidence/source
- approval state

Do not blur evidence-backed conclusions with AI-suggested actions.

## Intervention execution

Interventions are first-class executable objects.

Lifecycle:

`candidate → approved → planned → executing → measuring → effective | ineffective → completed | superseded`

Each intervention should support:

- constraint_id
- type: fix | implementation | experiment
- probable cause
- owner
- next action
- success metric
- baseline
- target where appropriate
- evidence requirements
- stop condition
- review date
- outcome
- learning

### FIX
Known defect or failure. Example: broken form, failed routing, missing confirmation, unanswered lead.

### IMPLEMENTATION
Reasonable intervention where controlled comparison is unnecessary or impractical.

### EXPERIMENT
Uncertain intervention that benefits from comparative testing.

Experiments remain subordinate to diagnosed constraints and interventions.

## Automation principle

If the system can safely and reliably perform an action automatically, automate it.

Good initial automation candidates:

- lead acknowledgment
- owner assignment
- follow-up creation
- appointment confirmation
- project record creation
- review-request scheduling
- payment-triggered state advancement
- missed-call alert
- project-page first draft
- recurring integrity scans

Human attention remains focused on judgment, relationships, exceptions, strategy and approval.

Consequential customer-facing, destructive, financial or strategic actions remain approval-gated unless explicitly authorized.

## SLA / state-transition monitoring

Operational timing failures should be modeled explicitly.

```yaml
transition_monitor:
  object_id:
  expected_transition:
  target_time:
  breach_condition:
  escalation_owner:
  recovery_action:
```

Useful for lead response, estimate delivery, booking confirmation, insurer follow-up, customer approval, payment failures, missing assets, review requests and automation failures.

## Integrity / orphan detector

The orphan detector continuously asks:

**What active object has no owner, next action, dependency or trigger?**

It should also surface:

- overdue actions
- stale WAITING records
- SLA breaches
- failed automations
- unanswered customer requests
- stale opportunities
- blocked interventions
- experiments without outcomes
- missing client dependencies
- projects with no executable next action

This can become a high-value cross-system AI agent.

## Dashboards

### Business throughput

- qualified leads
- appointments
- estimates
- close rate
- completed jobs
- revenue
- margin/contribution where verified
- repeat/referral business

### Operating-system integrity

- active commitments without next action/dependency/trigger
- overdue actions
- stale waiting records
- SLA breaches
- failed automations
- unanswered requests
- stale opportunities
- blocked interventions
- experiments without outcomes
- missing client dependencies
- orphaned projects

The second dashboard answers: **Can we trust the operating system?**

## Reconciliation / review

Recurring reviews should surface exceptions rather than rely on memory.

Examples:

```text
4 leads have no next action
3 estimates have been waiting more than 5 days
2 jobs await insurer decisions
1 missed-call workflow failed
6 customers qualify for review requests
2 interventions lack sufficient evidence
1 experiment has enough evidence to stop
capacity = 92%
```

The same model applies internally to Agile/AWF builds, hosting, client assets, deployments, approvals, billing and development work.

## Connection to constraint diagnosis

Operational integrity data feeds the constraint engine.

Example:

```text
OBSERVATION: 38% of incoming leads exceeded response SLA
OPERATIONAL FINDING: 12 assigned leads remained untouched
CONSTRAINT: Response
CONFIDENCE: Probable
INTERVENTION: Call routing + missed-call recovery
NEXT ACTION: Configure routing workflow
MEASUREMENT: Median first-response time
REASSESS: 14 days
```

## Suppression propagation

Constraint state should influence recommendations.

If capacity is validated as the current constraint:

- suppress default demand-expansion recommendations
- flag paid-media review
- prioritize capacity/remediation work

If response is validated as the current constraint:

- suppress additional lead-generation recommendations
- prioritize response/follow-up remediation

No autonomous spend changes without explicit authorization.

## Institutional memory

Preserve important improvement history as structured records:

- constraint
- evidence
- confidence
- intervention
- approval
- actions taken
- outcome
- failures
- learning
- next constraint

Client-specific facts remain separate from generalized niche patterns.

## Universal client operating record

Mature model:

```text
CLIENT
├── business profile
├── economics
├── capacity
├── leads
├── opportunities
├── jobs
├── captures
├── projects
├── actions
├── waiting items
├── triggers
├── constraint history
├── interventions
├── experiments
├── outcomes
├── assets/proof
├── automations
└── review history
```

This is business/operational memory, not merely a CRM contact record.

## AWF internal lifecycle

Example:

`CAPTURED → QUALIFIED → PAID → INTAKE_REQUIRED → READY_FOR_BUILD → BUILDING → CLIENT_INPUT_REQUIRED → READY_FOR_QA → READY_TO_PUBLISH → PUBLISHED → OPTIMIZATION → ONGOING`

Every active non-terminal state requires a next action, waiting condition or trigger. Otherwise it is ORPHANED and should surface immediately.

## Category definition

The product is evolving from "AI websites + marketing automation" into:

**An AI-assisted contractor growth and operating system that identifies what is constraining profitable growth, organizes and executes the work required to relieve it, ensures nothing falls through the cracks, measures whether it worked, preserves what was learned, and then identifies the next constraint.**

Existing Website Factory, SEO, CRM, booking, reputation, project-page, content, conversion-learning and automation capabilities become tools available to the intervention and execution engines.

## Non-goals for current implementation

- not a replacement for every CRM, ERP or field-service platform
- no autonomous ad-budget changes
- no destructive customer/account action without approval
- no fake proof or invented business facts
- no production workflow migration in this architecture-only phase
