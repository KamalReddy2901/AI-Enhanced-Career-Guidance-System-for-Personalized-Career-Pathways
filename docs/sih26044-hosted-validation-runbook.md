# Hosted SIH26044 validation and deployment runbook

This runbook is for the controlled synthetic SIH26044 fixture only. It is not a production-data migration tool and must never be run with browser credentials.

## Required trusted environment

Provide these only in a secure operator shell or secret store:

- `SIH_SUPABASE_URL=https://mmwgnsggnllwgshipnwh.supabase.co`
- `SIH_SUPABASE_SERVICE_ROLE_KEY` — server-only Supabase secret key.
- `SUPABASE_ACCESS_TOKEN` — only for hosted migration-history/advisor commands.
- `SIH_CONTROLLED_FIXTURE_PASSWORD` — unique 16+ character test-only password; never commit it.

First compare repository migration checksums with hosted history:

```bash
npx tsx scripts/hosted-sih-preflight.ts migration-list
```

Only after semantic review of missing migrations, apply the delta with the authenticated Supabase CLI. Never reset, repair timestamps by rewriting history, or apply an unreviewed migration to the hosted project.

Then verify privileged read access without creating data:

```bash
SIH_HOSTED_FIXTURE_CONFIRMATION=READ_ONLY_PREFLIGHT npx tsx scripts/hosted-sih-preflight.ts
```

Create the six explicitly-labelled synthetic Auth identities only after the schema is confirmed current:

```bash
SIH_HOSTED_FIXTURE_CONFIRMATION=CREATE_CONTROLLED_SIH_FIXTURES npx tsx scripts/hosted-sih-fixture.ts
```

The bootstrap intentionally does **not** assign organization authority, fabricate evidence, create opportunity/application/outcome history, or tear down append-only records. Those actions need a schema-aware controlled scenario loader and must preserve auditability. Existing real Auth users are never selected or repurposed.

## Deployment preflight

Run `npm run build`; then `cd worker && npx tsc --noEmit && npm test && npx wrangler deploy --dry-run`. Before actual preview deployment configure the Pages public values (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_WORKER_URL`) and Worker encrypted secrets (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_ELEVATED_KEY`, and Groq keys where applicable). No service key may be prefixed with `VITE_`.

After preview, authenticate only as the controlled identities and execute the role matrix from `docs/sih26044-integration-status.md`. Treat `careercase.pages.dev` as legacy until those tests and post-production regression have recorded evidence.
