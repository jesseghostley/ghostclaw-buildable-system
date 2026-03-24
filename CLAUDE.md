# GhostClaw Buildable System — AI Agent Operating System

## Project Overview

GhostClaw is a **runtime-first AI Agent Operating System** that executes structured business workflows through a controlled pipeline.

It is NOT a content generator. It is an execution system.

## Pipeline

```
Signal → Planner → Jobs → Agents → Skills → Artifacts → Approval → Publish → Audit
```

## Tech Stack

- **Runtime**: TypeScript / Node.js
- **Database**: SQLite (better-sqlite3)
- **API**: Express.js
- **Testing**: Jest + Supertest
- **Infra target**: Ubuntu 24.04, PostgreSQL, Redis, Docker

## Key Directories

```
packages/core/src/    — Runtime implementation (event bus, job queue, agents, skills)
packages/planner/     — Planning layer
packages/shared/      — Shared utilities
apps/api/             — Express API server
apps/dashboard/       — Dashboard UI
docs/ghostclaw-system/ — 21 system design docs (architecture, agents, signals, etc.)
config/               — Blueprint rules, SITE_CONFIG template
data/                 — System definitions and indexes
```

## Build & Test

```bash
npm install
npm test
npm run build
```

## Infrastructure

| Resource | Host | Purpose |
|----------|------|---------|
| Hostinger VPS | srv1501574.hstgr.cloud (31.97.65.212) | Docker host — traefik, openclaw |
| WHM/cPanel | mi3-sr116.supercp.com | Site deployment server |
| Domain | ghostclaw.cloud | System domain |

## Rules

See `AGENT_INSTRUCTIONS.md` for execution rules.
See `data/DATA_INDEX.txt` for the canonical system definition.
See `config/blueprint-rules.json` for enforcement rules.
See `config/SITE_CONFIG.template.json` for site configuration schema.
