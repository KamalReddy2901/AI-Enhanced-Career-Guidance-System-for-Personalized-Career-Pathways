# Platform Hardening Audit

Audit basis: `integration/sih26044-product-v0.2` at `e20bd60e0ea96c66c0319704fd1636b171af6698`, inspected on 2026-08-28. This is a source-backed integration record, not a claim that every path has run against hosted infrastructure.

## Repository hygiene

The integration tip added `CareerCase_SIH26044_PR1_PreImplementation_Inspection_Report (2).txt` at the repository root. It is a generated, paginated inspection export with duplicate-download naming and states that the repository was unavailable. That statement is no longer useful or true for integration work, and the durable team execution material already lives under `docs/team/`. The Kamal branch removes this artifact in a forward commit; integration history is not rewritten.

## Trusted request path

The implemented boundary is:

1. `SihTrustedApiClient` obtains the current Supabase access token and sends only a bearer session plus operation input.
2. The Worker validates the bearer token with `auth.getUser`, then resolves the active SIH actor with the user-context `current_actor_id()` RPC.
3. Subject-owned reads use the user-context client and therefore RLS.
4. Elevated writes use narrowly granted `service_role` RPCs; the elevated key remains a Worker secret.
5. The Worker returns bounded error codes and does not forward database or Storage response bodies.

Implemented trusted routes: readiness recomputation/persistence, subject-fact materialization, evidence projection persistence, artifact registration, artifact-backed derivation, and application snapshot creation/finalization.

Worker unit tests verify malformed/missing session failure, invalid-session versus missing-actor classification, request-field rejection, bounded failures, and route dispatch. On 2026-08-28, the deployed Worker returned bounded `401 UNAUTHENTICATED` responses for both a missing bearer header and an invalid bearer token. The full disposable Supabase integration harness covers invalid session, no actor, deterministic readiness persistence, artifact registration/derivation, and snapshot behavior when Docker is available. A successful hosted operation was not rerun because no established hosted test-user/actor fixture is available in the current environment; no authorized hosted-write success is claimed.

## Artifact and evidence path

| Step | Implemented contract | Status |
|---|---|---|
| Local/private file | Browser selects bytes; no platform helper owns this UI yet | UI integration missing (Manvil lane) |
| Private object upload | Bucket `career-evidence-private`; canonical path `{actorId}/{artifactId}/{filename}`; authenticated Storage RLS checks actor and UUID path | Integration-ready; local Storage API harness exists |
| Trusted registration | Worker fetches the exact object with its server Storage credential, hashes bytes with SHA-256, then calls `register_trusted_artifact` | Implemented; unit/static verified |
| Integrity and initial scan state | Database records server-computed fingerprint and `scan_status = not_scanned` | Implemented |
| Scan transition | `update_artifact_scan_status` is service-role-only | Controlled prototype: no malware scanner adapter is implemented |
| Artifact-backed derivation | Worker calls the service-only canonical RPC; source evidence, link, actor, confirmation trace, and `scan_status = clean` are required | Implemented; local integration harness available |
| Engine B contribution | Readiness assembly includes artifact IDs only when the linked artifact is exactly `clean` | Implemented; `not_scanned` is never treated as `clean` |

Registration proves object existence and content integrity only. It does not verify the claim, promote provenance, or mark a file clean. Derived evidence remains `artifact_backed` with `unverified` initial state; later verification is append-only.

## Function privilege matrix

Migration owners are expected to be `postgres` in the managed/local migration context. The catalog-backed D2 test validates browser denial for trusted RPCs and now validates that every trigger-returning function is non-executable by `anon` and `authenticated` after the forward migration.

| Function(s) | Security mode | anon | authenticated | service/elevated | Intended caller | RLS relationship | Risk / grant state |
|---|---|---:|---:|---:|---|---|---|
| `current_actor_id`, `has_active_organization_role`, `has_any_active_organization_role`, `has_active_organization_membership` | DEFINER | no | yes | inherited/server | RLS and authenticated identity resolution | Bypasses row visibility to return bounded identity/boolean facts | Required authenticated helpers; fixed search path and actor binding |
| `can_manage_opportunity`, `can_access_verification_request`, `can_append_verification_event`, `can_recruiter_read_application`, `can_append_application_event`, `can_access_outcome`, `can_access_collaboration`, `can_create_verification_request`, `can_record_application_outcome`, `can_verify_evidence`, `is_orphan_evidence_object` | DEFINER | no | yes | inherited/server | RLS policies and constrained browser actions | Supply authorization predicates to RLS | Required authenticated helpers; inputs remain actor/consent/org scoped |
| `publish_opportunity_version` | DEFINER | no | yes | inherited/server | Authorized human opportunity author | Performs guarded multi-table publish beyond ordinary row write | Acceptable authenticated RPC; checks active role and complete confirmation trace |
| `current_readiness_organization_memberships` | DEFINER | no | yes | inherited/server | Worker user-context readiness assembly | Returns minimum membership facts needed by Engine B | Acceptable authenticated read RPC |
| `is_consent_active` | DEFINER | no | no | yes | Worker snapshot path and internal helpers | Reads append-only consent state across RLS | Service-only after migration 013; browser execution remains revoked |
| `current_scoped_verification_state`, `current_application_stage`, `application_snapshot_canonical_material` | DEFINER | no | no | internal/owner context | Internal authorization/integrity helpers | Bypass RLS for bounded derived state | Direct browser execution revoked; no public API contract |
| `finalize_application_snapshot` | DEFINER | no | yes | inherited/server | Applicant user-context finalization after trusted creation | RLS plus applicant ownership and immutable snapshot guards | Authenticated only; constrained finalization boundary |
| `has_prohibited_json_keys` | INVOKER | no | yes | yes | Pure validation helper / trusted snapshot RPC | No row access | Low risk; recursive prohibited-key filter supports the projection guard |
| `recruiter_projection_is_allowlisted` | INVOKER | yes | yes | yes | Pure check constraint/helper | No row access | Default PUBLIC execution remains; accepted low-risk exposure because it is immutable, reads no rows, and returns only validation of caller-supplied JSON |
| `record_authoritative_audit`, `persist_trusted_readiness_result`, `materialize_readiness_subject_facts`, `save_readiness_evidence_projection`, `register_trusted_artifact`, `update_artifact_scan_status`, `derive_artifact_backed_evidence`, `plan_application_snapshot_identity`, `create_application_snapshot` | DEFINER | no | no | yes | Trusted Worker only | Intentionally bypass RLS for validated persistence | Correct service-only grants; exact signatures are catalog-tested |
| All functions returning `trigger` in schema `sih26044` | Mixed; several DEFINER | no | no | trigger invocation only | PostgreSQL triggers | Enforce immutability, confirmation, linkage, and sequencing | Fixed in forward migration: default PUBLIC/browser EXECUTE revoked |

Residual limitation: the catalog-backed privilege assertions run in disposable CI because the current workstation has neither Docker/Podman nor an authenticated Supabase CLI profile. The dedicated database workflow also runs local Supabase security/performance advisors after clean replay, fails on advisor errors, and retains warnings for review rather than labeling the schema universally clean.

Advisor result on clean migration replay: no `ERROR` findings and four performance `WARN` findings. `actors_insert_self` should wrap `auth.uid()` in `select` to avoid per-row re-evaluation. `artifacts`, `evidence_artifact_links`, and `evidence_records` each have separate subject and assigned-verifier permissive `SELECT` policies; this is intentional authorization separation but has a measurable policy-evaluation cost. These warnings remain open because consolidating policies is a performance refactor, not required to close the execute-privilege defect, and must preserve exact verifier consent boundaries.

## Browser/trusted mutation classification

| Mutation | Classification | Authority/invariant |
|---|---|---|
| Weak evidence creation | Browser RLS write | Subject-owned; weak provenance and bounded initial states only |
| Consent grant/evidence links | Browser RLS write | Subject-owned, purpose-scoped; append-only grant |
| Consent withdrawal | Append-only journal write | New lifecycle event; grant is not mutated |
| Verification request | Browser RLS write | Exact evidence scope, active consent, assigned verifier boundary |
| Verification event | Append-only journal write | Actor/action/organization authorization; provenance remains immutable |
| Artifact registration and scan transition | Trusted Worker write | Server object fetch/fingerprint; service-only RPC |
| Artifact-backed derivation | Trusted Worker write | Clean linked artifact plus explicit human confirmation; no issuer-grade promotion |
| Subject facts/evidence projections/readiness result | Trusted Worker write | Actor derived from session; deterministic Engine B result; service-only persistence |
| Application shell creation | Browser RLS write | Applicant-owned saved/preparing record |
| Application snapshot | Trusted Worker write | Recomputed readiness, active purpose-specific consent, selected-evidence coverage, immutable allowlisted projection |
| Application stage transition | Append-only journal write | Human-attributed event and transition guard; `rejected_by_human` is explicit |
| Outcomes | Browser RLS write | Application-linked authorized human actor; append-only, descriptive, not causality/mastery |
| Collaboration lifecycle | Browser RLS write / controlled prototype | Organization membership and role policies; no shared DAL method yet |
| Institution interventions | Controlled prototype only | No canonical intervention persistence contract is currently implemented; Nipun must not invent one |

No shared frontend code was found performing service-role writes, mutating provenance, computing readiness locally for persistence, or projecting private Engine A fields to recruiters.

## Repository protection audit

GitHub authentication allowed a read-only settings audit. There are no repository rulesets and `main`, `foundation/sih26044-v0.1`, and `integration/sih26044-product-v0.2` are unprotected. Recommended settings (not applied automatically): block force-push/deletion on all three; require PRs and passing CI on `main` and integration; require at least one approving review and dismiss stale approvals; require conversation resolution; direct teammate PRs to integration; keep the operational no-self-merge rule. Foundation should be frozen except for explicitly approved forward repairs.
