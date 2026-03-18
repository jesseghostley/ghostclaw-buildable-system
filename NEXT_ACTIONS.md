# NEXT_ACTIONS.md — What Ships Next

## Immediate (pre-demo)

### 1. SQLite Mode Activation Toggle
- **File:** `apps/api/src/app.ts`
- **What:** Read `STORAGE_MODE` env var, call `createStores()`, inject into runtime loop + executor
- **Why:** SQLite stores exist and are tested. They just aren't wired into the running server.
- **Size:** Small. One file change.

### 2. Operator Approval Dashboard
- **Owner:** Frontend / OpenClaw / MaxClaw
- **Endpoints already live:**
  - `GET /api/approvals/pending`
  - `POST /api/approvals/:id/approve` (body: `{ approvedBy }`)
  - `POST /api/approvals/:id/reject` (body: `{ rejectedBy, reason }`)
  - `POST /api/approvals/:id/publish` (body: `{ externalUrl }`)
- **What:** Simple UI that lists pending, shows artifact content, has Approve/Reject buttons.

### 3. CMS Publish Target
- **Owner:** Manus / deploy team
- **What:** Real endpoint that receives the published artifact and deploys a contractor website.
- **Contract:** `POST /api/approvals/:id/publish` sets `externalUrl` in the response. The CMS adapter goes there.

## Next Build Cycle

### 4. Runtime Store Injection
- **What:** Replace global singleton stores (`jobQueue`, `skillInvocationStore`, etc.) with injected stores from `createStores()`.
- **Why:** Lets the same codebase run memory mode in tests and SQLite mode in production without import-time side effects.

### 5. Skill Registry Persistence
- **What:** Save/load skill definitions to/from SQLite so skills survive restarts.
- **Note:** Handlers are functions — only metadata persists. Handlers reload from `packages/skills/src/` on startup.

### 6. Second Blueprint
- **What:** Pick the next workflow (e.g., content cluster generation) and define it as a blueprint.
- **Constraint:** Must use the same skill registry + executor path. No new execution model.
