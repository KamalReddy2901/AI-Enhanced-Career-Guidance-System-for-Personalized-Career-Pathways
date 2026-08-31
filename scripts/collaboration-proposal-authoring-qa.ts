import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const [routes, layout, pages, service, migration, sql] = await Promise.all([
  readFile(join(root, 'src/app/routes.ts'), 'utf8'),
  readFile(join(root, 'src/app/sih/SihProductionLayout.tsx'), 'utf8'),
  readFile(join(root, 'src/app/sih/SihCollaborationProductionPages.tsx'), 'utf8'),
  readFile(join(root, 'src/app/services/sih/productionCollaborationAuthoring.ts'), 'utf8'),
  readFile(join(root, 'supabase/migrations/20260831011500_collaboration_proposal_authoring.sql'), 'utf8'),
  readFile(join(root, 'supabase/tests/sih26044_collaboration_proposals.sql'), 'utf8'),
]);

assert.match(routes, /path: ['"]collaborations['"]/);
assert.match(routes, /path: ['"]collaborations\/new['"]/);
assert.match(routes, /path: ['"]collaborations\/:collaborationId['"]/);
assert.match(layout, /['"]Collaboration['"], ['"]\/collaborations['"]/);

assert.match(pages, /Propose Collaboration/);
assert.match(pages, /does not approve participation, verify skills, create evidence, or imply endorsement/i);
assert.match(pages, /faculty.*institution-admin.*industry-partner/i);
assert.doesNotMatch(pages, /\/demo\//);
assert.doesNotMatch(pages, /riasec|private aspiration|counselor context|hiring probability|candidate rank|automatic rejection/i);

assert.match(service, /\.rpc\(['"]list_collaboration_partner_organizations['"]/);
assert.match(service, /\.rpc\(['"]create_collaboration_proposal['"]/);
assert.doesNotMatch(service, /\.from\(/, 'Production collaboration authoring must not perform partial direct table writes.');
assert.doesNotMatch(service, /actor[_A-Z]|createdByActor/i, 'Browser proposal requests must not supply actor identity.');

assert.match(migration, /current_actor := sih26044\.current_actor_id\(\)/);
assert.match(migration, /array\['faculty', 'institution_admin', 'industry_partner'\]/);
assert.match(migration, /At least one explicit partner organization is required/);
assert.match(migration, /At least one literal collaboration objective is required/);
assert.match(migration, /'proposed'/);
assert.match(migration, /insert into sih26044\.collaboration_participants/);
assert.match(migration, /collaboration\.proposal_created/);
assert.match(migration, /revoke insert on sih26044\.collaboration_engagements from authenticated/);
assert.match(migration, /revoke insert on sih26044\.collaboration_partner_organizations from authenticated/);
assert.match(migration, /never infers approval, verification, evidence, or endorsement/i);

const sqlAssertionCount = (sql.match(/^select pg_temp\.assert_(?:true|blocked)\(/gm) ?? []).length;
assert.ok(sqlAssertionCount >= 18, `Expected at least 18 collaboration proposal SQL assertions, found ${sqlAssertionCount}.`);
for (const boundary of [
  'authorized host author sees active partner organization',
  'partner directory excludes the selected host organization',
  'atomic authoring creates only a proposed engagement',
  'literal collaboration objectives are preserved in authored order',
  'append-only created event',
  'does not mint evidence',
  'unrelated faculty cannot create a proposal for another host organization',
  'host organization cannot be recorded as its own partner',
  'authenticated browser role cannot bypass atomic proposal RPC',
  'leave no partial engagement residue',
]) assert.match(sql, new RegExp(boundary, 'i'));

console.log(JSON.stringify({
  collaborationProposal: 'atomic_human_authored',
  initialStatus: 'proposed',
  partnerAuthority: 'explicit_registered_organizations',
  initialParticipant: 'authenticated_proposer_only',
  objectives: 'literal_ordered',
  lifecycle: 'existing_append_only_history',
  directBrowserInserts: false,
  automaticApproval: false,
  automaticEvidence: false,
  executableSqlAssertions: sqlAssertionCount,
  failures: [],
}, null, 2));
