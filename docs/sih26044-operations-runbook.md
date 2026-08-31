# SIH26044 operations runbook

Status vocabulary: IMPLEMENTED repository controls; VALIDATION-GATED hosted proof; CREDENTIAL-GATED deployment and restore validation.

## Preflight and smoke

Run `npm run qa:sih-premerge`, `cd worker && npm test`, `npm run qa:deployment-preflight`, and `GET /healthz`. Verify the exact commit SHA, migration replay, Worker bindings, allowed origins, and secret names before deployment.

## Database recovery

Use Supabase’s managed backup/PITR controls. Restore into an isolated project first, replay migrations, run the full database-tests workflow, then perform authenticated role/tenant/consent smoke checks. Never test restore by overwriting the production project. Record restore point, migration SHA, test result, and operator.

## Worker failure modes

- `401/403`: session, actor, consent, or organization authority failure; do not retry blindly.
- `429`: respect bounded retry/backoff and `Retry-After`.
- `5xx`: inspect request/correlation IDs and structured error code; elevated keys are never returned.
- Notification `NO_PROVIDER_CONFIGURED`: leave the outbox row suppressed; do not claim external delivery.
- Outbox attempts are leased, idempotent, capped at five, and become `dead` for operator reconciliation.

## Secrets and environment inventory

Client: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_WORKER_URL` only. Worker encrypted secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_ELEVATED_KEY`, `GROQ_API_KEYS`. No service key may use a `VITE_` prefix. Rotate through the platform secret manager and rerun deployment smoke; never commit or paste values.

No penetration test, hosted restore validation, live connector delivery, or production deployment is claimed without its corresponding evidence.
