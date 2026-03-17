# DEMO_CHECKLIST.md — GhostClaw V1 Demo Readiness

## Backend (all passing)

- [x] `POST /api/signals` — send `contractor_website_requested` signal
- [x] Runtime creates 3 jobs: design_site_structure → generate_page_content → review_and_approve
- [x] Job output forwarding: step 1 output feeds step 2, step 2 output feeds step 3
- [x] All 3 jobs resolved via skill registry (tagged `resolvedVia: skill_registry`)
- [x] QA review validates forwarded content (pageCount, contentReceived, passed)
- [x] Approval gate creates pending PublishEvent after step 3
- [x] `GET /api/approvals/pending` — returns pending approvals
- [x] `POST /api/approvals/:id/approve` — operator approves
- [x] `POST /api/approvals/:id/publish` — publishes with externalUrl
- [x] `POST /api/approvals/:id/reject` — operator rejects with reason
- [x] Audit log records every stage (signal, plan, job, skill, approval, publish)
- [x] `GET /api/blueprints` — returns contractor website factory blueprint
- [x] `GET /api/workspaces` — returns default workspace with agents + blueprint
- [x] 414 tests pass

## Frontend (not started)

- [ ] Approval dashboard UI calling the 4 approval endpoints above
- [ ] Signal trigger form (businessName, trade, location, phone, email)
- [ ] Artifact viewer showing step outputs
- [ ] Audit trail viewer

## Infrastructure (not started)

- [ ] SQLite mode toggle via `STORAGE_MODE=sqlite` env var
- [ ] CMS publish adapter behind `/api/approvals/:id/publish`
- [ ] Production deploy target

## Demo Script

1. Operator fills in: business name, trade, location
2. System sends `contractor_website_requested` signal
3. 3 jobs execute in sequence with output forwarding
4. QA review creates pending approval
5. Operator reviews artifacts, clicks Approve
6. System publishes to CMS, returns externalUrl
7. Audit log shows full chain: signal → plan → 3 jobs → 3 skills → 3 artifacts → approval → publish
