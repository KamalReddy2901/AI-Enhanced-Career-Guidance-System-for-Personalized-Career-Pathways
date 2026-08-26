# CareerCase × SIH26044 — Foundation Architecture

## 1. Product Thesis
CareerCase is an **Evidence-backed Opportunity Readiness & Skills Intelligence layer** for the academia–industry ecosystem.

### Closed Loop Lifecycle:
```
Career Passport
  → Career Direction
  → Opportunity
  → Opportunity Readiness
  → Explainable Gap
  → Prove / Practice / Learn / Experience
  → Verification
  → Consented Application
  → Human Recruitment / Collaboration
  → Outcome
  → Updated Evidence
  → Institution / Industry Skills Intelligence
  → Intervention
```

CareerCase is strictly distinguished from generic job boards, ATS, LMS, or chatbots:
- **Engine A (Career Guidance)** remains separate from **Engine B (Opportunity Readiness)**.
- `UNKNOWN != UNSKILLED` and `UNKNOWN != GAP`.
- Engine B is deterministic, explainable, versioned, and single-source (`src/app/engine/opportunityReadiness.ts`).
- Readiness is **never** hiring probability, candidate ranking, or automatic rejection.
- Private Career Guidance data (RIASEC, work values, aspirations, counselor notes) **never** enters Engine B, input snapshots, audit events, or recruiter payloads.

---

## 2. Status Categorization

### IMPLEMENTED
- **Database Persistence**: Migrations `001` through `015` in `sih26044` schema with strict RLS, append-only triggers, and least-privilege SECURITY DEFINER functions.
- **Engine B Integration**: Direct, single-source import of `computeOpportunityReadiness()` inside Cloudflare Worker.
- **Deterministic Historical Snapshotting**: Immutable readiness results and semantic input snapshots (`sih26044.readiness_input_snapshots`).
- **Organization Membership Semantics**: Exact D1 active membership semantics (`status = 'active'`, `valid_from <= now`, `valid_until is null or > now`, `org.status = 'active'`) with deterministic historical row collapse.
- **Privacy Key Filter**: Recursive JSON key filter blocking prohibited keys (`riasec`, `work_values`, `private_aspirations`, `counselor_history`, `financial_constraints`, `guardian_data`, `hiring_probability`, `candidate_rank`) while preserving legitimate text values containing words like "aspiration" or "counselor".
- **Trusted Subject-Fact Materialization**: Narrow RPC `materialize_readiness_subject_facts` updating purpose-relevant facts with authoritative audit events.
- **Evidence Capability Projections**: Narrow RPC `save_readiness_evidence_projection` with human confirmation validation (canonical methods: `structured_human_entry`, `ai_assisted_review`).
- **Direct Storage Upload & Trusted Registration**: Authenticated uploads to private bucket `career-evidence-private/<actor>/<artifact>/<filename>` verified by Worker through server-side byte download and Web Crypto SHA-256 computation; modern Supabase `sb_secret_*` key compatibility.
- **Artifact Scan Lifecycle**: Conservative initial status `not_scanned`; only `clean` artifacts contribute to Engine B readiness signals; dedicated service-role scan transition RPC.
- **Derived Artifact-Backed Evidence**: Explicit append-only lineage in `sih26044.evidence_derivations` with semantic uniqueness constraint; does not rewrite original weak evidence or silently inherit verifications; idempotent retry with conflict detection.
- **Production Recruiter Projection & Application Snapshot**: Strict allowlist projection module without `syntheticPersona` or generic object spreading; deterministic snapshot ID via `uuid_generate_v5`; submission stage `'applied'`; consent-minimized supporting evidence; user-context finalization; content-derived SHA-256 fingerprint; immediate access revocation upon consent withdrawal.
- **Authoritative Audit**: Strict principal discipline supporting either `actor_id` OR `system_principal`.
- **Typed SIH Client & DAL**: Typed `SihTrustedApiClient` and `SihBrowserDal`.
- **Dual-Client Pattern**: User-context Supabase client (anon key + JWT passthrough) for RLS-filtered reads; elevated service_role client for trusted-write RPCs only.
- **Safe Error Contract**: All Worker RPC errors return bounded, deliberately authored messages; raw database error text never forwarded to browser.

### INTEGRATION-READY
- **Hosted Supabase Config**: Local `config.toml` exposes `sih26044` schema; ready for production hosted configuration.
- **Cloudflare Worker Deployment**: Production secrets and routes ready for Wrangler deployment.

### TARGET ARCHITECTURE / NOT CONFIGURED
- **Real Security Scanner**: Service-role scan status adapter contract ready; no vendor/daemon configured.
- **External Connectors (NCS, SIDH, AICTE, NATS, NAPS, DigiLocker)**: `ConnectorDescriptor` interface defined; no concrete bounded connector adapters implemented.

### CONTROLLED PROTOTYPE
- `/demo` synthetic flow and personas under `src/app/demo/`.

### NOT-LIVE LIMITATIONS
- No live external APIs (NCS, AICTE, DigiLocker, NATS, NAPS, SIDH) are currently configured.
- No live third-party anti-malware vendor scanner is currently running.
- Hosted Supabase custom exposed schema configuration requires production environment deployment.

---

## 3. Security & Trust Boundaries

```
[Browser Client]
   │
   ├─ Direct RLS ──► Supabase PostgreSQL (sih26044)
   │                  - Weak evidence proposals
   │                  - Consent grants & withdrawals
   │                  - Verification requests & events
   │                  - Application drafting & stage events
   │
   ├─ Direct Upload ─► Supabase Storage (career-evidence-private)
   │                   - <actor_id>/<artifact_id>/<safe-filename>
   │
   └─ Bearer JWT ──► Cloudflare Worker (/sih/*)
                       │
                       ├─ Validates Session & Resolves Actor
                       ├─ Downloads Uploaded Bytes & Computes SHA-256
                       ├─ Runs Canonical Engine B
                       └─ Elevated Client (SECURITY DEFINER RPCs only)
```
