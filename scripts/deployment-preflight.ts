import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
assert.ok(existsSync('dist/index.html'), 'run npm run build first');
const workerConfig = readFileSync('worker/wrangler.toml', 'utf8');
for (const token of ['SIH_RATE_LIMITER', 'ENVIRONMENT']) assert.match(workerConfig, new RegExp(token));
for (const forbidden of ['SUPABASE_ELEVATED_KEY =', 'SUPABASE_SERVICE_ROLE_KEY =', 'GROQ_API_KEYS =']) assert.doesNotMatch(workerConfig, new RegExp(forbidden));
console.log('Deployment preflight passed: built client present, Worker bindings declared, no committed secret values.');
