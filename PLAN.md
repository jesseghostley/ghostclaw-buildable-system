# GhostClaw V1 — Production Hardening Patch Set

## Scope

Four changes. No new frameworks, no redesign, contractor website factory only.

---

## 1. FILES TO MODIFY

| # | File | What Changes |
|---|------|-------------|
| M1 | `packages/core/src/job_executor.ts` | Guard duplicate PublishEvent creation |
| M2 | `packages/core/src/store_provider.ts` | Hydrate `runtimeStore` from SQLite on startup |
| M3 | `packages/core/src/runtime_loop.ts` | Export `hydrateRuntimeStore()` helper |
| M4 | `packages/skills/src/generate_page_content.ts` | Add copy variation pools keyed by trade |
| M5 | `packages/skills/src/design_site_structure.ts` | Add section variation for same-trade diversity |
| M6 | `apps/api/src/routes/batches.ts` | Wire batch export endpoint (CSV + manifest + archives) |
| M7 | `apps/api/src/app.ts` | Mount new `/api/batches/:id/export` route (already in batches router, no new mount needed) |

## 2. FILES TO ADD

| # | File | Purpose |
|---|------|---------|
| A1 | `packages/core/src/copy_variation.ts` | Trade-keyed copy variation pools (heroes, CTAs, descriptions) with deterministic selection by businessName hash |
| A2 | `packages/core/src/batch_export.ts` | Batch export layer: domain-named `.tar.gz` archives, handoff CSV, batch manifest JSON |
| A3 | `__tests__/copy_variation.test.ts` | Tests for copy variation determinism and pool coverage |
| A4 | `__tests__/batch_export.test.ts` | Tests for CSV/manifest/archive export |
| A5 | `__tests__/hydration.test.ts` | Tests for SQLite → runtimeStore hydration on startup |

---

## 3. WHAT EACH CHANGE DOES

### Item 1 — Guard Duplicate PublishEvent Creation

**Problem:** In `job_executor.ts:172-182`, a PublishEvent is created inside the job execution loop. When a batch processes multiple sites that share artifacts or when the executor retries, the same artifactId can get multiple PublishEvents. The `batches.ts` route (line 42-59) uses a before/after snapshot of `publishEventStore.listAll()` to capture new events, which means any stray PublishEvent from a concurrent or re-entrant call leaks into the wrong site's `publishEventIds`.

**Fix (M1 — `job_executor.ts`):**
- Before creating a PublishEvent at line 174, check `publishEventStore.listByArtifactId(artifactId)` — if a pending/approved event already exists for this artifact, skip creation.
- This is an idempotency guard, not a logic change.

```typescript
// Before line 172:
const existingPubEvents = publishEventStore.listByArtifactId(artifactId);
const alreadyHasPending = existingPubEvents.some(
  (pe) => pe.status === 'pending' || pe.status === 'approved'
);

if (qaReport?.requiresApproval && !alreadyHasPending) {
  // ... existing create + emit logic ...
}
```

### Item 2 — Hydrate runtimeStore from SQLite on Startup

**Problem:** `runtimeStore` (runtime_loop.ts:101-108) starts as empty arrays every boot. In SQLite mode, data is on disk but never loaded. The `site_generator.ts:42` function `findArtifactsByType()` reads from `runtimeStore.artifacts`, so after restart no sites can be generated from prior artifacts.

**Fix (M3 — `runtime_loop.ts`):**
- Export a `hydrateRuntimeStore(stores: StoreBundle)` function that populates the arrays from the store's `listAll()` methods.

**Fix (M2 — `store_provider.ts`):**
- After `_stores = createStores(resolvedConfig)` and after singleton replacement, call `hydrateRuntimeStore(_stores)`.
- Only hydrate in sqlite mode (memory mode starts fresh by definition).

```typescript
// In store_provider.ts, after line 69:
if (resolvedConfig.mode === 'sqlite') {
  const { hydrateRuntimeStore } = require('./runtime_loop');
  hydrateRuntimeStore(_stores);
}
```

**`hydrateRuntimeStore` implementation (in runtime_loop.ts):**
```typescript
export function hydrateRuntimeStore(stores: StoreBundle): void {
  const signals = stores.signalStore.listAll();
  const plans = stores.planStore.listAll();
  const jobs = stores.jobStore.listAll();
  const artifacts = stores.artifactStore.listAll();
  const invocations = stores.skillInvocationStore.listAll();
  const assignments = stores.assignmentStore.listAll();

  runtimeStore.signals.push(...signals);
  runtimeStore.plans.push(...plans);
  runtimeStore.jobs.push(...jobs);
  runtimeStore.artifacts.push(...artifacts);
  runtimeStore.skillInvocations.push(...invocations);
  runtimeStore.assignments.push(...assignments);

  console.log(
    `[GhostClaw] Hydrated runtimeStore: ${signals.length} signals, ${plans.length} plans, ` +
    `${jobs.length} jobs, ${artifacts.length} artifacts, ${invocations.length} invocations, ` +
    `${assignments.length} assignments.`
  );
}
```

### Item 3 — Copy Variation for Same-Trade Sites

**Problem:** When a batch of 10 roofers is submitted, every site gets identical hero text, CTA, and service descriptions. Google flags this as duplicate content; clients notice.

**Fix (A1 — `copy_variation.ts`):**
- Define trade-keyed variation pools: arrays of hero lines, CTAs, and service descriptions for common trades (roofing, plumbing, electrical, HVAC, painting, general).
- A `pickVariant(pool, businessName)` function uses a simple string hash of businessName to deterministically select a variant. Same business always gets the same copy; different businesses get different copy.
- Fallback: if trade is unknown, use the `general` pool.

**Fix (M4 — `generate_page_content.ts`):**
- Import `pickVariant` and trade pools from `copy_variation.ts`.
- Replace hardcoded hero, CTA, and service description strings with `pickVariant()` calls.
- The template structure stays identical — only the interpolated strings change.

**Fix (M5 — `design_site_structure.ts`):**
- Import section variation from `copy_variation.ts`.
- Add 2-3 section layout variants per trade (e.g., some roofers get "emergency_services" section, others get "seasonal_maintenance").
- Selection via same `pickVariant` mechanism.

### Item 4 — Batch Export Layer

**Problem:** After a batch is approved and published, there is no way to hand off the deliverables. The existing `/api/approvals/:id/export` exports one site at a time by publishEventId. There is no batch-level export, no CSV for the client handoff meeting, no manifest for automation.

**Fix (A2 — `batch_export.ts`):**

Three export artifacts per batch:

1. **Domain-named site archives** — For each published site in the batch, copy/rename the existing `.tar.gz` from `output/sites/{publishEventId}/` to `{batchId}/archives/{domain-slug}.tar.gz`. Domain slug = `slugify(businessName)`.

2. **Batch handoff CSV** — Columns: `index, businessName, trade, location, status, domain, publishEventId, exportedAt`. One row per site. Written to `{batchId}/handoff.csv`.

3. **Batch manifest JSON** — Full batch metadata: batchId, createdAt, exportedAt, site count, per-site details (businessName, trade, location, status, publishEventId, archivePath, domain). Written to `{batchId}/manifest.json`.

**Fix (M6 — `batches.ts`):**
- Add `GET /api/batches/:id/export` endpoint.
- Calls `exportBatch(batchId)` from `batch_export.ts`.
- Returns the manifest JSON in the response body.
- Sets `Content-Type: application/json`.
- The archives + CSV + manifest are written to `output/batches/{batchId}/`.

**Fix (M7 — `app.ts`):**
- No new mount needed — the batches router already handles `/api/batches/*`.
- Add static serving for `output/batches/` alongside existing `output/sites/`.

---

## 4. IMPLEMENTATION ORDER

```
Step 1: A1  copy_variation.ts         (no dependencies)
Step 2: M4  generate_page_content.ts  (depends on A1)
Step 3: M5  design_site_structure.ts  (depends on A1)
Step 4: M1  job_executor.ts           (no dependencies)
Step 5: M3  runtime_loop.ts           (no dependencies)
Step 6: M2  store_provider.ts         (depends on M3)
Step 7: A2  batch_export.ts           (no dependencies)
Step 8: M6  batches.ts                (depends on A2)
Step 9: M7  app.ts                    (depends on M6)
Step 10: A3 copy_variation.test.ts    (depends on A1)
Step 11: A4 batch_export.test.ts      (depends on A2)
Step 12: A5 hydration.test.ts         (depends on M2, M3)
```

Steps 1-3 can run in parallel with Steps 4-6 and Step 7-9.

---

## 5. TESTS TO ADD

### A3 — `__tests__/copy_variation.test.ts`
- **Determinism**: Same businessName + trade always returns same variant
- **Diversity**: Two different businessNames with same trade return different variants (with high probability for pools of 4+)
- **Fallback**: Unknown trade falls back to `general` pool
- **Pool coverage**: Every trade has hero, CTA, and description pools with at least 4 entries each
- **No empty strings**: Every pool entry is a non-empty string

### A4 — `__tests__/batch_export.test.ts`
- **CSV format**: Header row matches expected columns; data rows match site count
- **CSV escaping**: Business names with commas/quotes are properly escaped
- **Manifest structure**: JSON has required fields (batchId, createdAt, exportedAt, sites array)
- **Manifest site entries**: Each site has businessName, trade, location, status, archivePath
- **Archive naming**: Archives are named `{slugified-businessName}.tar.gz`
- **Empty batch**: Export of batch with 0 published sites returns empty but valid CSV + manifest
- **Mixed status**: Only published sites get archives; failed/pending sites appear in CSV with no archivePath

### A5 — `__tests__/hydration.test.ts`
- **Hydrates from SQLite**: After `initializeStores({mode:'sqlite'})`, runtimeStore arrays contain records that were previously written via stores
- **Empty DB hydrates empty**: Fresh SQLite DB produces empty runtimeStore arrays
- **Memory mode skips hydration**: In memory mode, runtimeStore starts empty (no hydration call)
- **Idempotent**: Calling `hydrateRuntimeStore` twice doesn't duplicate records (clear before hydrate)

### Existing test updates
- **`__tests__/contractor_website_factory.test.ts`**: Add assertion that two sites with different businessNames in the same trade produce different hero text
- **`__tests__/publish_event.test.ts`**: Add assertion that duplicate PublishEvent creation is guarded (same artifactId doesn't get two pending events)

---

## 6. WHAT REMAINS UNCHANGED

- **Runtime loop** (`processSignal` flow): Signal → Plan → Jobs → Artifacts chain is untouched
- **Event bus**: No new event types added
- **Blueprint definition**: `contractor_website_factory.ts` blueprint metadata unchanged
- **Agent registry**: No new agents
- **Skill registry**: No new skills (existing skills get better copy, not new skills)
- **Planner/router**: Signal routing and strategy selection unchanged
- **Approval flow**: approve/reject/publish endpoints in `approvals.ts` unchanged
- **Site generator**: `site_generator.ts` template rendering unchanged (it reads from runtimeStore which is now hydrated)
- **SQLite schema**: No table changes — all existing CREATE TABLE statements unchanged
- **Storage interfaces**: No interface changes to any `I*Store`
- **Storage implementations**: No changes to any SQLite or InMemory store class
- **Ghost Mart**: Package system unchanged
- **Workspace/Policy**: Deferred, unchanged
- **Dashboard**: Unchanged (stub)
- **All existing tests**: No existing test should break
