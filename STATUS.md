# STATUS.md — GhostClaw Runtime Source of Truth

**Repo:** `jesseghostley/ghostclaw-buildable-system`
**Branch:** `claude/ai-operating-partner-setup-S8F7r`
**Tests:** 414/414 pass (24 suites)
**Last verified:** 2026-03-17

---

## What Is Complete

| Layer | Status | Test Coverage |
|-------|--------|---------------|
| Runtime loop (Signal → Plan → Job → Artifact) | Done | Yes |
| Signal router (5 actions) | Done | Yes |
| Planner registry (5 strategies) | Done | Yes |
| Job queue + executor | Done | Yes |
| Job output forwarding (step N output → step N+1 input) | Done | Yes |
| Skill registry (3 contractor skills + legacy fallback) | Done | Yes |
| Agent registry (10 agents) | Done | Yes |
| Agent type system (identity + state + skills) | Done | Yes |
| Assignment store | Done | Yes |
| Skill invocation store | Done | Yes |
| Blueprint type system + registry | Done | Yes |
| Contractor Website Factory blueprint | Done | Yes |
| Workspace type system + store | Done | Yes |
| Approval flow (pending → approve/reject → publish) | Done | Yes |
| Audit log (append-only) | Done | Yes |
| Event bus (16 typed events) | Done | Yes |
| SQLite persistence (9 stores: signals, plans, jobs, skill invocations, artifacts, audit, publish events, blueprints, workspaces) | Done | Yes |
| In-memory persistence (all 12 stores) | Done | Yes |
| API: signals, runtime, jobs, skill-invocations, runtime-events | Done | Yes |
| API: workspaces, blueprints, approvals | Done | Yes |
| Ghost Mart package store | Done | Yes |
| Workspace policies | Done | Yes |

## What Is Canonical

- **Contractor Website Factory** is the only production blueprint. All runtime code is validated against this flow.
- **Skill registry** is the primary handler source. The executor resolves skills from the registry first, legacy `LEGACY_JOB_HANDLERS` second.
- **Blueprint JSON** lives at `packages/blueprints/src/contractor_website_factory.ts`. This is the single source for steps, agents, skills, and approval gates.
- **Skill definitions** live at `packages/skills/src/`. These are the canonical handler implementations.

## What Is Deprecated

| Item | Reason |
|------|--------|
| Inline contractor handlers in `job_executor.ts` | Moved to skill registry. The 3 contractor handlers no longer exist in `LEGACY_JOB_HANDLERS`. |
| Any blueprint/skill/agent JSON from older zips, Google Docs, or parallel repos | This repo is the only source of truth. |
| `eighteen-app-eighteen-core` scaffold structures that duplicate runtime types | Use this repo's types. |

## What Still Needs to Ship for Demo Readiness

1. **Dashboard UI** — operator approval screen hitting `GET /api/approvals/pending` + `POST /api/approvals/:id/approve`
2. **CMS publish target** — real endpoint behind `POST /api/approvals/:id/publish` with `externalUrl`
3. **SQLite mode activation** — `STORAGE_MODE=sqlite` env var wiring in `app.ts` (stores exist, activation toggle does not)
4. **Runtime event log subscriber for new stores** — blueprints/workspaces not yet emitting to event log

## What Should NOT Be Copied

- Blueprint schemas from Google Docs or Notion — they are stale
- Agent definitions from `eighteen-app-eighteen-core` — they predate the skill registry
- Skill handler logic from any zip export — the canonical handlers have forwarding support those do not
- Any `JOB_HANDLERS` map that includes `design_site_structure`, `generate_page_content`, or `review_and_approve` — these are now served by the skill registry exclusively
