import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const migrationsRoot = join(repositoryRoot, 'supabase', 'migrations');
const testsPath = join(repositoryRoot, 'supabase', 'tests', 'sih26044_rls.sql');
const packagePath = join(repositoryRoot, 'package.json');
const ciPath = join(repositoryRoot, '.github', 'workflows', 'ci.yml');

const migrationFiles = (await readdir(migrationsRoot))
  .filter(file => file.endsWith('.sql'))
  .sort();
assert.deepEqual(migrationFiles, [
  '202608260001_identity_tenancy.sql',
  '202608260002_opportunities.sql',
  '202608260003_evidence_readiness_consent.sql',
  '202608260004_applications_outcomes_collaboration_audit.sql',
  '202608260005_rls_authorization.sql',
  '202608260006_private_storage.sql',
]);

const migrationSources = await Promise.all(migrationFiles.map(async file => ({
  file,
  source: await readFile(join(migrationsRoot, file), 'utf8'),
})));
const sql = migrationSources.map(item => item.source).join('\n');
const normalizedSql = sql.replace(/--.*$/gm, '');

const createdTables = [...normalizedSql.matchAll(/create\s+table\s+sih26044\.([a-z0-9_]+)/gi)]
  .map(match => match[1]);
assert.ok(createdTables.length >= 30, 'Expected normalized SIH26044 production tables');
for (const table of createdTables) {
  assert.match(
    normalizedSql,
    new RegExp(`alter\\s+table\\s+sih26044\\.${table}\\s+enable\\s+row\\s+level\\s+security`, 'i'),
    `Sensitive table sih26044.${table} must enable RLS`,
  );
}

const policyStatements = [...normalizedSql.matchAll(/create\s+policy\s+[a-z0-9_]+[\s\S]*?;/gi)]
  .map(match => match[0]);
assert.ok(policyStatements.length > 30, 'Expected explicit least-privilege RLS policies');
for (const policy of policyStatements) {
  assert.doesNotMatch(policy, /\busing\s*\(\s*true\s*\)|\bwith\s+check\s*\(\s*true\s*\)/i,
    `Unconditional SIH policy is prohibited: ${policy.slice(0, 120)}`);
}

const evidencePolicies = policyStatements.filter(policy => /on\s+sih26044\.evidence_records\b/i.test(policy));
assert.equal(
  evidencePolicies.some(policy => /recruiter|industry_partner/i.test(policy)),
  false,
  'Recruiters/industry partners must never receive a raw evidence_records policy',
);
assert.ok(evidencePolicies.some(policy => /assigned_verifier/i.test(policy)),
  'Exact assigned-verifier evidence access must remain explicit');

const appendOnlyTables = [
  'evidence_records',
  'verification_events',
  'opportunity_readiness_results',
  'consent_grants',
  'consent_lifecycle_events',
  'application_snapshots',
  'application_events',
  'outcome_events',
  'audit_events',
];
for (const table of appendOnlyTables) {
  const unsafePolicies = policyStatements.filter(policy =>
    new RegExp(`on\\s+sih26044\\.${table}\\b`, 'i').test(policy)
    && /for\s+(update|delete)\b/i.test(policy));
  assert.deepEqual(unsafePolicies, [], `${table} must not have UPDATE/DELETE RLS policies`);
  assert.match(normalizedSql, new RegExp(`trigger\\s+[a-z0-9_]*${table.replace(/s$/, '')}[a-z0-9_]*_immutable|trigger\\s+protect_finalized_snapshot`, 'i'),
    `${table} requires a database-level immutability trigger`);
}

const prohibitedColumn = /^\s*(candidate_rank|hiring_probability|success_probability|employability_score|opaque_fit_score|fit_score|readiness_percentage|trust_score|confidence_score)\s+/gim;
assert.doesNotMatch(normalizedSql, prohibitedColumn,
  'Prohibited ranking, probability, percentage, or universal trust columns detected');
assert.doesNotMatch(normalizedSql, /\bautomatic_(rejection|shortlist)|\bauto_(reject|shortlist)/i,
  'Automatic rejection/shortlisting database mechanisms are prohibited');

assert.match(normalizedSql, /values\s*\(\s*'career-evidence-private'\s*,\s*'career-evidence-private'\s*,\s*false\b/i,
  'Private evidence bucket must be declared non-public');
assert.doesNotMatch(normalizedSql, /career-evidence-private[\s\S]{0,120}\btrue\b/i,
  'Private evidence bucket must never be public');
assert.match(normalizedSql, /storage\.foldername\(name\)[\s\S]{0,120}current_actor_id/i,
  'Storage policies must bind the first path segment to the current actor');
assert.doesNotMatch(normalizedSql, /recruiter[\s\S]{0,160}on\s+storage\.objects/i,
  'Recruiters must not receive generic evidence object access');

const requiredTables = [
  'actors', 'organizations', 'organization_memberships', 'organization_membership_roles',
  'opportunities', 'opportunity_versions', 'opportunity_requirements', 'eligibility_rules',
  'evidence_records', 'artifacts', 'evidence_artifact_links', 'verification_requests',
  'verification_events', 'opportunity_readiness_results', 'consent_grants',
  'consent_lifecycle_events', 'applications', 'application_snapshots',
  'application_snapshot_evidence', 'application_snapshot_consents', 'application_events',
  'outcome_events', 'collaboration_engagements', 'audit_events',
];
for (const table of requiredTables) {
  assert.ok(createdTables.includes(table), `Required production table missing: ${table}`);
}

const requiredHelpers = [
  'current_actor_id',
  'has_active_organization_role',
  'is_consent_active',
  'publish_opportunity_version',
  'current_scoped_verification_state',
  'current_application_stage',
  'finalize_application_snapshot',
  'can_recruiter_read_application',
  'can_access_verification_request',
];
for (const helper of requiredHelpers) {
  assert.match(normalizedSql, new RegExp(`create\\s+or\\s+replace\\s+function\\s+sih26044\\.${helper}\\b`, 'i'),
    `Required authorization/integrity helper missing: ${helper}`);
}

const securityDefinerFunctions = [...normalizedSql.matchAll(
  /create\s+or\s+replace\s+function\s+sih26044\.([a-z0-9_]+)[\s\S]*?security\s+definer[\s\S]*?as\s+\$\$[\s\S]*?\$\$\s*;/gi,
)];
assert.ok(securityDefinerFunctions.length >= 10, 'Expected narrow SECURITY DEFINER helpers');
for (const match of securityDefinerFunctions) {
  assert.match(match[0], /set\s+search_path\s*=\s*pg_catalog\s*,\s*sih26044(?:\s*,\s*extensions)?/i,
    `SECURITY DEFINER helper ${match[1]} needs an explicit safe search_path`);
  assert.doesNotMatch(match[0], /select\s+\*\s+from\s+sih26044\.organization_memberships/i,
    `Authorization helper ${match[1]} must return minimum information, not membership rows`);
}
assert.doesNotMatch(normalizedSql, /is_(?:super_?)?admin|admin_bypass|bypass_rls/i,
  'Universal administrator bypass helpers are prohibited');

assert.match(normalizedSql, /all consumed requirements and eligibility rules need complete human confirmation/i);
assert.match(normalizedSql, /published opportunity versions are immutable/i);
assert.match(normalizedSql, /extensions\.digest\([\s\S]*?'sha256'/i,
  'Application snapshot integrity fingerprint must be content-derived using SHA-256');
assert.match(normalizedSql, /not a digital signature/i);
assert.match(normalizedSql, /current_application_stage\(a\.id\)\s+not\s+in\s*\(\s*'saved'\s*,\s*'preparing'\s*\)/i,
  'Recruiter authorization must exclude saved/preparing applications');
assert.match(normalizedSql, /policy_program_analyst/i);
assert.doesNotMatch(policyStatements.join('\n'), /policy_program_analyst/i,
  'Policy/program analyst must receive no individual-row policy');

assert.doesNotMatch(sql, /SUPABASE_SERVICE_ROLE_KEY|service_role_key\s*=|eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/,
  'Service-role keys, JWTs, and secrets must not appear in migrations');
assert.doesNotMatch(sql, /src\/app\/demo|controlled-demo-fingerprint|DemoSih/i,
  'Persistence migrations must not modify or depend on the controlled demo boundary');

const packageJson = JSON.parse(await readFile(packagePath, 'utf8')) as { scripts?: Record<string, string> };
assert.equal(packageJson.scripts?.['qa:demo-isolation'], 'tsx scripts/demo-isolation-qa.ts',
  'Controlled demo isolation QA command must remain intact');
assert.equal(packageJson.scripts?.['qa:sih-persistence-schema'], 'tsx scripts/sih-persistence-schema-qa.ts');
const ciSource = await readFile(ciPath, 'utf8');
assert.match(ciSource, /npm run qa:sih-persistence-schema/);

const rlsTests = await readFile(testsPath, 'utf8');
const requiredRlsTestClaims = [
  'learner A cannot read learner B evidence',
  'learner A cannot read learner B readiness',
  'recruiter cannot browse the learner evidence ledger',
  'recruiter cannot read saved/unsubmitted application',
  'own-organization recruiter can read submitted consented application',
  'organization B recruiter cannot read organization A application',
  'assigned verifier can read exactly requested evidence',
  'unrelated verifier cannot read requested evidence',
  'policy analyst cannot read individual evidence',
  'published opportunity version cannot be mutated',
  'verification history cannot be updated',
  'application history cannot be deleted',
  'finalized application snapshot cannot be updated',
  'readiness history cannot be deleted',
  'outcome history cannot be updated',
  'audit history cannot be deleted',
  'evidence bucket is private',
  'one actor cannot read another actor private storage object',
];
for (const claim of requiredRlsTestClaims) assert.match(rlsTests, new RegExp(claim, 'i'));

console.log(JSON.stringify({
  migrationsInspected: migrationFiles,
  sihTablesInspected: createdTables.length,
  policiesInspected: policyStatements.length,
  securityDefinerHelpersInspected: securityDefinerFunctions.length,
  rawRecruiterEvidencePolicies: 0,
  appendOnlyTablesChecked: appendOnlyTables.length,
  privateBucket: 'career-evidence-private',
  executableRlsClaimsAuthored: requiredRlsTestClaims.length,
  databaseExecution: 'not_performed_by_static_qa',
  failures: [],
}, null, 2));
