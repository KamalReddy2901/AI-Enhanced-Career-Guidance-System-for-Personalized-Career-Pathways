/**
 * Trusted, credential-gated readiness check for the controlled hosted SIH26044
 * fixture. This tool is deliberately not part of the browser bundle or CI: it
 * needs an approved service key only when an operator explicitly runs it.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const expectedProjectRef = 'mmwgnsggnllwgshipnwh';
const mode = process.argv[2] ?? 'preflight';
const url = process.env.SIH_SUPABASE_URL ?? '';
const serviceKey = process.env.SIH_SUPABASE_SERVICE_ROLE_KEY ?? '';
const confirmation = process.env.SIH_HOSTED_FIXTURE_CONFIRMATION;

function fail(message: string): never { throw new Error(`Hosted SIH preflight: ${message}`); }
function migrationInventory() {
  const directory = resolve('supabase/migrations');
  return readdirSync(directory).filter(name => name.endsWith('.sql')).sort().map(name => ({
    name,
    sha256: createHash('sha256').update(readFileSync(resolve(directory, name))).digest('hex'),
  }));
}

if (!['preflight', 'migration-list'].includes(mode)) fail('usage: npx tsx scripts/hosted-sih-preflight.ts [preflight|migration-list]');
if (!url) fail('SIH_SUPABASE_URL is required (for example https://mmwgnsggnllwgshipnwh.supabase.co).');
let parsed: URL;
try { parsed = new URL(url); } catch { fail('SIH_SUPABASE_URL must be an HTTPS URL.'); }
if (parsed.protocol !== 'https:' || parsed.hostname !== `${expectedProjectRef}.supabase.co`) {
  fail(`refusing an unexpected project; expected ${expectedProjectRef}.supabase.co.`);
}
console.log(`Target: ${parsed.origin}`);
console.log(`Repository migrations: ${migrationInventory().length}`);
for (const migration of migrationInventory()) console.log(`${migration.name} ${migration.sha256}`);

if (mode === 'migration-list') {
  if (!process.env.SUPABASE_ACCESS_TOKEN) fail('SUPABASE_ACCESS_TOKEN is required to read hosted migration history.');
  execFileSync('npx', ['--no-install', 'supabase', 'migration', 'list', '--project-ref', expectedProjectRef], { stdio: 'inherit' });
  process.exit(0);
}

if (!serviceKey) fail('SIH_SUPABASE_SERVICE_ROLE_KEY is required for authenticated hosted preflight.');
if (confirmation !== 'READ_ONLY_PREFLIGHT') fail('set SIH_HOSTED_FIXTURE_CONFIRMATION=READ_ONLY_PREFLIGHT; this command does not write data.');
const admin = createClient(parsed.origin, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: users, error: userError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
assert.ifError(userError);
assert.ok(users, 'Auth admin response missing users payload');
const { error: actorError } = await admin.schema('sih26044').from('actors').select('id', { head: true, count: 'exact' }).limit(1);
assert.ifError(actorError);
console.log('Authenticated Auth-admin and SIH schema reads succeeded. No fixture rows were created.');
