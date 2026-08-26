# Laya PR1 — Student Opportunity Explorer + Readiness Casefile

## Outcome

Deliver a student journey that discovers versioned opportunities, opens a truthful detail view, and explains the canonical readiness casefile requirement by requirement. This is not a generic job-board match page.

Branch: `feature/laya/student-explorer-readiness-pr1`

## In scope

- Opportunity explorer with search and explicit filters for opportunity type, location/mode, sector, dates and eligibility-relevant fields supported by current contracts.
- Opportunity cards that show source/status/version and avoid an opaque single “match” score.
- Opportunity detail with requirements, eligibility, logistics, provenance/source and last-version context.
- Readiness casefile showing canonical band, eligibility result, requirement states, evidence coverage, preferred requirements, experience/work samples, logistics, learning/evidence distance and explanations.
- Clear distinction among `UNKNOWN`, evidence gap, capability gap, eligibility gap and logistics gap.
- Links to Manvil's evidence workflow and Madhu's gap/application workflow using identifiers, not duplicated state.
- Loading, empty, error, unavailable-readiness, stale-version and unauthorized states.

## Out of scope

Gap-plan execution, application drafting/submission, evidence upload/verification, recruiter actions, opportunity authoring, faculty/institution views, new scoring logic, and live external connectors.

## Milestones

### L1 — Inspect and map contracts

Read `opportunity.ts`, `readiness.ts`, Engine B output types, SIH DAL/client boundaries, demo types/fixtures/reducer, existing demo readiness components and current routes. Produce a short PR note mapping every displayed field to its canonical source. Do not code around a missing field.

### L2 — Explorer vertical slice

Create role-owned explorer components. Render controlled opportunities from the existing runtime source, add semantic search/filter controls, preserve zero-result state, and make each card deep-linkable. Filters must not infer eligibility or silently hide opportunities based on readiness.

Acceptance: a student can find and open an opportunity; filters are reversible and keyboard usable; synthetic/controlled data is disclosed.

### L3 — Opportunity detail

Display shared fields and typed requirement groups, including literal unresolved requirements. Show opportunity version/status and warn when the viewed readiness result belongs to another version. Provide actions to view readiness or save/continue only if the underlying contract supports them.

Acceptance: no invented employer claims, deadlines or connector status; eligibility wording remains separate from readiness.

### L4 — Readiness casefile

Consume the canonical readiness result. Present the readiness band plus the explanatory vector and requirement-evidence matrix. Each requirement must show state, supporting evidence references/provenance, missing/unknown reason and appropriate next route. Never calculate readiness in the component.

Acceptance: Priya's flagship evidence change can visibly move `BUILDING EVIDENCE → NEAR READY → READY FOR REVIEW` only through canonical state updates; no “85% match” framing.

### L5 — State and accessibility hardening

Add skeleton/loading behavior, no opportunities, no readiness result, stale result, computation failure, permission denied and narrow-screen layouts. Check focus order, headings, labels, non-color status cues and reduced motion.

### L6 — Verification and PR

Run typecheck/build plus `qa:opportunity-readiness`, `qa:demo-flow`, `qa:demo-isolation` and `qa:sih-boundary`. Record actual results. Attach desktop/mobile screenshots for explorer, casefile and an `UNKNOWN` state.

## Expected files

Prefer new files under `src/app/components/sih/student/explorer/` and `readiness/`. Shared route/runtime edits require a small approved integration patch. Do not edit domain, engine, Worker, migrations, recruiter projection or Madhu's components.

## Dependencies and handoffs

- Input: canonical Opportunity/Readiness types and existing controlled runtime.
- To Madhu: `opportunityId`, opportunity version ID and readiness result identity for plan/application navigation.
- To Manvil: evidence IDs and requirement context for “view/add evidence”; Manvil owns the ledger workflow.
- Failure mode: stale opportunity/readiness versions. Block submission-oriented CTA and explain recomputation; do not silently reuse stale readiness.

## PR acceptance

The PR is acceptable when the explorer and casefile form a working deep-linked student journey, all displayed conclusions trace to canonical data, unknown and gap states are distinct, and no private guidance or hiring prediction is present.
