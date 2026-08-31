# Manvil PR1 — Evidence Ledger + Real Verifier Workflow

## Outcome

Deliver an auditable student evidence ledger and a real role-scoped verifier workflow in which requests and events are persisted through authorized contracts. Verification is contextual—not universal certification.

Branch: `feature/manvil/evidence-verifier-pr1`

## In scope

- Evidence ledger grouped/filterable by capability, provenance, verification state and validity/context.
- Evidence detail with source, artifact linkage, derivation lineage, verification history and where it is used.
- Weak evidence proposal, private artifact upload/registration and artifact-backed derivation through existing authorized paths.
- Verification request creation and verifier inbox/detail.
- Human actions supported by contract: accept/attest, request clarification, decline/dispute/correct as available, each scoped and append-only.
- Actor/authority/scope/time visibility and clear pending/expired/revoked states.
- No mutation of original provenance or inherited verification.

## Out of scope

Universal skill certification, automated verification, malware-scanner claims, issuer integration, new readiness scoring, recruiter application review and opportunity authoring.

## Milestones

### V1 — Inspect evidence trust model

Read `evidence.ts`, collaboration/identity contracts, browser DAL, trusted client artifact methods, storage migration/tests, demo evidence projection, timeline/matrix components and integrity QA. Map each UI action to RLS or trusted authority before implementation.

### V2 — Student evidence ledger

Render canonical evidence records without collapsing provenance and verification into one badge. Add filter/search, empty state, evidence detail, contextual usage and append-only history. Literal unresolved capability language stays visible.

Acceptance: a reviewer can distinguish self-declared, extracted, assessed, artifact-backed, human-attested and issuer-verified evidence, plus separate verification state.

### V3 — Artifact-backed evidence path

Support private upload using the prescribed actor/artifact path, trusted registration after server-side hashing/scan-status handling, and creation of a new derived artifact-backed evidence record. Only `clean` artifacts may contribute as allowed by current Engine B policy. Do not imply a live scanner when status is `not_scanned`.

### V4 — Verification request and inbox

Let a student request verification for a defined evidence item, capability/claim and context. Build verifier inbox states and detail view with requester, evidence, artifact access where authorized, requested scope and conflict/expiry information.

### V5 — Append-only human decision

Append verification events via authorized DAL. Require the verifier to see and affirm scope; capture rationale/feedback as contract permits. Show full event history. Corrections create new events/records rather than rewriting history.

Acceptance: the flagship journey can move from artifact-backed evidence to scoped human-attested evidence without mutating the original record or silently transferring verification.

### V6 — Verification and PR

Run typecheck/build plus `qa:evidence-integrity`, `qa:opportunity-readiness`, `qa:sih-boundary`, `qa:sih-persistence-schema`, `qa:foundation-freeze-hardening`, and storage/API integration tests if environment prerequisites exist. Record skipped external prerequisites truthfully. Attach student and verifier views plus an unauthorized/expired case.

## Expected files

Prefer `src/app/components/sih/evidence/` and `verification/`. Shared route/runtime wiring needs approval. Do not modify frozen migrations, Engine B, artifact trust rules, or other owners' components.

## Dependencies and handoffs

- To Laya/Madhu: stable deep links using evidence ID and requirement context.
- To Nipun: faculty acting as verifier is one scoped role; faculty opportunity lifecycle remains Nipun's.
- Failure modes: unauthorized verifier, missing consent, inaccessible artifact, duplicate/idempotent event, `not_scanned` artifact, expired request. Fail closed and explain next action.

## PR acceptance

Accept only if the workflow uses real controlled persistence paths where configured, maintains append-only provenance and decisions, makes verifier authority/context visible, and never describes verification as universal mastery.
