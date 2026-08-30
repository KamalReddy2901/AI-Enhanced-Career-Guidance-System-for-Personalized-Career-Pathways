import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const [pages, reads, lifecycle, migration, sql] = await Promise.all([
  readFile(join(root, 'src/app/sih/SihFacultyProductionPages.tsx'), 'utf8'),
  readFile(join(root, 'src/app/services/sih/productionFacultyReads.ts'), 'utf8'),
  readFile(join(root, 'src/app/services/sih/productionFacultyLifecycle.ts'), 'utf8'),
  readFile(join(root, 'supabase/migrations/20260830155428_faculty_engagement_lifecycle.sql'), 'utf8'),
  readFile(join(root, 'supabase/tests/sih26044_faculty_engagement_lifecycle.sql'), 'utf8'),
]);

assert.match(pages, /Append-only production lifecycle/);
assert.match(pages, /Engagement milestones and outcomes/);
for (const kind of ['milestone', 'deliverable', 'feedback', 'outcome']) assert.match(pages, new RegExp(`['"]${kind}['"]`));
assert.match(pages, /canTransition=\{hostOperator\}/, 'Status actions must be limited to exact host-organization authority in the UI.');
assert.match(pages, /canRecordActivity=\{hostOperator \|\| participant\}/, 'Activity UI must be limited to host operators or exact recorded participants.');
assert.match(pages, /does not automatically mint evidence/i);
assert.doesNotMatch(pages, /\/demo\/faculty/);
assert.doesNotMatch(pages, /riasec|aspiration|counselor|hiring probability|candidate rank/i);

assert.match(reads, /collaboration_engagement_events/);
assert.doesNotMatch(reads, /\.select\(['"]\*['"]\)/, 'Production faculty reads must use explicit field allowlists.');
assert.match(lifecycle, /append_collaboration_engagement_event/);
assert.doesNotMatch(lifecycle, /actor_id|organization_id/, 'Browser lifecycle requests must not supply actor or organization identity.');

assert.match(migration, /create table sih26044\.collaboration_engagement_events/);
assert.match(migration, /before update or delete[\s\S]*reject_historical_mutation/);
assert.match(migration, /revoke update on sih26044\.collaboration_engagements from authenticated/);
assert.match(migration, /current_actor := sih26044\.current_actor_id\(\)/);
assert.match(migration, /for update/);
assert.match(migration, /Collaboration engagement was not found or is not authorized/);
assert.match(migration, /Invalid collaboration lifecycle transition/);
assert.match(migration, /revoke all on function sih26044\.initialize_collaboration_engagement_event\(\) from public, anon, authenticated/);
assert.match(migration, /revoke all on function sih26044\.append_collaboration_engagement_event[\s\S]*from public, anon/);

const sqlAssertionCount = (sql.match(/^select pg_temp\.assert_(?:true|blocked)\(/gm) ?? []).length;
assert.ok(sqlAssertionCount >= 12, `Expected at least 12 faculty lifecycle SQL assertions, found ${sqlAssertionCount}.`);
for (const boundary of [
  'participant without host-organization authority cannot change engagement status',
  'unrelated tenant cannot append collaboration activity',
  'approved engagement cannot skip active and jump to completed',
  'authenticated clients cannot mutate materialized collaboration status directly',
  'collaboration event history cannot be updated',
  'collaboration event history cannot be deleted',
  'collaboration outcome does not automatically mint evidence',
]) assert.match(sql, new RegExp(boundary, 'i'));

console.log(JSON.stringify({
  facultyLifecycle: ['proposed', 'approved', 'active', 'completed_or_cancelled'],
  activityKinds: ['milestone', 'deliverable', 'feedback', 'outcome'],
  history: 'append_only',
  statusAuthority: 'host_organization_role',
  activityAuthority: 'host_operator_or_exact_participant',
  outcomeEvidenceAutoMinted: false,
  executableSqlAssertions: sqlAssertionCount,
  failures: [],
}, null, 2));
