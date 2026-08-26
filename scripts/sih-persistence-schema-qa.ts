import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const migrationsRoot = join(repositoryRoot, 'supabase', 'migrations');
const testsPath = join(repositoryRoot, 'supabase', 'tests', 'sih26044_rls.sql');
const packagePath = join(repositoryRoot, 'package.json');
const ciPath = join(repositoryRoot, '.github', 'workflows', 'ci.yml');
const configPath = join(repositoryRoot, 'supabase', 'config.toml');

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
  '202608260009_verifier_and_storage_rls_fix.sql',
  '202608260010_consent_and_helper_hardening.sql',
  '202608260011_d2_trusted_readiness_persistence.sql',
  '202608260012_d2_foundation_trusted_persistence.sql',
  '202608260013_worker_consent_active_grant.sql',
  '202608260014_foundation_freeze_hardening.sql',
  '202608260015_foundation_freeze_final_consistency.sql',
  '202608260016_foundation_freeze_execution_fix.sql',
  '202608260017_foundation_rpc_surface_repair.sql',
  '202608260018_readiness_projection_runtime_fix.sql',
]);

const migrationSources = await Promise.all(migrationFiles.map(async file => ({
  file,
  source: await readFile(join(migrationsRoot, file), 'utf8'),
})));
const sql = migrationSources.map(item => item.source).join('\n');
const normalizedSql = sql.replace(/--.*$/gm, '');
const hardeningSql = migrationSources.find(item => item.file.endsWith('007_security_integrity_hardening.sql'))?.source ?? '';
const finalHardeningSql = migrationSources.find(item => item.file.endsWith('008_artifact_and_confirmation_hardening.sql'))?.source ?? '';
const d2ReadinessSql = migrationSources.find(item => item.file.endsWith('011_d2_trusted_readiness_persistence.sql'))?.source ?? '';
const d2FoundationSql = migrationSources.find(item => item.file.endsWith('012_d2_foundation_trusted_persistence.sql'))?.source ?? '';
const d2ConsentGrantSql = migrationSources.find(item => item.file.endsWith('013_worker_consent_active_grant.sql'))?.source ?? '';
const finalRpcRepairSql = migrationSources.find(item => item.file.endsWith('017_foundation_rpc_surface_repair.sql'))?.source ?? '';
const finalProjectionRuntimeSql = migrationSources.find(item => item.file.endsWith('018_readiness_projection_runtime_fix.sql'))?.source ?? '';
const localConfig = await readFile(configPath, 'utf8');

const createdTables = [...normalizedSql.matchAll(/create\s+table(?:\s+if\s+not\s+exists)?\s+sih26044\.([a-z0-9_]+)/gi)]
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
  'readiness_input_snapshots',
  'evidence_derivations',
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
for (const trustedWriteTable of [
  'readiness_input_snapshots',
  'evidence_derivations',
  'readiness_subject_facts',
  'readiness_evidence_projections',
]) {
  assert.deepEqual(activeInsertPolicies(trustedWriteTable), [], `${trustedWriteTable} must be a trusted-write boundary`);
  assert.doesNotMatch(normalizedSql, new RegExp(`grant\\s+insert\\s+on\\s+sih26044\\.${trustedWriteTable}\\s+to\\s+authenticated`, 'i'));
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
const hardenedStorageDelete = activeStoragePolicies.find(policy =>
  /for\s+delete\b/i.test(policy) &&
  (/career-evidence-private/i.test(policy) || /sih_private_evidence_delete/i.test(policy))
);
assert.ok(hardenedStorageDelete);
assert.match(hardenedStorageDelete, /(not\s+exists[\s\S]*?sih26044\.artifacts|sih26044\.is_orphan_evidence_object)/i,
  'Storage DELETE must prove that an upload is not registered as an artifact (direct NOT EXISTS or SECURITY DEFINER helper)');
assert.match(normalizedSql, /trigger\s+protect_artifact_core_metadata/i,
  'Artifact core identity and fingerprint immutability trigger must remain installed');
assert.match(normalizedSql, /new\.integrity_fingerprint[\s\S]*?old\.integrity_fingerprint/i,
  'Artifact integrity fingerprint must remain protected from later mutation');

const requiredTables = [
  'actors', 'organizations', 'organization_memberships', 'organization_membership_roles',
  'opportunities', 'opportunity_versions', 'opportunity_requirements', 'eligibility_rules',
  'evidence_records', 'artifacts', 'evidence_artifact_links', 'verification_requests',
  'verification_events', 'opportunity_readiness_results', 'readiness_input_snapshots',
  'evidence_derivations', 'consent_grants', 'consent_lifecycle_events', 'applications',
  'application_snapshots', 'application_snapshot_evidence', 'application_snapshot_consents',
  'application_events', 'outcome_events', 'collaboration_engagements', 'audit_events',
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
  'has_prohibited_json_keys',
  'materialize_readiness_subject_facts',
  'save_readiness_evidence_projection',
  'register_trusted_artifact',
  'update_artifact_scan_status',
  'derive_artifact_backed_evidence',
  'create_application_snapshot',
  'record_authoritative_audit',
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

// D2: narrow trusted readiness boundary and deterministic idempotency.
assert.match(localConfig, /schemas\s*=\s*\[\s*"public"\s*,\s*"storage"\s*,\s*"graphql_public"\s*,\s*"sih26044"\s*\]/,
  'Local PostgREST must add sih26044 without removing the normal exposed schemas');
assert.match(d2ReadinessSql, /create\s+or\s+replace\s+function\s+sih26044\.persist_trusted_readiness_result/i);
assert.match(d2ReadinessSql, /security\s+definer[\s\S]*?set\s+search_path\s*=\s*pg_catalog\s*,\s*sih26044/i);
assert.match(d2FoundationSql, /revoke\s+all\s+on\s+function\s+sih26044\.persist_trusted_readiness_result[\s\S]*?from\s+public\s*,\s*anon\s*,\s*authenticated/i);
assert.match(d2FoundationSql, /grant\s+execute\s+on\s+function\s+sih26044\.persist_trusted_readiness_result[\s\S]*?to\s+service_role/i);
assert.doesNotMatch(d2FoundationSql, /grant\s+(?:all|insert|update|delete)[\s\S]*?to\s+service_role/i,
  'D2 elevated role must not receive direct custom-schema mutation privileges');
assert.match(finalRpcRepairSql, /drop\s+function\s+if\s+exists\s+sih26044\.persist_trusted_readiness_result\s*\([\s\S]*?timestamptz\s*\)/i,
  'The obsolete pre-canonical-input readiness RPC overload must be removed');
assert.match(finalRpcRepairSql, /drop\s+function\s+if\s+exists\s+sih26044\.derive_artifact_backed_evidence\s*\([\s\S]*?uuid\s*,\s*text\s*,\s*text\s*,\s*uuid\s*,\s*text\s*\)/i,
  'The obsolete eight-argument artifact derivation overload must be removed');
assert.match(finalRpcRepairSql, /drop\s+function\s+if\s+exists\s+sih26044\.create_application_snapshot\s*\([\s\S]*?timestamptz\s*\)/i,
  'The obsolete client-shaped snapshot overload must be removed');
assert.match(finalRpcRepairSql, /on\s+conflict\s+do\s+nothing/i,
  'The canonical artifact derivation repair must avoid a named PL/pgSQL conflict target');
assert.match(finalRpcRepairSql, /'artifact_backed'\s*,\s*'unverified'/i,
  'Artifact derivation must preserve provenance/verification separation');

// Migration 018 is the final canonical save_readiness_evidence_projection implementation.
const canonicalProjectionFunc = finalProjectionRuntimeSql.match(
  /create\s+or\s+replace\s+function\s+sih26044\.save_readiness_evidence_projection[\s\S]*?\$\$\s*;/i,
)?.[0] ?? '';
assert.ok(canonicalProjectionFunc, 'Migration 018 must define the final canonical projection RPC');
assert.match(canonicalProjectionFunc, /p_proficiency\s+smallint/i);
assert.match(canonicalProjectionFunc, /p_capability_assertion\s+sih26044\.readiness_capability_assertion/i);
assert.match(canonicalProjectionFunc, /p_directness\s+sih26044\.readiness_evidence_directness/i);
assert.match(canonicalProjectionFunc, /v_existing\.evidence_record_id\s+is\s+not\s+null/i);
assert.doesNotMatch(canonicalProjectionFunc, /v_existing\.id\b/i);
assert.match(canonicalProjectionFunc, /p_confirmed_by_actor_id\s+is\s+null\s+or\s+p_confirmed_by_actor_id\s*<>\s*p_subject_actor_id/i);
assert.match(canonicalProjectionFunc, /confirming_actor\.status\s*=\s*'active'/i);
assert.match(canonicalProjectionFunc, /p_confirmation_method\s+not\s+in\s*\(\s*'structured_human_entry'\s*,\s*'ai_assisted_review'\s*\)/i);
for (const field of [
  'subject_actor_id', 'requirement_id', 'skill_id', 'literal_skill_label',
  'literal_requirement_wording', 'proficiency', 'experience_years',
  'capability_assertion', 'directness', 'observed_at', 'human_confirmed',
  'confirmed_by_actor_id', 'confirmation_method',
]) {
  assert.match(canonicalProjectionFunc, new RegExp(`v_existing\\.${field}\\s+is\\s+distinct\\s+from`, 'i'),
    `Canonical projection retry must compare immutable field ${field} null-safely`);
}
assert.match(canonicalProjectionFunc, /perform\s+sih26044\.record_authoritative_audit\s*\(/i);
const compactProjectionRuntimeSql = finalProjectionRuntimeSql.replace(/\s+/g, '').toLowerCase();
const compactProjectionSignature = 'sih26044.save_readiness_evidence_projection(uuid,uuid,uuid,text,text,text,smallint,numeric,sih26044.readiness_capability_assertion,sih26044.readiness_evidence_directness,timestamptz,uuid,text)';
assert.ok(compactProjectionRuntimeSql.includes(`revokeallonfunction${compactProjectionSignature}frompublic,anon,authenticated;`));
assert.ok(compactProjectionRuntimeSql.includes(`grantexecuteonfunction${compactProjectionSignature}toservice_role;`));
assert.doesNotMatch(finalProjectionRuntimeSql, /grant\s+execute\s+on\s+function\s+sih26044\.save_readiness_evidence_projection[\s\S]*?to\s+(?:public|anon|authenticated)\b/i);

// D2 Foundation: recursive key check, input snapshots, derivations, artifacts, audit
assert.match(d2FoundationSql, /create\s+or\s+replace\s+function\s+sih26044\.has_prohibited_json_keys/i);
assert.match(d2FoundationSql, /create\s+table\s+if\s+not\s+exists\s+sih26044\.readiness_input_snapshots/i);
assert.match(d2FoundationSql, /create\s+table\s+if\s+not\s+exists\s+sih26044\.evidence_derivations/i);
assert.match(d2FoundationSql, /create\s+or\s+replace\s+function\s+sih26044\.materialize_readiness_subject_facts/i);
assert.match(d2FoundationSql, /create\s+or\s+replace\s+function\s+sih26044\.save_readiness_evidence_projection/i);
assert.match(d2FoundationSql, /create\s+or\s+replace\s+function\s+sih26044\.register_trusted_artifact/i);
assert.match(d2FoundationSql, /create\s+or\s+replace\s+function\s+sih26044\.update_artifact_scan_status/i);
assert.match(d2FoundationSql, /create\s+or\s+replace\s+function\s+sih26044\.derive_artifact_backed_evidence/i);
assert.match(d2FoundationSql, /create\s+or\s+replace\s+function\s+sih26044\.create_application_snapshot/i);
assert.match(d2FoundationSql, /create\s+or\s+replace\s+function\s+sih26044\.record_authoritative_audit/i);
assert.match(d2FoundationSql, /audit_events_principal_check/i);

// Migration 013: is_consent_active must be callable by service_role for the Worker trusted path,
// while remaining blocked for browser (authenticated/anon) callers.
assert.match(d2ConsentGrantSql, /grant\s+execute\s+on\s+function\s+sih26044\.is_consent_active\s*\(\s*uuid\s*,\s*uuid\s*,\s*uuid\s*,\s*sih26044\.consent_purpose\s*\)\s+to\s+service_role/i,
  'Migration 013 must grant is_consent_active to service_role for the Worker application-snapshot path');
assert.doesNotMatch(d2ConsentGrantSql, /grant\s+execute\s+on\s+function\s+sih26044\.is_consent_active[\s\S]*?to\s+(?:authenticated|anon|public)\b/i,
  'Migration 013 must not re-grant is_consent_active to browser or anonymous roles');

// Migration 014: revoke broad service_role SELECT grant (replaced with targeted function-level grants).
// The broad GRANT SELECT ON ALL TABLES IN SCHEMA sih26044 TO service_role from migration 013
// created excessive privilege -- Worker uses targeted RPCs, not direct table reads.
const hardeningSql014 = migrationSources.find(item => item.file.endsWith('014_foundation_freeze_hardening.sql'))?.source ?? '';
assert.match(hardeningSql014, /revoke\s+select\s+on\s+all\s+tables\s+in\s+schema\s+sih26044\s+from\s+service_role/i,
  'Migration 014 must revoke the broad service_role SELECT grant from migration 013');
assert.doesNotMatch(hardeningSql014, /grant\s+select\s+on\s+all\s+tables\s+in\s+schema\s+sih26044\s+to\s+service_role/i,
  'Migration 014 must not re-introduce broad service_role SELECT grant');

const d2InputTableSql = [...normalizedSql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?sih26044\.readiness_(?:subject_facts|evidence_projections|input_snapshots)[\s\S]*?\n\);/gi)]
  .map(match => match[0]).join('\n');
assert.doesNotMatch(d2InputTableSql, /riasec|work_values|aspiration|counselor_history|private_guidance/i,
  'D2 readiness input tables must not represent private Engine A/guidance fields');

// Migration 010 hardening: canonical consent semantics and explicit privileges
const allCanVerifyEvidenceFuncs = [...normalizedSql.matchAll(
  /create\s+or\s+replace\s+function\s+sih26044\.can_verify_evidence[\s\S]*?\$\$\s*;/gi
)];
const canVerifyEvidenceFunc = allCanVerifyEvidenceFuncs[allCanVerifyEvidenceFuncs.length - 1]?.[0];
assert.ok(canVerifyEvidenceFunc, 'can_verify_evidence helper must exist');
assert.match(canVerifyEvidenceFunc, /sih26044\.is_consent_active\s*\(/i,
  'can_verify_evidence must delegate to canonical is_consent_active, not duplicate consent logic');
assert.doesNotMatch(canVerifyEvidenceFunc, /cg\.(status|revoked_at)/i,
  'can_verify_evidence must not reference non-existent consent_grants.status or revoked_at columns');

assert.match(normalizedSql, /revoke\s+all\s+on\s+function\s+sih26044\.can_verify_evidence\s*\(\s*uuid\s*\)\s+from\s+public/i,
  'can_verify_evidence must have explicit PUBLIC revoke');
assert.match(normalizedSql, /grant\s+execute\s+on\s+function\s+sih26044\.can_verify_evidence\s*\(\s*uuid\s*\)\s+to\s+authenticated/i,
  'can_verify_evidence must grant EXECUTE only to authenticated');
assert.match(normalizedSql, /revoke\s+all\s+on\s+function\s+sih26044\.is_orphan_evidence_object\s*\(\s*text\s*,\s*text\s*\)\s+from\s+public/i,
  'is_orphan_evidence_object must have explicit PUBLIC revoke');
assert.match(normalizedSql, /grant\s+execute\s+on\s+function\s+sih26044\.is_orphan_evidence_object\s*\(\s*text\s*,\s*text\s*\)\s+to\s+authenticated/i,
  'is_orphan_evidence_object must grant EXECUTE only to authenticated');

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
  'assigned verifier can read exactly requested evidence',
  'assigned verifier cannot read evidence after consent expires',
  'assigned verifier still cannot browse unrelated evidence after consent expires',
  'assigned verifier cannot append verification event after consent expires',
];
for (const claim of requiredRlsTestClaims) assert.match(rlsTests, new RegExp(claim, 'i'));

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
  requiredStorageApiBehaviors: 8,
  databaseExecution: 'not_performed_by_static_qa',
  failures: [],
}, null, 2));
