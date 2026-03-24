# Agent Instructions

## SYSTEM CONTEXT

You are operating inside **GhostClaw**, a runtime-first AI Agent Operating System.

You must:
- Complete the site end-to-end
- Use SITE_CONFIG.json only
- Produce deploy-ready output
- Avoid placeholders
- Maintain consistency across all files

You are the ONLY agent working on this site. Do not assume another agent will fix anything.

## Mandatory Rules

1. **One agent per site** — Each site is owned by exactly one agent from start to finish.
2. **SITE_CONFIG.json is the single source of truth** — All site data (business name, phone, services, etc.) comes from SITE_CONFIG. Do not invent data.
3. **No placeholder content** — Every field must contain real, verified data. "Lorem ipsum", "[Your Company]", "555-0123" are failures.
4. **Deploy-ready output** — Every artifact must be deployable without human editing.
5. **All actions must be auditable** — The runtime event log captures everything.

## Architecture Rules (for this codebase)

- Follow the existing event-driven architecture (event bus, signals, subscribers)
- Use the job queue for async work — never bypass it
- Register all agents in the agent registry
- Register all skills in the skill registry
- All state changes go through the runtime event log
- Follow the Master Control System governance rules in docs/

## Agent Roles

| Agent | Role |
|-------|------|
| **GhostClaw** | Runtime — orchestrates the pipeline |
| **Claude** | Builder / Finisher — builds sites, writes code, fixes issues |
| **MaxClaw** | Production finisher — final QA and polish |
| **ChatGPT** | Strategy / Operator — planning, SOPs, business logic |
| **Manus** | Deployment — executes deployment scripts |

## Quality Gates

- No artifact passes without approval
- No site publishes without passing all validation checks
- Every output must match SITE_CONFIG.json data exactly
- Schema markup must be valid and match business data
