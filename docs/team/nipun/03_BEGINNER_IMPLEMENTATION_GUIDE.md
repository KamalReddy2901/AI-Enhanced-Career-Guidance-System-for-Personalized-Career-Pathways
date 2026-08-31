# Nipun — Beginner Step-by-Step Implementation Guide

## 0. Complete the shared preflight first

Before editing, complete `../shared/AI_ASSISTED_IMPLEMENTATION_WORKFLOW.md`, the Windows/environment checkpoint in `../shared/GIT_BRANCH_COMMIT_PR_REVIEW_GUIDE.md`, and read `../shared/BLOCKED_TROUBLESHOOTING_AND_EVIDENCE.md`. Production credentials and SIS/ERP/policy connector configuration remain with Kamal; use labeled controlled fixtures where approved.

## 1. Prepare

```bash
git fetch origin
git switch integration/sih26044-product-v0.2
git pull --ff-only origin integration/sih26044-product-v0.2
git switch -c feature/nipun/faculty-institution-pr1
npm ci
npm run typecheck
```

Checkpoint: `node -v` is `v22.16.0`, Git shows `feature/nipun/faculty-institution-pr1`, baseline typecheck passes, and the AI inspection report distinguishes implemented, controlled prototype, integration-ready and target-only fields.

## 2. Inspect topology

Read opportunity, collaboration, analytics, outcome and identity contracts plus RLS, demo runtime and faculty/institution plan sections. Mark each desired field as implemented, controlled prototype, integration-ready or target only. Do not turn target fields into fake live data.

## 3. Build faculty lifecycle

Create Nipun-owned faculty components. Start with discovery/detail, then expression of interest/application, engagement milestones/deliverables and outcomes supported by contract. Test at least two different types so they visibly do not share a fake identical workflow.

Commit: `feat(faculty): add collaboration opportunity lifecycle`

## 4. Build institution dashboard

Use authorized aggregate data or labeled fixtures. For every metric show title, definition/context, denominator, freshness and suppression/limitation. Add empty and insufficient-data states before adding decorative charts.

Commit: `feat(institution): add privacy-safe skills intelligence`

## 5. Build intervention loop

Create action cards connected to a visible aggregate signal. Add rationale, cohort, owner, state, review date and outcome when supported. Make approval/state change explicitly human. Never promise causation.

Commit: `feat(institution): connect signals to interventions`

## 6. Verify

Preview two faculty types, engagement status, dashboard, one intervention and small-cohort suppression. Check keyboard/mobile and membership denial.

```bash
npm run typecheck
npm run qa:sih-boundary
npm run qa:demo-isolation
npm run qa:demo-flow
npm run qa:opportunity-readiness
npm run qa:evidence-integrity
npm run build
```

## 7. Draft PR

Target integration. Include faculty lifecycle, dashboard/context and suppression/intervention screenshots; exact tests; fixture disclosure; and a list of any target-only fields deliberately not represented as live.

Success means a reviewer can complete distinct faculty collaboration lifecycles and trace a privacy-safe aggregate signal to a human-owned intervention with denominator, freshness and suppression visible. Push review corrections to the same Draft PR. Never self-merge. If blocked, send Kamal the shared evidence package.
