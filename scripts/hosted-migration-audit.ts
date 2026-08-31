/** Semantic repository/hosted migration comparison; requires a read-only DB URL. */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const dbUrl = process.env.SIH_SUPABASE_DB_URL ?? '';
if (!dbUrl) throw new Error('SIH_SUPABASE_DB_URL is required and must be supplied from a trusted operator environment.');
const normalize = (sql: string) => sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim().toLowerCase();
const digest = (sql: string) => createHash('sha256').update(normalize(sql)).digest('hex');
const local = readdirSync('supabase/migrations').filter(name => name.endsWith('.sql')).sort().map(name => ({ name, hash: digest(readFileSync(`supabase/migrations/${name}`, 'utf8')) }));
const query = `copy (select json_build_object('version',version,'name',name,'statements',statements)::text from supabase_migrations.schema_migrations order by version) to stdout`;
const result = spawnSync('psql', ['-X', '-v', 'ON_ERROR_STOP=1', dbUrl, '-Atc', query], { encoding: 'utf8' });
if (result.status !== 0) throw new Error(result.stderr || 'Hosted migration query failed');
const remote = result.stdout.trim().split('\n').filter(Boolean).map(line => JSON.parse(line) as { version: string; name?: string; statements: string[] }).map(item => ({ ...item, hash: digest(item.statements.join('\n')) }));
const remoteHashes = new Set(remote.map(item => item.hash));
const missing = local.filter(item => !remoteHashes.has(item.hash));
console.log(JSON.stringify({ localCount: local.length, hostedCount: remote.length, semanticallyMissing: missing.map(item => item.name), hosted: remote.map(({ version, name, hash }) => ({ version, name, hash })) }, null, 2));
if (missing.length) process.exitCode = 2;
