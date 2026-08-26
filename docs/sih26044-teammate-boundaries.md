# CareerCase × SIH26044 — Teammate Boundaries & Foundation Contract

This document specifies the frozen Foundation interfaces and guidelines for parallel feature work across the team.

## Planned Team Ownership
- **Kamal**: Architecture, Engine B, shared domain contracts, trusted Worker backend, persistence integrations.
- **Manvil**: Evidence ledger, verification lifecycle, RBAC, tenancy boundaries.
- **Harsh**: Opportunity lifecycle, employer/recruiter experience, application review.
- **Nipun**: Faculty collaboration, institution/T&P, Skills Intelligence & policy analytics.
- **Laya & Madhu**: Student experience (Career Passport, opportunity exploration, readiness gaps, application flow).

---

## 1. WHAT TEAMMATES MAY SAFELY BUILD AGAINST

### Domain Contracts
- All core types in `src/app/domain/` (opportunities, requirements, evidence, readiness, consent, application, collaboration, outcome, analytics).

### Browser Direct RLS DAL
- Use `SihBrowserDal` in `src/app/services/sih/browserDal.ts` for operations explicitly permitted by database RLS:
  - Submitting weak evidence proposals (`self_declared`, `self_reported`, `extracted`, `inferred`).
  - Granting and withdrawing consent (`application_review`, `evidence_verification`, etc.).
  - Creating verification requests and appending verification events.
  - Creating draft applications and recording stage transitions.

### Trusted Worker Client
- Use `SihTrustedApiClient` in `src/app/services/sih/SihTrustedApiClient.ts` for operations requiring server-side authority:
  - `recomputeReadiness(opportunityVersionId)`
  - `materializeSubjectFacts(facts)`
  - `saveEvidenceProjection(projection)`
  - `registerArtifact(artifact)`
  - `deriveArtifactBackedEvidence(derivation)`
  - `createAndFinalizeApplicationSnapshot(request)`

### Recruiter Projections & Applications
- Use `buildProductionRecruiterProjection()` from `src/app/services/sih/productionRecruiterProjection.ts` for recruiter views.
- Query application snapshots and events using `can_recruiter_read_application(application_id)` semantics.

---

## 2. WHAT TEAMMATES MUST NEVER DO

1. **NEVER Duplicate Engine B**:
   The only calculation is `computeOpportunityReadiness()` in `src/app/engine/opportunityReadiness.ts`. Do not create another readiness evaluator.

2. **NEVER Write Directly to Trusted Database Tables**:
   `opportunity_readiness_results`, `readiness_input_snapshots`, `readiness_subject_facts`, `readiness_evidence_projections`, `artifacts`, `evidence_artifact_links`, `evidence_derivations`, `application_snapshots`, and `audit_events` have direct browser INSERT/UPDATE revoked. Always use the trusted Worker or designated RPCs.

3. **NEVER Mutate Evidence Provenance**:
   Evidence records are append-only. Attaching an artifact or verifying evidence never modifies the `provenance` column of the existing record. Create a new derived record via `derive_artifact_backed_evidence`.

4. **NEVER Expose Private Career Guidance to Recruiter Views**:
   Do not add RIASEC, work values, private aspirations, counselor notes, or financial constraints to recruiter payloads or database projections. The database and QA scripts recursively reject these keys.

5. **NEVER Implement Automatic Rejection or Candidate Ranking**:
   Readiness is not hiring probability or ranking. Do not add percentage fit scores, candidate rankings, or auto-rejection mechanisms.

6. **NEVER Treat UNKNOWN as GAP**:
   Missing evidence is `UNKNOWN`, not `GAP`.

7. **NEVER Grant Broad Service-Role Privileges**:
   Never write `GRANT ALL ON SCHEMA sih26044 TO service_role`. All privileged actions must use narrow SECURITY DEFINER functions with explicit `search_path`.

8. **NEVER Modify Frozen Migrations (001–012)**:
   Migrations `001` through `012` are frozen. All future schema adjustments must be forward-only migrations.
