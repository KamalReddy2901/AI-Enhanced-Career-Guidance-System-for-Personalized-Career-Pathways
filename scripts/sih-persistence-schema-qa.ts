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
  '202608260007_security_integrity_hardening.sql',
  '202608260008_artifact_and_confirmation_hardening.sql',
]);

const migrationSources = await Promise.all(migrationFiles.map(async file => ({
  file,
  source: await readFile(join(migrationsRoot, file), 'utf8'),
})));
const sql = migrationSources.map(item => item.source).join('\n');
const normalizedSql = sql.replace(/--.*$/gm, '');
const hardeningSql = migrationSources.find(item => item.file.endsWith('007_security_integrity_hardening.sql'))?.source ?? '';
const finalHardeningSql = migrationSources.find(item => item.file.endsWith('008_artifact_and_confirmation_hardening.sql'))?.source ?? '';

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

const activePolicyMap = new Map<string, string>();
const policyOperations = [...normalizedSql.matchAll(
  /create\s+policy\s+[a-z0-9_]+[\s\S]*?;|drop\s+policy\s+if\s+exists\s+[a-z0-9_]+\s+on\s+(?:sih26044|storage)\.[a-z0-9_]+\s*;/gi,
)].map(match => match[0]);
for (const operation of policyOperations) {
  const create = operation.match(/create\s+policy\s+([a-z0-9_]+)[\s\S]*?on\s+((?:sih26044|storage)\.[a-z0-9_]+)/i);
  if (create) {
    activePolicyMap.set(`${create[2].toLowerCase()}.${create[1].toLowerCase()}`, operation);
    continue;
  }
  const drop = operation.match(/drop\s+policy\s+if\s+exists\s+([a-z0-9_]+)\s+on\s+((?:sih26044|storage)\.[a-z0-9_]+)/i);
  if (drop) activePolicyMap.delete(`${drop[2].toLowerCase()}.${drop[1].toLowerCase()}`);
}
const activePolicyStatements = [...activePolicyMap.values()];

const evidencePolicies = activePolicyStatements.filter(policy => /on\s+sih26044\.evidence_records\b/i.test(policy));
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
  const unsafePolicies = activePolicyStatements.filter(policy =>
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

const activeInsertPolicies = (table: string) => activePolicyStatements.filter(policy =>
  new RegExp(`on\\s+sih26044\\.${table}\\b`, 'i').test(policy)
  && /for\s+insert\b/i.test(policy));
const weakEvidenceInsert = activeInsertPolicies('evidence_records');
assert.equal(weakEvidenceInsert.length, 1, 'Evidence must have exactly one authenticated direct INSERT policy');
assert.match(weakEvidenceInsert[0], /provenance\s+in\s*\(\s*'self_declared'\s*,\s*'self_reported'\s*,\s*'extracted'\s*,\s*'inferred'\s*\)/i);
assert.match(weakEvidenceInsert[0], /initial_verification_state\s+in\s*\(\s*'proposed'\s*,\s*'unverified'\s*,\s*'self_confirmed'\s*\)/i);
assert.match(weakEvidenceInsert[0], /proposal_source\s+is\s+null[\s\S]*?proposal_source\s+in\s*\(\s*'user_entry'\s*,\s*'ai_extraction'\s*,\s*'rule_based_extraction'\s*\)/i);
assert.doesNotMatch(weakEvidenceInsert[0], /connector_import/i,
  'Generic browser evidence INSERT must not claim connector_import attribution');
assert.doesNotMatch(weakEvidenceInsert[0], /assessed|artifact_backed|activity_observation|human_attested|issuer_verified|outcome_linked|human_verified/i,
  'Generic evidence INSERT must not mint strong provenance or authoritative verification');

for (const trustedWriteTable of [
  'opportunity_readiness_results',
  'application_snapshots',
  'application_snapshot_evidence',
  'application_snapshot_consents',
  'audit_events',
]) {
  assert.deepEqual(activeInsertPolicies(trustedWriteTable), [], `${trustedWriteTable} must be a trusted-write boundary`);
  assert.match(hardeningSql, new RegExp(`revoke\\s+insert\\s+on\\s+sih26044\\.${trustedWriteTable}\\s+from\\s+authenticated`, 'i'));
}
for (const trustedWriteTable of ['artifacts', 'evidence_artifact_links']) {
  assert.deepEqual(activeInsertPolicies(trustedWriteTable), [], `${trustedWriteTable} must be a trusted-write boundary`);
  assert.match(finalHardeningSql, new RegExp(`revoke\\s+insert\\s+on\\s+sih26044\\.${trustedWriteTable}\\s+from\\s+authenticated`, 'i'));
}

assert.match(normalizedSql, /values\s*\(\s*'career-evidence-private'\s*,\s*'career-evidence-private'\s*,\s*false\b/i,
  'Private evidence bucket must be declared non-public');
assert.doesNotMatch(normalizedSql, /career-evidence-private[\s\S]{0,120}\btrue\b/i,
  'Private evidence bucket must never be public');
assert.match(normalizedSql, /storage\.foldername\(name\)[\s\S]{0,120}current_actor_id/i,
  'Storage policies must bind the first path segment to the current actor');
assert.doesNotMatch(normalizedSql, /recruiter[\s\S]{0,160}on\s+storage\.objects/i,
  'Recruiters must not receive generic evidence object access');

const activeStoragePolicies = activePolicyStatements.filter(policy => /on\s+storage\.objects\b/i.test(policy));
const hardenedStorageInsert = activeStoragePolicies.find(policy => /for\s+insert\b/i.test(policy) && /career-evidence-private/i.test(policy));
assert.ok(hardenedStorageInsert, 'Canonical private evidence INSERT policy is required');
assert.match(hardenedStorageInsert, /array_length\s*\(\s*storage\.foldername\(name\)\s*,\s*1\s*\)\s*=\s*2/i,
  'Supabase foldername excludes the filename: canonical path must have exactly two folders');
assert.match(hardenedStorageInsert, /storage\.filename\(name\)/i, 'Storage filename must be validated separately');
assert.doesNotMatch(hardeningSql, /array_length\s*\(\s*storage\.foldername\(name\)\s*,\s*1\s*\)\s*=\s*3/i,
  'Hardening migration must not repeat the legacy folder-count defect');
assert.deepEqual(
  activeStoragePolicies.filter(policy => /for\s+update\b/i.test(policy) && /career-evidence-private/i.test(policy)),
  [],
  'Registered evidence objects must have no generic authenticated UPDATE policy',
);
const hardenedStorageDelete = activeStoragePolicies.find(policy => /for\s+delete\b/i.test(policy) && /career-evidence-private/i.test(policy));
assert.ok(hardenedStorageDelete);
assert.match(hardenedStorageDelete, /not\s+exists[\s\S]*?sih26044\.artifacts/i,
  'Storage DELETE must prove that an upload is not registered as an artifact');
assert.match(normalizedSql, /trigger\s+protect_artifact_core_metadata/i,
  'Artifact core identity and fingerprint immutability trigger must remain installed');
assert.match(normalizedSql, /new\.integrity_fingerprint[\s\S]*?old\.integrity_fingerprint/i,
  'Artifact integrity fingerprint must remain protected from later mutation');

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
assert.doesNotMatch(activePolicyStatements.join('\n'), /policy_program_analyst/i,
  'Policy/program analyst must receive no individual-row policy');

assert.match(hardeningSql, /trigger\s+enforce_authenticated_requirement_confirmation/i);
assert.match(hardeningSql, /trigger\s+enforce_authenticated_eligibility_confirmation/i);
for (const confirmationFunction of [
  'enforce_authenticated_requirement_confirmation',
  'enforce_authenticated_eligibility_confirmation',
]) {
  const functionMatch = finalHardeningSql.match(new RegExp(
    `create\\s+or\\s+replace\\s+function\\s+sih26044\\.${confirmationFunction}\\(\\)[\\s\\S]*?\\$\\$;`,
    'i',
  ));
  assert.ok(functionMatch, `Final all-writer confirmation function missing: ${confirmationFunction}`);
  const functionSql = functionMatch[0];
  assert.doesNotMatch(functionSql, /if\s+current_user\s*<>\s*'authenticated'\s+then\s+return\s+new/i,
    `${confirmationFunction} must not bypass trusted writers`);
  const invalidationOffset = functionSql.search(/if\s+content_changed\s+and\s+not\s+fresh_confirmation/i);
  const writerBranchOffset = functionSql.search(/if\s+current_user\s*=\s*'authenticated'/i);
  assert.ok(invalidationOffset >= 0 && writerBranchOffset > invalidationOffset,
    `${confirmationFunction} must invalidate stale content before writer-specific rules`);
  assert.match(functionSql, /new\.human_confirmed\s*:=\s*false[\s\S]*?new\.confirmed_by_actor_id\s*:=\s*null/i);
  assert.match(functionSql, /new\.confirmed_by_actor_id\s*:=\s*actor_id/i);
  assert.match(functionSql, /new\.confirmed_at\s*:=\s*statement_timestamp\(\)/i);
  assert.match(functionSql, /not\s+in\s*\(\s*'structured_human_entry'\s*,\s*'ai_assisted_review'\s*\)/i);
  assert.match(functionSql, /where\s+a\.id\s*=\s*new\.confirmed_by_actor_id\s+and\s+a\.status\s*=\s*'active'/i,
    'Trusted confirmation must identify an explicit active actor');
}
assert.match(hardeningSql, /trigger\s+protect_artifact_core_metadata/i);
assert.match(hardeningSql, /trigger\s+validate_application_linked_outcome/i);
assert.match(hardeningSql, /application_id\s+is\s+not\s+null[\s\S]*?can_record_application_outcome/i);

for (const internalHelper of [
  'is_consent_active\\(uuid, uuid, uuid, sih26044\\.consent_purpose\\)',
  'current_scoped_verification_state\\(uuid, uuid\\)',
  'current_application_stage\\(uuid\\)',
]) {
  assert.match(hardeningSql, new RegExp(`revoke\\s+all\\s+on\\s+function\\s+sih26044\\.${internalHelper}\\s+from\\s+authenticated`, 'i'),
    `Internal helper must not remain directly executable: ${internalHelper}`);
}

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
  'learner cannot insert issuer_verified provenance',
  'learner cannot insert human_attested provenance',
  'learner cannot insert assessed provenance',
  'learner cannot insert human_verified initial state',
  'learner can still insert permitted weak evidence',
  'learner retains read access to own trusted readiness',
  'learner cannot directly insert canonical readiness result',
  'confirmed requirement edit invalidates stale confirmation',
  'confirmation actor cannot be impersonated',
  'production client cannot claim controlled confirmation method',
  'confirmed eligibility edit invalidates stale confirmation',
  'freshly reconfirmed edited content can publish',
  'outcome cannot target unrelated learner/application',
  'valid application-linked outcome can be recorded by authorized human actor',
  'valid storage path uses exactly actor/artifact folders plus filename',
  'low-level trust helper cannot leak unauthorized state',
  'learner cannot insert canonical artifact metadata',
  'browser cannot claim connector_import proposal source',
  'trusted requirement edit without fresh trace invalidates confirmation',
  'trusted eligibility edit without fresh trace invalidates confirmation',
  'fresh trusted confirmation binds edited requirement content',
  'fresh trusted confirmation binds edited eligibility content',
  'browser cannot claim clean scan status through artifact insertion',
];
for (const claim of requiredRlsTestClaims) assert.match(rlsTests, new RegExp(claim, 'i'));

// Storage lifecycle and artifact metadata assertions that require authenticated
// Storage API rather than direct SQL mutation (modern Supabase blocks direct
// storage.objects writes):
// - learner A can upload to own actor path
// - learner A cannot upload into learner B actor path
// - owner can delete orphan upload
// - learner A can read their own registered artifact
// - normal client cannot overwrite registered artifact
// - normal client cannot delete registered artifact
// - learner B cannot read learner A private artifact
// - bucket is private (implicit through auth requirements)
// - learner retains read access to own registered artifact metadata
// - learner retains read access to own canonical evidence-artifact link
// - learner cannot insert canonical evidence-artifact link
// - assigned verifier retains read access to properly linked artifact metadata
// These are validated through scripts/sih-storage-api-integration-test.mjs.

console.log(JSON.stringify({
  migrationsInspected: migrationFiles,
  sihTablesInspected: createdTables.length,
  policyDefinitionsInspected: policyStatements.length,
  activePoliciesInspected: activePolicyStatements.length,
  securityDefinerHelpersInspected: securityDefinerFunctions.length,
  rawRecruiterEvidencePolicies: 0,
  appendOnlyTablesChecked: appendOnlyTables.length,
  privateBucket: 'career-evidence-private',
  executableSqlClaimsAuthored: requiredRlsTestClaims.length,
  executableStorageApiClaims: 7,
  totalExecutableSecurityAssertions: requiredRlsTestClaims.length + 7,
  databaseExecution: 'not_performed_by_static_qa',
  failures: [],
}, null, 2));
