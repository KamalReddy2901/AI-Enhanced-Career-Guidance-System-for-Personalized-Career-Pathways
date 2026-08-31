# Shared Route Registry

This registry records integration requests without making a route contract real before its component exists. `src/app/routes.ts` remains integration-owned; feature branches should expose components and record navigation inputs, then Kamal reconciles the shared file.

| Owner | Feature | Requested route | Page/component export | Status | Shared-file dependency | Integration notes |
|---|---|---|---|---|---|---|
| Laya | Opportunity explorer | `/student/opportunities` | `OpportunityExplorer` from `src/app/components/sih/student/explorer/OpportunityExplorer.tsx` | Component exists on remote feature branch; route not wired | `src/app/routes.ts`; production/runtime data adapter still required | Component currently accepts canonical `Opportunity[]`, `OpportunityVersion[]`, and an `opportunityId` selection callback. Do not wire until the page/runtime contract and detail destination exist. |
| Laya | Opportunity detail | `/student/opportunities/:opportunityId` | Not yet present | Requested only | `src/app/routes.ts` | Preserve stable `opportunityId`; resolve the current version from canonical data. |
| Laya | Readiness casefile | `/student/opportunities/:opportunityId/readiness` | Not yet present | Requested only | `src/app/routes.ts` | Must consume canonical Engine B output; no route-local calculation. |
| Madhu | Gap closure plan | `/student/opportunities/:opportunityId/plan` | Not yet present | Requested only | `src/app/routes.ts` | Handoff should carry identifiers/readiness identity, not a copied scoring model. |
| Madhu | Applications | `/student/applications/**` | Not yet present | Requested only | `src/app/routes.ts` | Snapshot finalization remains a trusted Worker operation. |
| Manvil | Evidence ledger | `/student/evidence` | Not yet present | Requested only | `src/app/routes.ts` | Artifact upload precedes trusted registration; verification remains scoped and consented. |
| Manvil | Verifier workflow | `/verify/**` | Not yet present | Requested only | `src/app/routes.ts` | Route must not broaden verifier visibility beyond an assigned, active request. |
| Harsh | Opportunity authoring | `/industry/opportunities/**` | Not yet present | Requested only | `src/app/routes.ts` | Publishing must use the existing confirmed-content boundary. |
| Harsh | Applicant workspace | `/recruiter/applications/**` | Not yet present | Requested only | `src/app/routes.ts` | Use finalized consented recruiter projections; never raw private guidance data. |
| Nipun | Faculty lifecycle | `/faculty/**` | Not yet present | Requested only | `src/app/routes.ts` | Faculty remains a first-class opportunity/collaboration actor, not merely a verifier. |
| Nipun | Institution intelligence | `/institution/**` | Not yet present | Requested only | `src/app/routes.ts` | Aggregate/privacy-safe data only; no identifiable cohort leakage. |

Current production routes contain legacy Career Guidance and controlled `/demo/*` routes only. No requested PR1 route is considered finalized by this document.
