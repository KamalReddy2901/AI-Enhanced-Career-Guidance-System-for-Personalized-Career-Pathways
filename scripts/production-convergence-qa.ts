import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const [
  routes,
  runtime,
  pages,
  studentPages,
  recruiterPage,
  facultyPages,
  industryPages,
  institutionPage,
  opportunityReads,
  recruiterReads,
  facultyReads,
  institutionReads,
  opportunityAuthoring,
  authoringShell,
  facultyDetail,
  demo,
  migration,
  draftAuthoringMigration,
  institutionAnalyticsMigration,
  worker,
  config,
  applicationDal,
  applicationStudentDetail,
  applicationRecruiterPanel,
  applicationTimeline,
  applicationLifecycleMigration,
  trustedApiClient,
] = await Promise.all([
  readFile(join(root, 'src/app/routes.ts'), 'utf8'),
  readFile(join(root, 'src/app/sih/SihProductionContext.tsx'), 'utf8'),
  readFile(join(root, 'src/app/sih/SihProductionPages.tsx'), 'utf8'),
  readFile(join(root, 'src/app/sih/SihStudentProductionPages.tsx'), 'utf8'),
  readFile(join(root, 'src/app/sih/SihRecruiterProductionPage.tsx'), 'utf8'),
  readFile(join(root, 'src/app/sih/SihFacultyProductionPages.tsx'), 'utf8'),
  readFile(join(root, 'src/app/sih/SihIndustryProductionPages.tsx'), 'utf8'),
  readFile(join(root, 'src/app/sih/SihInstitutionProductionPage.tsx'), 'utf8'),
  readFile(join(root, 'src/app/services/sih/productionOpportunityReads.ts'), 'utf8'),
  readFile(join(root, 'src/app/services/sih/productionRecruiterReads.ts'), 'utf8'),
  readFile(join(root, 'src/app/services/sih/productionFacultyReads.ts'), 'utf8'),
  readFile(join(root, 'src/app/services/sih/productionInstitutionReads.ts'), 'utf8'),
  readFile(join(root, 'src/app/services/sih/productionOpportunityAuthoring.ts'), 'utf8'),
  readFile(join(root, 'src/app/components/sih/industry/OpportunityAuthoringShell.tsx'), 'utf8'),
  readFile(join(root, 'src/app/components/sih/faculty/FacultyCollaborationDetail.tsx'), 'utf8'),
  readFile(join(root, 'src/app/demo/DemoSihRuntime.tsx'), 'utf8'),
  readFile(join(root, 'supabase/migrations/20260830090000_submission_authority_and_resolution_state.sql'), 'utf8'),
  readFile(join(root, 'supabase/migrations/20260830134000_atomic_opportunity_draft_authoring.sql'), 'utf8'),
  readFile(join(root, 'supabase/migrations/20260830140000_institution_policy_aggregate_intelligence.sql'), 'utf8'),
  readFile(join(root, 'worker/src/sih/routes.ts'), 'utf8'),
  readFile(join(root, 'worker/wrangler.toml'), 'utf8'),
  readFile(join(root, 'src/app/services/sih/browserDal.ts'), 'utf8'),
  readFile(join(root, 'src/app/components/sih/student/application/StudentApplicationDetail.tsx'), 'utf8'),
  readFile(join(root, 'src/app/components/sih/recruiter/HumanStageActionPanel.tsx'), 'utf8'),
  readFile(join(root, 'src/app/components/sih/application/ApplicationRecruitmentTimeline.tsx'), 'utf8'),
  readFile(join(root, 'supabase/migrations/20260831100000_application_recruitment_lifecycle.sql'), 'utf8'),
  readFile(join(root, 'src/app/services/sih/SihTrustedApiClient.ts'), 'utf8'),
]);

for (const route of ['career','opportunities','evidence','verification','applications','industry/opportunities','industry/opportunities/new','industry/applicants','faculty','faculty/collaborations','institution','institution/skills-intelligence']) {
  assert.match(routes, new RegExp(`path:\\s*["']${route.replace('/', '\\/')}`), `Missing production route ${route}`);
}
assert.match(routes, /path:\s*["']opportunities\/:opportunityVersionId\/apply["']/);
assert.match(routes, /path:\s*["']faculty\/collaborations\/:collaborationId["']/);
assert.match(routes, /SihStudentProductionPages/);
assert.match(routes, /SihRecruiterProductionPage/);
assert.match(routes, /SihFacultyProductionPages/);
assert.match(routes, /SihIndustryProductionPages/);
assert.match(routes, /SihInstitutionProductionPage/);
assert.match(routes, /path:\s*["']\/demo["'][\s\S]*Component:\s*DemoSihRuntime/);
assert.doesNotMatch(demo, /GuidanceProvider|SihProductionRuntime|supabase/i, 'Controlled demo runtime must stay isolated');
assert.doesNotMatch(runtime, /GuidanceProvider|GuidanceContext|riasec|aspiration|work.?values/i, 'Engine B provider must not import private Engine A context');
assert.match(runtime, /organizations\(display_name\)/, 'Production membership context must read the canonical organization display_name column');
assert.doesNotMatch(runtime, /organizations\(name\)/, 'Production membership context must not query a non-existent organization name column');
for (const surface of [pages, studentPages, recruiterPage, recruiterReads, facultyPages, facultyReads, industryPages, opportunityAuthoring, institutionPage]) {
  assert.doesNotMatch(surface, /hiring_probability|candidate_rank|automatic_rejection|riasec|work.?values|private.?aspiration/i);
}

assert.match(studentPages, /UNKNOWN ≠ UNSKILLED/);
assert.match(studentPages, /OpportunityExplorer/);
assert.match(studentPages, /OpportunityDetail/);
assert.match(studentPages, /ReadinessCasefile/);
assert.match(studentPages, /GapClosurePlan/);
assert.match(studentPages, /ApplicationPreparationWorkspace/);
assert.match(studentPages, /ApplicationFinalizationPanel/);
assert.match(studentPages, /trustedApi\.recomputeReadiness/);
assert.match(studentPages, /gap-closure\?opportunityVersionId=/, 'Every canonical readiness casefile must expose the gap-closure plan, including UNKNOWN states');
assert.match(opportunityReads, /resolution_status\s*===\s*'review_required'/);
assert.match(opportunityReads, /reviewOnly:\s*true/);
assert.match(opportunityReads, /result_body/);

assert.match(recruiterPage, /RecruiterWorkspaceShell/);
assert.match(recruiterPage, /role\s*===\s*'recruiter'[\s\S]*role\s*===\s*'industry_partner'/);
assert.match(recruiterPage, /rejected_by_human/);
assert.match(recruiterReads, /\.eq\('to_stage',\s*'applied'\)/);
assert.match(recruiterReads, /application_snapshot_id/);
assert.match(recruiterReads, /validateNoProhibitedKeys/);
assert.doesNotMatch(recruiterReads, /latest|newest/i, 'Recruiter projection reads must resolve the exact submitted snapshot, never the newest one');

assert.match(facultyPages, /FacultyExplorer/);
assert.match(facultyPages, /FacultyCollaborationDetail/);
assert.match(facultyPages, /detailBasePath="\/faculty\/collaborations"/);
assert.match(facultyPages, /renderLocalWorkspace=\{false\}/, 'Production faculty detail must not render the synthetic local milestone workspace');
assert.doesNotMatch(facultyPages, /\/demo\/faculty/);
assert.match(facultyReads, /collaboration_engagements/);
assert.match(facultyReads, /collaboration_partner_organizations/);
assert.match(facultyReads, /collaboration_participants/);
assert.match(facultyReads, /collaboration_objectives/);
assert.match(facultyReads, /collaboration_engagement_events/);
assert.match(facultyPages, /Append-only production lifecycle/);
assert.match(facultyDetail, /renderLocalWorkspace\s*=\s*true/, 'Reusable detail may keep the controlled demo workspace only behind an explicit prop');

assert.match(industryPages, /OpportunityAuthoringShell/);
assert.match(industryPages, /ProductionOpportunityAuthoring/);
assert.match(industryPages, /canonicalSkillOptions/);
assert.match(industryPages, /dal\.publishOpportunityVersion/);
assert.match(authoringShell, /onSaveDraft/);
assert.match(authoringShell, /Save draft|Create draft/);
assert.match(authoringShell, /publishDisabled=\{isDirty \|\| isSaving/);
assert.match(opportunityAuthoring, /save_opportunity_draft/);
assert.match(opportunityAuthoring, /resolutionStatus:\s*'review_required'/);
assert.match(opportunityAuthoring, /reviewOnly:\s*true/);
assert.match(opportunityAuthoring, /controlled_fixture/);
assert.match(opportunityAuthoring, /cannot be persisted through production opportunity authoring/i);
assert.match(draftAuthoringMigration, /create or replace function sih26044\.save_opportunity_draft/);
assert.match(draftAuthoringMigration, /current_actor_id\(\)/);
assert.match(draftAuthoringMigration, /'opportunity\.draft_saved'/);
assert.match(draftAuthoringMigration, /review_required/);
assert.match(draftAuthoringMigration, /Production authoring requires an explicit non-fixture human confirmation method/);
assert.doesNotMatch(draftAuthoringMigration, /publish_opportunity_version\s*\(/i, 'Draft save must never publish implicitly');

assert.match(institutionPage, /ProductionInstitutionReads/);
assert.match(institutionPage, /getSkillsIntelligence/);
assert.match(institutionPage, /Below reporting threshold|suppressed/i);
assert.match(institutionPage, /descriptive|causal/i);
assert.doesNotMatch(institutionPage, /useRows\s*\(|supabase\s*\.\s*schema|\.from\s*\(/i,
  'Institution production page must not read individual SIH rows into the browser');
assert.match(institutionReads, /list_authorized_analytics_institutions/);
assert.match(institutionReads, /get_institution_skills_intelligence/);
assert.match(institutionReads, /minimumSupportedCohortSize\s*=\s*5/);
assert.match(institutionReads, /Suppressed institution analytics cells must withhold numerator, denominator, and cohort size/);
assert.match(institutionReads, /subjectactorid/);
assert.match(institutionReads, /evidencerecordid/);
assert.match(institutionReads, /applicationid/);
assert.match(institutionReads, /riasec/);
assert.match(institutionReads, /hiringprobability/);
assert.match(institutionReads, /candidaterank/);
assert.doesNotMatch(institutionReads, /\.from\s*\(/,
  'Institution browser service must use aggregate RPCs only, never individual-row table reads');
assert.match(institutionAnalyticsMigration, /minimum_cell_size constant integer := 5/);
assert.match(institutionAnalyticsMigration, /policy_program_analyst/);
assert.match(institutionAnalyticsMigration, /o\.kind = 'government'/);
assert.match(institutionAnalyticsMigration, /create or replace function sih26044\.get_institution_skills_intelligence/);
assert.match(institutionAnalyticsMigration, /security definer[\s\S]*?set search_path = pg_catalog, sih26044/i);
assert.match(institutionAnalyticsMigration, /'causalClaimed', false/);
assert.match(institutionAnalyticsMigration, /'individualDrilldown', false/);
assert.match(institutionAnalyticsMigration, /'aggregate_analytics'/);
assert.match(institutionAnalyticsMigration, /record_authoritative_audit/);
assert.match(institutionAnalyticsMigration, /revoke all on function sih26044\.get_institution_skills_intelligence[\s\S]*?from public, anon/i);
assert.match(institutionAnalyticsMigration, /grant execute on function sih26044\.get_institution_skills_intelligence[\s\S]*?to authenticated/i);
assert.doesNotMatch(institutionAnalyticsMigration, /create\s+policy[\s\S]*policy_program_analyst/i,
  'Policy/program analysts must not receive individual-row RLS access');

assert.match(migration, /application_snapshot_id[\s\S]*?to_stage\s*=\s*'applied'/i);
assert.doesNotMatch(migration, /latest|newest|order\s+by[\s\S]{0,80}(captured_at|finalized_at)/i);
assert.match(migration, /'resolved',\s*'review_required',\s*'unresolved'/i);
assert.match(worker, /65_536/);
assert.match(worker, /SIH_RATE_LIMITER\.limit/);
assert.match(config, /\[\[ratelimits\]\][\s\S]*name\s*=\s*"SIH_RATE_LIMITER"/);
assert.match(trustedApiClient, /this\.request\.call\(\s*globalThis,/, 'Trusted browser requests must preserve the native fetch receiver');
assert.doesNotMatch(trustedApiClient, /this\.request\s*\(/, 'Native fetch must not be invoked as an unbound instance method');

assert.match(studentPages, /getExactSubmittedApplicationSnapshot/);
assert.match(studentPages, /listApplicationRecruitmentRecords/);
assert.match(applicationStudentDetail, /Exact immutable submission/);
assert.match(applicationStudentDetail, /Withdraw application/);
assert.match(applicationStudentDetail, /Accept offer|Decline offer/);
assert.match(applicationStudentDetail, /evidence response|Feedback|reflection/i);
assert.match(recruiterPage, /listApplicationRecruitmentRecords/);
assert.match(applicationRecruiterPanel, /Applicant-visible message/);
assert.match(applicationRecruiterPanel, /Recruiter-internal note/);
assert.match(applicationRecruiterPanel, /Evidence request|Interview|Offer|Outcome/);
assert.match(applicationTimeline, /Recruiter internal/);
assert.match(applicationDal, /record_application_recruitment_action/);
assert.match(applicationDal, /application_snapshot_id/);
assert.doesNotMatch(applicationDal, /select\s*\(\s*['"]\*['"]\s*\)/i);
assert.match(applicationLifecycleMigration, /application_recruitment_records/);
assert.match(applicationLifecycleMigration, /applicant_and_recruiter/);
assert.match(applicationLifecycleMigration, /recruiter_internal/);
assert.match(applicationLifecycleMigration, /record_application_recruitment_action/);
assert.match(applicationLifecycleMigration, /statement_timestamp\(\)/);
assert.match(applicationLifecycleMigration, /for update/i);
assert.doesNotMatch(applicationLifecycleMigration, /candidate_rank|hiring_probability|automatic_rejection|auto.?shortlist/i);

console.log(JSON.stringify({
  productionRoutes: 14,
  engineBoundary: 'isolated',
  studentClosedLoop: 'rich-production-components',
  unknownHandoff: 'prove-or-clarify-via-gap-closure',
  recruiterProjection: 'exact-consented-snapshot',
  humanRecruitmentActions: true,
  facultyCollaboration: 'rls-bound-append-only-production-lifecycle',
  facultySyntheticActionsExcluded: true,
  industryAuthoring: 'atomic-authenticated-draft-save-plus-explicit-publish',
  institutionSkillsIntelligence: 'aggregate-rpc-only-with-cell-suppression',
  institutionResponseGuard: 'rejects-private-and-individual-identifiers',
  policyAnalystAccess: 'aggregate-only',
  aggregateMinimumCellSize: 5,
  aggregateCausalClaims: false,
  losslessRequirementResolution: true,
  exactSubmissionBinding: true,
  workerAbuseControls: true,
  applicationRecruitmentLifecycle: 'append-only structured records with exact snapshot binding',
  failures: [],
}, null, 2));
