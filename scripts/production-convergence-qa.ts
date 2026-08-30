import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const [routes, runtime, pages, demo, migration, worker, config] = await Promise.all([
  readFile(join(root, 'src/app/routes.ts'), 'utf8'),
  readFile(join(root, 'src/app/sih/SihProductionContext.tsx'), 'utf8'),
  readFile(join(root, 'src/app/sih/SihProductionPages.tsx'), 'utf8'),
  readFile(join(root, 'src/app/demo/DemoSihRuntime.tsx'), 'utf8'),
  readFile(join(root, 'supabase/migrations/20260830090000_submission_authority_and_resolution_state.sql'), 'utf8'),
  readFile(join(root, 'worker/src/sih/routes.ts'), 'utf8'),
  readFile(join(root, 'worker/wrangler.toml'), 'utf8'),
]);

for (const route of ['career','opportunities','evidence','verification','applications','industry/opportunities','industry/applicants','faculty','institution']) {
  assert.match(routes, new RegExp(`path:\\s*["']${route.replace('/', '\\/')}`), `Missing production route ${route}`);
}
assert.match(routes, /path:\s*["']\/demo["'][\s\S]*Component:\s*DemoSihRuntime/);
assert.doesNotMatch(demo, /GuidanceProvider|SihProductionRuntime|supabase/i, 'Controlled demo runtime must stay isolated');
assert.doesNotMatch(runtime, /GuidanceProvider|GuidanceContext|riasec|aspiration|work.?values/i, 'Engine B provider must not import private Engine A context');
assert.doesNotMatch(pages, /hiring_probability|candidate_rank|automatic_rejection|riasec|work.?values|private.?aspiration/i);
assert.match(pages, /UNKNOWN ≠ UNSKILLED/);
assert.match(migration, /application_snapshot_id[\s\S]*?to_stage\s*=\s*'applied'/i);
assert.doesNotMatch(migration, /latest|newest|order\s+by[\s\S]{0,80}(captured_at|finalized_at)/i);
assert.match(migration, /'resolved',\s*'review_required',\s*'unresolved'/i);
assert.match(worker, /65_536/);
assert.match(worker, /SIH_RATE_LIMITER\.limit/);
assert.match(config, /\[\[ratelimits\]\][\s\S]*name\s*=\s*"SIH_RATE_LIMITER"/);

console.log(JSON.stringify({ productionRoutes: 9, engineBoundary: 'isolated', exactSubmissionBinding: true, workerAbuseControls: true, failures: [] }, null, 2));
