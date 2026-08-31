import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const [routes, pages, reads, authoring, authoringSql, versioningSql] = await Promise.all([
  readFile(join(root, 'src/app/routes.ts'), 'utf8'),
  readFile(join(root, 'src/app/sih/SihIndustryProductionPages.tsx'), 'utf8'),
  readFile(join(root, 'src/app/services/sih/productionOpportunityReads.ts'), 'utf8'),
  readFile(join(root, 'src/app/services/sih/productionOpportunityAuthoring.ts'), 'utf8'),
  readFile(join(root, 'supabase/migrations/20260830134000_atomic_opportunity_draft_authoring.sql'), 'utf8'),
  readFile(join(root, 'supabase/tests/sih26044_opportunity_version_edit.sql'), 'utf8'),
]);

assert.match(routes, /industry\/opportunities\/:opportunityVersionId\/edit[\s\S]*IndustryEditOpportunityPage/,
  'Exact opportunity-version edit route is missing.');
assert.match(pages, /to=\{`\/industry\/opportunities\/\$\{row\.versionId\}\/edit`\}/,
  'Opportunity management list must hand off the exact version id to edit/version management.');
assert.match(pages, /Edit exact draft/);
assert.match(pages, /Create successor draft/);
assert.match(pages, /Published versions are never mutated|published versions are never mutated/i);
assert.match(pages, /clears requirement and eligibility confirmation traces/i,
  'Successor versioning must visibly require high-impact human reconfirmation.');
assert.match(pages, /clearRequirementConfirmation/);
assert.match(pages, /clearEligibilityConfirmation/);
assert.match(pages, /opportunityVersionId:\s*bundle\.version\.id/,
  'Draft edits must target the exact persisted version id.');
assert.match(pages, /opportunityId:\s*bundle\.opportunityId[\s\S]*basics:\s*draft\.basics/,
  'Successor draft creation must retain stable opportunity identity.');

assert.match(reads, /getManageableVersion\(/,
  'Production read boundary must load one exact version for authoring.');
assert.match(reads, /\.eq\('id', opportunityVersionId\)/,
  'Manageable version lookup must be exact-id bound.');
assert.match(reads, /versionRow\.status !== 'draft' && versionRow\.status !== 'published'/,
  'Authoring UI must reject unsupported version lifecycle states.');

assert.match(authoring, /requested_opportunity_id:\s*input\.opportunityId \?\? null/);
assert.match(authoring, /requested_version_id:\s*input\.opportunityVersionId \?\? null/);
assert.match(authoringSql, /if target_version_status <> 'draft' then[\s\S]*Published opportunity versions are immutable; create a new draft version/,
  'Server write boundary must refuse in-place edits of published versions.');
assert.match(authoringSql, /if requested_version_id is null then[\s\S]*coalesce\(max\(v\.version_number\), 0\) \+ 1/,
  'Server write boundary must allocate a successor version number when version id is omitted.');
assert.match(authoringSql, /for update/,
  'Opportunity version mutation/version allocation must retain row-lock authority.');

const sqlAssertionCount = (versioningSql.match(/^(?:select|\s+perform) pg_temp\.assert_(?:true|blocked)\(/gm) ?? []).length;
assert.ok(sqlAssertionCount >= 10, `Expected at least 10 version-edit SQL assertions, found ${sqlAssertionCount}.`);
assert.match(versioningSql, /editing a persisted draft keeps exact version identity/i);
assert.match(versioningSql, /published version cannot be edited through save_opportunity_draft/i);
assert.match(versioningSql, /successor creation allocates version 2/i);
assert.match(versioningSql, /high-impact confirmation is not inherited automatically/i);
assert.match(versioningSql, /does not change the authoritative current published version/i);
assert.match(versioningSql, /cross-tenant recruiter cannot edit successor draft/i);

console.log(JSON.stringify({
  productionRoute: '/industry/opportunities/:opportunityVersionId/edit',
  editableLifecycleState: 'draft',
  publishedMutation: false,
  successorVersioning: true,
  stableOpportunityIdentity: true,
  confirmationInheritedAutomatically: false,
  exactVersionAuthority: true,
  crossTenantWrites: false,
  executableSqlAssertions: sqlAssertionCount,
  failures: [],
}, null, 2));
