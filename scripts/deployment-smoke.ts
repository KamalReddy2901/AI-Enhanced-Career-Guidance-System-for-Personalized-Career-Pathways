import assert from 'node:assert/strict';
const appOrigin = process.env.SIH_APP_ORIGIN ?? ''; const workerOrigin = process.env.SIH_WORKER_ORIGIN ?? '';
if (!appOrigin || !workerOrigin) throw new Error('SIH_APP_ORIGIN and SIH_WORKER_ORIGIN are required.');
for (const raw of [appOrigin, workerOrigin]) assert.equal(new URL(raw).protocol, 'https:');
let assertions = 0;
for (const route of ['/', '/sih/student/opportunities', '/sih/faculty/collaboration', '/demo']) { const response = await fetch(new URL(route, appOrigin), { redirect: 'follow' }); assert.ok(response.ok); const body = await response.text(); assert.match(body, /<div id="root"><\/div>|CareerCase/i); assertions += 2; }
const missingAuth = await fetch(new URL('/sih/readiness/recompute', workerOrigin), { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
assert.equal(missingAuth.status, 401); const error = await missingAuth.json() as { error?: { code?: string } }; assert.equal(error.error?.code, 'UNAUTHENTICATED'); assertions += 2;
console.log(`Deployment boundary smoke passed: ${assertions} assertions`);
