# Harsh PR1 — Opportunity Authoring + Recruiter Applicant Workspace

## Outcome

Deliver an industry workflow to author a versioned opportunity with conservative requirements and conduct consent-limited human application review. It must not become an opaque ATS or ranking engine.

Branch: `feature/harsh/opportunity-authoring-recruiter-pr1`

## In scope

- Draft opportunity authoring for shared fields, opportunity-type-specific fields, eligibility, logistics, requirements, preferred requirements, evidence expectations and employer questionnaires.
- Explicit draft/review/publish/version states supported by current contracts or controlled runtime.
- Conservative skill resolution UI: canonical match, needs human confirmation or unresolved literal.
- Optional AI-assisted extraction/structuring preview with human confirmation and replay/offline fallback; never silent publication.
- Recruiter workspace listing applications for owned opportunities with workflow-state filters, not candidate rank.
- Applicant detail based only on authorized immutable application snapshot and allowlisted recruiter projection.
- Human stage actions and notes/events supported by contract, with auditability and consent-withdrawal handling.

## Out of scope

Automatic eligibility/rejection/shortlist, candidate scoring/ranking, private guidance data, broad talent search, external ATS/API claims, institution/faculty workflows and changes to canonical projection/authority without approval.

## Milestones

### H1 — Inspect contracts and human boundary

Read opportunity/skill-resolution/application/consent contracts, eligibility/readiness policies, browser DAL, production recruiter projection, demo runtime and relevant migrations/RLS. Map every authoring and recruiter action to its authority and owner.

### H2 — Structured authoring

Build a multi-section draft form using existing fields. Requirements must capture importance, evidence policy, resolution status and literal source text. Validate dates, locations, capacity and required fields without inventing unsupported data.

### H3 — Assistive normalization and publication review

If using controlled AI/replay extraction, show source text beside suggestions, confidence/ambiguity and a human accept/edit/reject action. Unresolved high-stakes language remains literal. Publication is an explicit human action; AI never decides eligibility rules or readiness bands.

Acceptance: an author can create/review a complete controlled opportunity version and see exactly what was normalized.

### H4 — Recruiter application workspace

List applications by process stage/date using owned opportunity access. Do not sort by readiness as a candidate ranking. Applicant detail must use the immutable snapshot and recruiter-safe projection; show readiness explanation as decision support, not hiring probability.

### H5 — Human recruitment actions

Implement supported stage events such as review, shortlist/interview/offer/reject only as explicit attributable human choices. Require reason/notes where contract supports them, show history, and handle withdrawn consent by immediately blocking applicant detail access.

Acceptance: the recruiter can review and record a human decision, while the UI preserves audit and never auto-rejects.

### H6 — Verification and PR

Run typecheck/build plus `qa:recruiter-projection`, `qa:opportunity-readiness`, `qa:sih-boundary`, `qa:demo-flow`, `qa:evidence-integrity` and persistence QA if service usage changes. Attach authoring resolution review, applicant detail, and consent-withdrawn/unauthorized states.

## Expected files

Prefer `src/app/components/sih/industry/` and `recruiter/`. Shared route/runtime changes need approval. Do not edit Engine B, production projection allowlist, migrations, Laya/Madhu student components or Manvil's verification workflow.

## Dependencies and handoffs

- To Laya: published/versioned opportunity identifiers and requirements.
- From Madhu: immutable consent-minimized snapshot/events.
- From Manvil: evidence/verification details only within the snapshot and active purpose.
- Failure modes: unresolved requirements, stale opportunity version, applicant consent withdrawn, recruiter lacks organization membership, snapshot unavailable. Fail closed and disclose why.

## PR acceptance

Accept only if opportunity creation is human-confirmed/versioned, applicant access is ownership- and consent-bound, and all recruitment outcomes are explicit human events without ranking or hidden automation.
