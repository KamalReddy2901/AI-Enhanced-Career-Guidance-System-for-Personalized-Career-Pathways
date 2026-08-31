# AI-Assisted Implementation Workflow

Use AI as an implementation assistant, not as the architecture owner.

Complete this workflow before editing product files. The first checkpoint is an inspection report, not generated code.

## Step 1 — Give the AI the right context

Start a fresh task and provide, in this order:

1. `docs/team/shared/TEAM_OPERATING_RULES.md`.
2. `docs/team/shared/SHARED_CONTRACT_AND_FILE_OWNERSHIP.md`.
3. Your three personal pack documents.
4. `docs/sih26044-foundation-architecture.md` and `docs/sih26044-teammate-boundaries.md`.
5. Only the current source files named in your task plan.

Tell the AI: “Inspect first. Propose the smallest compliant vertical slice. Do not edit shared contracts, Engine B, migrations, Worker authority, or another owner's files without explicit approval.”

Never give an AI production credentials, `.env` contents, real applicant evidence, private screenshots or access to Kamal's Supabase/Cloudflare dashboards. Use only repository code, approved documentation and synthetic fixtures.

## Step 2 — Require an inspection report

Before code changes, require the AI to identify existing reusable types/components, files it expects to touch, data source (real controlled persistence versus demo fixture), privacy boundary, tests to run, and any missing contract. Reject a plan that invents duplicate types or a second readiness calculation.

Checkpoint: save the inspection report in your working notes. If it proposes a protected/shared file, stop and send Kamal the shared-change request before any edit.

## Step 3 — Build one vertical slice at a time

For each slice:

1. Add or update the route shell.
2. Connect typed existing data.
3. Implement the primary action.
4. Add loading, empty, error and unauthorized states.
5. Verify consent/provenance/human-decision boundaries.
6. Preview locally at desktop and mobile widths.
7. Run typecheck and relevant QA.
8. Commit only that coherent slice.

## Step 4 — Challenge AI output

Ask the AI to search its diff for: fake integrations, private guidance leakage, `UNKNOWN` shown as failure, readiness percentages framed as match probability, automatic ranking/rejection, direct trusted-table writes, mutable verification/evidence history, hard-coded happy paths, inaccessible controls, and invented claims.

Do not accept “tests should pass.” Require actual command output and manual preview notes.

## Step 5 — Keep the human in control

The teammate reviews every changed line, owns the PR description and verifies the UI. Kamal approves shared-contract or architecture changes and performs final integration review. AI output is not evidence that a feature works.

## Safe prompt template

```text
Implement only Milestone <n> from my CareerCase SIH26044 task pack.
First inspect the named current files and report reuse, edits, risks and tests.
Preserve every shared invariant and file-ownership boundary.
Do not modify Engine B, frozen migrations, trusted authority, shared domain contracts,
or other owners' files. Do not claim unavailable integrations are live.
After implementation, run the required checks and give me a manual preview checklist.
Stop if a shared contract must change.
```
