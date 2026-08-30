# Hosted SIH26044 validation and deployment runbook

This runbook is for the controlled synthetic SIH26044 fixture only. It is not a production-data migration tool and must never be run with browser credentials.

## Required trusted environment

Provide these only in a secure operator shell or secret store:

- `SIH_SUPABASE_URL=https://mmwgnsggnllwgshipnwh.supabase.co`
- `SIH_SUPABASE_SERVICE_ROLE_KEY` — server-only Supabase secret key.
- `SUPABASE_ACCESS_TOKEN` — only for hosted migration-history/advisor commands.
- `SIH_SUPABASE_DB_URL` — read-only or operator Postgres URL for semantic migration comparison.
- `SIH_SUPABASE_ANON_KEY` — public key used for controlled authenticated role smoke tests.
- `SIH_CONTROLLED_FIXTURE_PASSWORD` — unique 16+ character test-only password; never commit it.

First compare repository migration checksums with hosted history:

```bash
npx tsx scripts/hosted-sih-preflight.ts migration-list
npx tsx scripts/hosted-migration-audit.ts
```

Only after semantic review of missing migrations, apply the delta with the authenticated Supabase CLI. Never reset, repair timestamps by rewriting history, or apply an unreviewed migration to the hosted project.

Then verify privileged read access without creating data:

```bash
SIH_HOSTED_FIXTURE_CONFIRMATION=READ_ONLY_PREFLIGHT npx tsx scripts/hosted-sih-preflight.ts
```

Create seven explicitly-labelled synthetic identities, four non-real organizations, explicit memberships and roles, including a second recruiter tenant for denial tests:

```bash
SIH_HOSTED_FIXTURE_CONFIRMATION=CREATE_CONTROLLED_SIH_FIXTURES npx tsx scripts/hosted-sih-fixture.ts
```

Run the authenticated authority matrix:

```bash
npm run qa:hosted-smoke
```

The fixture never selects or repurposes real users and never fabricates endorsements, evidence, applications, decisions or outcomes. Safe teardown suspends controlled identities and disables their actors while retaining append-only history:

```bash
SIH_HOSTED_FIXTURE_CONFIRMATION=SUSPEND_CONTROLLED_SIH_FIXTURES npx tsx scripts/hosted-sih-fixture.ts suspend
```

## Authenticated role matrix

| Persona | Positive authority | Negative boundary |
|---|---|---|
| Student | Active learner identity | Cannot call internal authoritative-audit RPC |
| Faculty | Institution-scoped faculty role | No employer or issuer authority |
| Issuer verifier | Issuer-scoped verifier role | No institution or employer authority |
| Recruiter A | Employer A recruiter role | Employer B recruiter authority denied |
| Recruiter B | Employer B recruiter role | Independent tenant identity |
| Institution admin | Institution A operational authority | No employer authority |
| Policy analyst | Institution-scoped aggregate role | No intervention authority is granted by the fixture |

## Deployment preflight

Run `npm run build && npm run qa:deployment-preflight`; then `cd worker && npx tsc --noEmit && npm test && npx wrangler deploy --dry-run`. Before actual preview deployment configure the Pages public values (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_WORKER_URL`) and Worker encrypted secrets (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_ELEVATED_KEY`, and Groq keys where applicable). No service key may be prefixed with `VITE_`.

With an approved Cloudflare token, account ID and a pre-provisioned preview Worker containing encrypted secrets, run `npm run deploy:sih:preview`. Run `npm run qa:deployment-smoke` with the returned HTTPS origins. Only after preview and authenticated role checks pass may an operator set `SIH_DEPLOY_CONFIRMATION=DEPLOY_SIH26044_PRODUCTION` and run `npm run deploy:sih:production`, followed by the same smoke test.

Treat `careercase.pages.dev` as legacy until those tests and post-production regression have recorded evidence.
