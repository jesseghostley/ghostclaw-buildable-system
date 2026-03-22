# Blueprint: Contractor Website Factory

## Purpose
Generates a complete contractor/tradesperson website from a single signal containing business details. Produces site structure, page content, and QA review — with an operator approval gate before publishing.

## Trigger
Signal: `contractor_website_requested`

## Inputs
- `businessName` — Company name (e.g., "Apex Roofing Co")
- `trade` — Type of work (e.g., "roofing", "plumbing", "electrical")
- `location` — Service area (e.g., "Denver, CO")
- `phone` — Contact phone number
- `email` — Contact email

## Outputs
- Site structure artifact (pages, sections, layout)
- Page content artifact (copy for home, services, contact)
- QA report artifact (validation checklist + approval status)
- Pending PublishEvent to `website_cms` (requires operator approval)

## Workspace
`default` (V1 single workspace)

## Primary Agent
SiteArchitectAgent — designs the overall site structure

## Supporting Agents
- PageContentAgent — generates page copy from site structure and business details
- QAReviewAgent — validates completeness, quality, SEO readiness; triggers approval gate

## Skills Needed
- `design_site_structure` — produces page list, section layout, navigation
- `generate_page_content` — produces title, hero, descriptions, CTAs per page
- `review_and_approve` — runs quality checklist, flags for operator review

## Memory to Store
- Site structure per business (reusable for updates)
- Generated content (versioned for comparison)
- QA results (audit trail)

## Policies / Approval Gates
- **Publish policy**: All completed websites require operator approval before going live
- PublishEvent created with status `pending` and destination `website_cms`
- Operator must explicitly approve → `approved` → `published`

## Queue Type
Sequential — design_site_structure → generate_page_content → review_and_approve

## Audit Events
- `signal.received` — contractor_website_requested signal logged
- `plan.created` — build_contractor_website plan logged
- `job.completed` × 3 — one per skill execution
- `skill_invocation.started` × 3
- `skill_invocation.completed` × 3
- `artifact.created` × 3
- `publish_event.initiated` — approval gate activated
- `publish_event.approved` — operator approves (when it happens)
- `publish_event.published` — site goes live (when it happens)

## Step-by-Step Workflow
1. Signal `contractor_website_requested` arrives with business payload
2. Planner routes to `build_contractor_website` action via `rule_contractor_website_strategy`
3. Runtime creates 3 jobs: design_site_structure, generate_page_content, review_and_approve
4. Jobs queued and executed sequentially
5. SiteArchitectAgent runs `design_site_structure` — produces page/section structure
6. PageContentAgent runs `generate_page_content` — produces per-page copy
7. QAReviewAgent runs `review_and_approve` — validates and flags for approval
8. PublishEvent created with status `pending` to `website_cms`
9. Operator reviews and approves/rejects
10. If approved, site published to CMS

## Success Criteria
- All 3 jobs complete without failure
- 3 artifacts produced with valid content
- QA report shows `passed: true`
- PublishEvent exists in `pending` state awaiting operator
- All audit log entries present for full traceability
- 10/10 integration tests pass

## What Belongs in V1
- All of the above — this IS the V1 proof-of-concept
- Single workspace, in-memory execution
- Operator approval via direct API/store call

## What Belongs in V1.1
- Real CMS integration (WordPress, Webflow, etc.)
- Content passed between jobs (site structure feeds into page content)
- Approval UI in dashboard
- Template variations per trade type
- SEO optimization pass as 4th job
- Image/gallery generation
- Memory persistence across sessions (SQLite mode)

## Notes
- This blueprint is the first end-to-end proof that the GhostClaw runtime works: signal → plan → jobs → agents → skills → artifacts → approval → audit
- Strategy: `rule_contractor_website_strategy`
- Planner action: `build_contractor_website`
- Test file: `__tests__/contractor_website_factory.test.ts`
