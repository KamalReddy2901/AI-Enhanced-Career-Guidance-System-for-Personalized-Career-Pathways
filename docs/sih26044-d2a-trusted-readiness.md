# SIH26044 D2-A trusted readiness persistence

The Worker exposes `POST /sih/readiness/recompute`. Its request body contains only
`opportunityVersionId`; computed readiness fields and actor identifiers are rejected.

Identity is always resolved under the caller's actual Supabase bearer JWT:

`JWT -> auth.uid() -> sih26044.actors.auth_user_id -> sih26044.current_actor_id()`

Only after that resolution does the Worker create the server-only elevated client. The
elevated key can be supplied as `SUPABASE_ELEVATED_KEY`; the explicit legacy/local alias
`SUPABASE_SERVICE_ROLE_KEY` remains server-only. Neither value is a browser variable.

## Deterministic versions

All versions use SHA-256 over recursively key-sorted canonical JSON. Array order is
preserved only where it is semantically ordered; database collections are explicitly
ordered before hashing.

- `subject-facts-v1` commits to the actor identifier and the purpose-limited eligibility
  fact projection, including confirmed/completeness states and active membership facts.
- `evidence-projection-v1` commits to the ordered, applicable canonical evidence signals,
  their current verification state, provenance, capability projection, and linked artifacts.
- `opportunity-readiness-input-v1` commits to the exact published opportunity version,
  confirmed requirements/rules, and both preceding fingerprints.

These are reproducibility fingerprints, not evidence provenance or proof of verification.
The result UUID is deterministically derived from actor, opportunity version, these three
versions, and the actual Engine B/policy versions. A matching database unique index and
server-only RPC make repeated unchanged recomputation idempotent; changed inputs append a
new immutable historical row.

## Deployment state

Source and local tests are implemented by this repository. Hosted deployment remains
integration-ready until all of the following are configured and tested:

1. Add `sih26044` to the hosted Supabase API **Exposed schemas** setting without removing
   the normal defaults (`public`, `storage`, and `graphql_public`).
2. Provision Worker secrets `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and
   `SUPABASE_ELEVATED_KEY` (a current `sb_secret_*` server key is supported).
3. Apply migration 011 and deploy the Worker, then exercise the endpoint with a hosted
   account that has an active SIH actor.

No hosted/live deployment is implied by local execution.
