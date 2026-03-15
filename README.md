# GhostClaw Buildable System

## GhostClaw OS Definition

GhostClaw OS is the canonical runtime orchestration layer for AI agents: a signal-driven, structured, persistent, policy-governed, workspace-aware environment where agents coordinate through plans, jobs, skills, and workflows to produce auditable outcomes.

### What this means in practice

- Signals enter the runtime through the API and are scoped to a workspace.
- The planner routes signals into plans and decomposes plans into jobs.
- Jobs execute via registered agents matched to explicit skills and capabilities.
- Workflows coordinate dependency order and unblock downstream jobs.
- Approvals and workspace policies govern what can be reviewed, published, and where outputs can go.
- Events/audit logs record runtime actions as an auditable trail.
- Workspaces isolate company/runtime environments while sharing a common GhostClaw OS core.
