# Manvil — Beginner Step-by-Step Implementation Guide

## 0. Complete the shared preflight first

Before editing, complete `../shared/AI_ASSISTED_IMPLEMENTATION_WORKFLOW.md`, the Windows/environment checkpoint in `../shared/GIT_BRANCH_COMMIT_PR_REVIEW_GUIDE.md`, and read `../shared/BLOCKED_TROUBLESHOOTING_AND_EVIDENCE.md`. Production credentials, storage administration and security-service configuration remain with Kamal; never place them in an AI prompt.

## 1. Prepare

```bash
git fetch origin
git switch integration/sih26044-product-v0.2
git pull --ff-only origin integration/sih26044-product-v0.2
git switch -c feature/manvil/evidence-verifier-pr1
npm ci
npm run typecheck
```

Checkpoint: `node -v` is `v22.16.0`, Git shows `feature/manvil/evidence-verifier-pr1`, baseline typecheck passes, and the AI inspection report maps every action to RLS-direct, trusted Worker or read-only authority.

## 2. Map every action to authority

Read evidence/identity/collaboration types, browser DAL, trusted artifact methods, storage/RLS migrations and evidence QA. Write down whether each action is RLS-direct, trusted Worker, or read-only. Do not let AI invent an endpoint.

## 3. Build the ledger

Create Manvil-owned components. Render canonical records and separate badges for provenance and verification. Add filters and evidence detail with lineage/history/context. Test weak, artifact-backed and human-attested examples.

Commit: `feat(evidence): add auditable evidence ledger`

## 4. Build artifact path

Use the prescribed private upload path and trusted registration/derivation methods. Show upload, hashing/registration, scan status and derivation as distinct states. If no scanner is configured, show `not scanned`; never fake `clean`.

Commit: `feat(evidence): add artifact-backed derivation flow`

## 5. Build verifier workflow

Create request action, verifier inbox and request detail. Display requested scope and authority. Append decisions/events through the DAL and refresh from canonical state. Test unauthorized, expired, clarification and accepted paths.

Commit: `feat(verification): add scoped verifier workflow`

## 6. Verify

Use separate controlled student/verifier roles when available. Confirm the original record never changes provenance and the history remains visible.

```bash
npm run typecheck
npm run qa:evidence-integrity
npm run qa:opportunity-readiness
npm run qa:sih-boundary
npm run qa:sih-persistence-schema
npm run qa:foundation-freeze-hardening
npm run build
```

Run storage/API integration only when documented environment prerequisites exist; report a skip, never fabricate a pass.

## 7. Draft PR

Target integration. Include ledger, verifier detail and denied/expired screenshots; exact test output; authority map; and explicit statements about scanner/issuer/integration status.

Success means a reviewer can distinguish provenance from verification, trace append-only lineage/events, and complete or safely deny a scoped verifier action without any universal-certification claim. Push review corrections to the same Draft PR. Never self-merge. If blocked, send Kamal the shared evidence package.
