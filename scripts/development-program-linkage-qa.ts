import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const [routes, layout, pages, service, mapping, plan, migration, sql] = await Promise.all([
  readFile(join(root, 'src/app/routes.ts'), 'utf8'),
  readFile(join(root, 'src/app/sih/SihProductionLayout.tsx'), 'utf8'),
  readFile(join(root, 'src/app/sih/SihDevelopmentProgramPages.tsx'), 'utf8'),
  readFile(join(root, 'src/app/services/sih/productionDevelopmentPrograms.ts'), 'utf8'),
  readFile(join(root, 'src/app/components/sih/student/gap-closure/gapActionMapping.ts'), 'utf8'),
  readFile(join(root, 'src/app/components/sih/student/gap-closure/GapClosurePlan.tsx'), 'utf8'),
  readFile(join(root, 'supabase/migrations/20260831024500_development_program_linkage.sql'), 'utf8'),
  readFile(join(root, 'supabase/tests/sih26044_development_programs.sql'), 'utf8'),
]);

for (const path of ['development', 'development/manage', 'development/new', 'development/manage/:developmentProgramVersionId']) {
  assert.match(routes, new RegExp(`path: ["']${path.replace(/[/:]/g, (part) => part === ':' ? '\\:' : part === '/' ? '\\/' : part)}["']`));
}
assert.match(layout, /["']Development["'], ["']\/development["']/);
assert.match(layout, /["']Manage Programs["'], ["']\/development\/manage["']/);

assert.match(pages, /training.*certification.*workshop.*mentorship/);
assert.match(pages, /does not rank providers, promise outcomes/i);
assert.match(pages, /No fuzzy mapping is performed/i);
assert.match(pages, /Keep literal \/ unresolved/);
assert.match(pages, /clears every prior confirmation/i, 'Published successor authoring must visibly require fresh confirmation.');
assert.match(pages, /editableFromTarget\(target, successorSource\)/, 'Published successor targets must reset UI confirmation state.');
assert.match(pages, /matchKind.*literal\.toLocaleLowerCase\(\).*selected\.name\.toLocaleLowerCase/, 'Explicit canonical mapping must distinguish exact wording from an alias.');
assert.match(pages, /A link is not a live CareerCase integration or endorsement/);
assert.doesNotMatch(pages, /\/demo\//);
assert.doesNotMatch(pages, /hiring probability|candidate rank|automatic rejection|riasec|private aspiration|counselor context/i);

for (const rpc of [
  'list_published_development_programs',
  'list_managed_development_programs',
  'get_managed_development_program_version',
  'save_development_program_draft',
  'publish_development_program_version',
]) assert.match(service, new RegExp(`\\.rpc\\(['"]${rpc}['"]`));
assert.doesNotMatch(service, /\.from\(/, 'Production development-program service must use bounded RPCs rather than partial table writes.');
assert.match(service, /review-required program target cannot be confirmed/i);
assert.match(service, /trusted canonical skill catalog/i);

assert.match(mapping, /canonicalResolution\.state === 'resolved'/);
assert.match(mapping, /canonicalSkillId/);
assert.match(mapping, /CareerCase will not guess a program filter/);
assert.match(mapping, /requirement\.state === 'UNKNOWN'[\s\S]*kind: 'PROVE_EXISTING'/);
assert.doesNotMatch(mapping.match(/requirement\.state === 'UNKNOWN'[\s\S]*?\n  }/)?.[0] ?? '', /kind: 'LEARN'/, 'UNKNOWN must not be converted into a learning prescription.');
assert.match(plan, /Explore exact-linked programs/);
assert.match(plan, /No automatic program filter is offered because this requirement lacks an authoritative canonical skill resolution/);

assert.match(migration, /create table sih26044\.development_programs/);
assert.match(migration, /create table sih26044\.development_program_versions/);
assert.match(migration, /create table sih26044\.development_program_skill_targets/);
assert.match(migration, /review_required[\s\S]*human_confirmed = false/);
assert.match(migration, /Published development-program versions are immutable/);
assert.match(migration, /current_actor := sih26044\.current_actor_id\(\)/);
assert.match(migration, /array\['faculty', 'institution_admin', 'industry_partner'\]/);
assert.match(migration, /confirmation_method_text not in \('structured_human_entry', 'ai_assisted_review', 'connector_review'\)/);
assert.match(migration, /Every published development-program target must be explicitly human-reviewed/);
assert.match(migration, /requested_canonical_skill_id[\s\S]*t\.canonical_skill_id = requested_canonical_skill_id/);
assert.match(migration, /automaticEnrollment', false/);
assert.match(migration, /automaticEvidence', false/);
assert.match(migration, /revoke insert, update, delete on sih26044\.development_programs from authenticated/);
assert.match(migration, /never fuzzy learner ranking or inferred suitability/i);

const sqlAssertionCount = (sql.match(/^select pg_temp\.assert_(?:true|blocked)\(/gm) ?? []).length;
assert.ok(sqlAssertionCount >= 18, `Expected at least 18 development-program SQL assertions, found ${sqlAssertionCount}.`);
for (const boundary of [
  'authorized provider author creates exactly version 1 draft',
  'does not implicitly publish',
  'review-required target blocks publication',
  'controlled-fixture confirmation cannot enter production',
  'unrelated tenant cannot author a program',
  'exact canonical skill linkage',
  'literal unresolved target is never guessed',
  'cannot mutate a published development-program version',
  'successor authoring allocates version 2',
  'published v1 remains authoritative',
  'requiring fresh explicit human confirmation',
  'never mint learner evidence automatically',
]) assert.match(sql, new RegExp(boundary, 'i'));

console.log(JSON.stringify({
  developmentPrograms: 'versioned_human_published_catalog',
  kinds: ['training', 'certification', 'workshop', 'mentorship'],
  canonicalLinkage: 'resolved_skill_id_exact_only',
  unresolvedLanguage: 'literal_no_guessing',
  successorReconfirmation: true,
  automaticEnrollment: false,
  automaticEvidence: false,
  providerRanking: false,
  executableSqlAssertions: sqlAssertionCount,
  failures: [],
}, null, 2));
