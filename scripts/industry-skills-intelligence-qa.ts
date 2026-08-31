import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const [routes, layout, page, service, migration, sqlTest, consentService, consentPanel, applicationPage] = await Promise.all([
  readFile(join(root, 'src/app/routes.ts'), 'utf8'),
  readFile(join(root, 'src/app/sih/SihProductionLayout.tsx'), 'utf8'),
  readFile(join(root, 'src/app/sih/SihIndustrySkillsIntelligencePage.tsx'), 'utf8'),
  readFile(join(root, 'src/app/services/sih/productionIndustryReads.ts'), 'utf8'),
  readFile(join(root, 'supabase/migrations/20260830152500_industry_skills_intelligence.sql'), 'utf8'),
  readFile(join(root, 'supabase/tests/sih26044_industry_analytics.sql'), 'utf8'),
  readFile(join(root, 'src/app/services/sih/productionAnalyticsConsent.ts'), 'utf8'),
  readFile(join(root, 'src/app/components/sih/student/application/AggregateAnalyticsConsentPanel.tsx'), 'utf8'),
  readFile(join(root, 'src/app/sih/SihApplicationPreparationPage.tsx'), 'utf8'),
]);

assert.match(routes, /path:\s*["']industry\/analytics["'][\s\S]*IndustrySkillsIntelligencePage/,
  'Production employer Skills Intelligence route is missing.');
assert.match(layout, /recruiter[\s\S]*industry_partner[\s\S]*Industry Analytics[\s\S]*\/industry\/analytics/,
  'Recruiter/industry-partner navigation must expose employer analytics.');
assert.doesNotMatch(layout, /policy_program_analyst[\s\S]{0,160}\/industry\/analytics/,
  'Policy/program analyst navigation must not receive employer operational analytics authority.');

for (const rpc of [
  'list_authorized_industry_analytics_organizations',
  'list_authorized_industry_analytics_opportunities',
  'get_industry_skills_intelligence',
]) {
  assert.match(service, new RegExp(`rpc\\(['\"]${rpc}['\"]`), `Industry analytics service is missing RPC ${rpc}.`);
}
assert.doesNotMatch(service, /\.from\s*\(/,
  'Employer analytics browser service must use bounded aggregate RPCs rather than raw table reads.');
assert.match(service, /privacy\.consentPurpose\s*!==\s*'aggregate_analytics'/,
  'Typed industry boundary must verify the analytics consent purpose.');
assert.match(service, /Suppressed industry analytics cells must withhold numerator, denominator, and cohort size/);
assert.match(service, /subjectactorid/);
assert.match(service, /applicationid/);
assert.match(service, /hiringprobability/);

assert.match(page, /no individual drill-down/i);
assert.match(page, /does not rank applicants|does not rank/i);
assert.match(page, /predict hiring/i);
assert.match(page, /not presented as national labour-market demand|not represent national labour-market demand/i);
assert.match(page, /aggregate_analytics/);
assert.match(page, /exact published opportunity version/i);
assert.doesNotMatch(page, /candidate.?rank|hiring.?probability|automatic.?rejection/i);

assert.match(migration, /minimum_cell_size constant integer := 5/);
assert.match(migration, /submitted\.application_snapshot_id/,
  'Industry analytics must bind applicant-derived signals to the exact submitted snapshot.');
assert.match(migration, /join sih26044\.application_snapshots s[\s\S]*s\.id = submitted\.application_snapshot_id/,
  'Industry analytics must join the exact immutable snapshot bound on the applied event.');
assert.doesNotMatch(migration, /order by[\s\S]{0,80}(captured_at|finalized_at)[\s\S]{0,80}limit 1/i,
  'Industry analytics must never infer submission authority by latest-snapshot recency.');
assert.match(migration, /g\.purpose = 'aggregate_analytics'/);
assert.match(migration, /is_consent_active\([\s\S]*'aggregate_analytics'/);
assert.match(migration, /array\['recruiter', 'industry_partner'\]/);
assert.match(migration, /o\.kind = 'employer'/);
assert.match(migration, /individualDrilldown', false/);
assert.match(migration, /analytics\.industry_aggregate_viewed/);
assert.match(migration, /does not rank candidates, predict hiring, or represent national labour-market demand/i);

assert.match(consentService, /purpose:\s*'aggregate_analytics'/);
assert.match(consentService, /action:\s*'withdrawn'/);
assert.match(consentPanel, /not required to apply/i,
  'Aggregate analytics consent must remain optional and independent of application submission.');
assert.match(consentPanel, /does not affect recruiter review, readiness, shortlisting, or hiring decisions/i);
assert.match(consentPanel, /no individual drill-down/i);
assert.match(applicationPage, /AggregateAnalyticsConsentPanel/);
assert.match(applicationPage, /ApplicationFinalizationPanel/);
assert.match(applicationPage, /Optional aggregate analytics consent is a separate purpose and is never required to apply/i);

const sqlAssertionCount = (sqlTest.match(/^(?:select|\s+perform) pg_temp\.assert_(?:true|blocked)\(/gm) ?? []).length;
assert.ok(sqlAssertionCount >= 15, `Expected at least 15 executable industry analytics SQL assertions, found ${sqlAssertionCount}.`);
assert.match(sqlTest, /ignores newer unsubmitted snapshot material/i);
assert.match(sqlTest, /singleton readiness cell is structurally suppressed/i);
assert.match(sqlTest, /withdrawn aggregate analytics consent excludes the subject/i);
assert.match(sqlTest, /recruiter cannot read another employer aggregate/i);
assert.match(sqlTest, /employer aggregate result exposes no learner identifier/i);

console.log(JSON.stringify({
  productionRoute: '/industry/analytics',
  authority: ['recruiter', 'industry_partner'],
  sourceAuthority: 'exact_submitted_immutable_snapshot',
  analyticsConsentPurpose: 'aggregate_analytics',
  analyticsConsentOptionalForApplication: true,
  minimumCellSize: 5,
  individualDrilldown: false,
  candidateRanking: false,
  hiringPrediction: false,
  nationalDemandClaim: false,
  executableSqlAssertions: sqlAssertionCount,
  failures: [],
}, null, 2));
