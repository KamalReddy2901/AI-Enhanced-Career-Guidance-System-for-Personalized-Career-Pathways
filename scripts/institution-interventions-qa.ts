import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const [routes, layout, intelligencePage, interventionPage, service, migration, sqlTest] = await Promise.all([
  readFile(join(root, 'src/app/routes.ts'), 'utf8'),
  readFile(join(root, 'src/app/sih/SihProductionLayout.tsx'), 'utf8'),
  readFile(join(root, 'src/app/sih/SihInstitutionProductionPage.tsx'), 'utf8'),
  readFile(join(root, 'src/app/sih/SihInstitutionInterventionsPage.tsx'), 'utf8'),
  readFile(join(root, 'src/app/services/sih/productionInstitutionInterventions.ts'), 'utf8'),
  readFile(join(root, 'supabase/migrations/20260830145500_institution_interventions.sql'), 'utf8'),
  readFile(join(root, 'supabase/tests/sih26044_institution_interventions.sql'), 'utf8'),
]);

assert.match(routes, /path:\s*["']institution\/interventions["'][\s\S]*InstitutionInterventionsPage/,
  'Production institution interventions route is missing.');
assert.match(layout, /roles\.has\(["']institution_admin["']\)[\s\S]*Interventions[\s\S]*\/institution\/interventions/,
  'Institution-admin navigation must expose the interventions workspace.');
assert.doesNotMatch(layout, /policy_program_analyst[\s\S]{0,140}\/institution\/interventions/,
  'Policy/program analysts must not receive operational intervention navigation.');
assert.match(intelligencePage, /Plan human intervention/);
assert.match(intelligencePage, /result\.accessMode\s*===\s*'institution_admin'/,
  'Skills Intelligence handoff must be institution-admin only.');

assert.match(interventionPage, /ProductionInstitutionReads/);
assert.match(interventionPage, /ProductionInstitutionInterventions/);
assert.match(interventionPage, /scope\.accessMode\s*===\s*'institution_admin'/,
  'Operational institution scope must filter out aggregate-only policy access.');
assert.match(interventionPage, /!point\.suppressed/,
  'Browser action planner must offer only reportable aggregate cells.');
assert.match(interventionPage, /server recomputes|server-side/i,
  'UI must tell the user that the authoritative source signal is recomputed server-side.');
assert.match(interventionPage, /no learner names or identifiers/i,
  'Intervention population entry must make the cohort-only boundary visible.');
assert.match(interventionPage, /does not automatically prescribe|human-owned/i,
  'Institution intervention UI must preserve explicit human ownership.');
assert.match(interventionPage, /causalClaimed=false|no causal inference|not proof/i,
  'Follow-up UI must preserve the non-causal claim boundary.');
assert.doesNotMatch(interventionPage, /candidate.?rank|automatic.?rejection|hiring.?probability/i);

for (const rpc of [
  'list_institution_interventions',
  'create_institution_intervention',
  'append_institution_intervention_event',
  'record_institution_intervention_followup',
]) {
  assert.match(service, new RegExp(`rpc\\(['\"]${rpc}['\"]`), `Production intervention service is missing RPC ${rpc}.`);
}
assert.doesNotMatch(service, /\.from\s*\(/,
  'Production intervention browser service must use bounded RPCs rather than direct operational table writes.');

assert.match(migration, /create table sih26044\.institution_interventions/);
assert.match(migration, /create table sih26044\.institution_intervention_events/);
assert.match(migration, /create table sih26044\.institution_intervention_followups/);
assert.match(migration, /source_cohort_size bigint not null check \(source_cohort_size >= 5\)/);
assert.match(migration, /get_institution_skills_intelligence\(/,
  'Creation/follow-up must recompute the authoritative aggregate signal in the database.');
assert.match(migration, /Suppressed or below-threshold aggregate cells cannot seed an operational intervention/);
assert.match(migration, /has_active_organization_role\(requested_organization_id, 'institution_admin'\)/);
assert.match(migration, /Operational interventions require institution administration authority/);
assert.doesNotMatch(migration, /has_active_organization_role\([^\n]*policy_program_analyst/,
  'Aggregate policy role must not become operational intervention authority.');
assert.match(migration, /causal_claimed boolean not null default false check \(causal_claimed = false\)/);
assert.match(migration, /institution_interventions_immutable/);
assert.match(migration, /institution_intervention_events_immutable/);
assert.match(migration, /institution_intervention_followups_immutable/);
assert.match(migration, /institution_intervention_transition_allowed/);
assert.match(migration, /\('draft', 'approved'\)/);
assert.match(migration, /\('approved', 'active'\)/);
assert.match(migration, /\('active', 'completed'\)/);
assert.doesNotMatch(migration, /subject_actor_id|applicant_actor_id|evidence_record_id|readiness_result_id/,
  'Operational institution intervention persistence must not introduce learner-level foreign keys.');
assert.match(migration, /population descriptions cannot contain individual identifiers/i);
assert.match(migration, /enable row level security/g);
assert.match(migration, /revoke all on table sih26044\.institution_interventions from public, anon, authenticated/);
assert.match(migration, /grant select on table sih26044\.institution_interventions to authenticated/);

const sqlAssertionCount = (sqlTest.match(/^(?:select|\s+perform) pg_temp\.assert_(?:true|blocked)\(/gm) ?? []).length;
assert.ok(sqlAssertionCount >= 15, `Expected at least 15 executable institution intervention SQL assertions, found ${sqlAssertionCount}.`);
assert.match(sqlTest, /policy\/program analyst cannot read operational intervention rows/i);
assert.match(sqlTest, /suppressed singleton aggregate cell cannot seed an operational intervention/i);
assert.match(sqlTest, /intervention lifecycle events are append-only/i);
assert.match(sqlTest, /follow-up persists only the authoritative aggregate point and stays explicitly non-causal/i);

console.log(JSON.stringify({
  productionRoute: '/institution/interventions',
  operationalAuthority: 'institution_admin_only',
  policyAnalystAccess: 'aggregate_only',
  sourceSignalAuthority: 'server_recomputed_reportable_aggregate',
  sourceMinimumCellSize: 5,
  lifecycle: ['draft', 'approved', 'active', 'completed_or_cancelled'],
  lifecycleHistory: 'append_only',
  followupInterpretation: ['descriptive', 'associational'],
  causalClaims: false,
  learnerLevelForeignKeys: false,
  executableSqlAssertions: sqlAssertionCount,
  failures: [],
}, null, 2));
