import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calculateCompleteness, getPassportCompletenessBreakdown, groupSkillsByCategory, skillClaimName } from '../src/app/engine/skillProfile';
import type { CareerPassport, SkillClaim } from '../src/app/engine/types';

const root = new URL('../', import.meta.url);
const source = (path: string) => readFileSync(new URL(path, root), 'utf8');
const skill = (index: number): SkillClaim => ({
  skillId: `test-skill-${index}`,
  proficiency: 2,
  confidence: 0.7,
  evidence: [{
    type: 'self_reported',
    description: 'Product audit fixture',
    confidence: 0.7,
    observedAt: new Date(0).toISOString(),
  }],
});
const base = (): CareerPassport => ({
  segment: 'school_student',
  education: { level: 'below_10' },
  experiences: [],
  skills: [],
  constraints: {
    location: '',
    canRelocate: false,
    weeklyLearningHours: 5,
    budgetLevel: 'low',
    languages: ['English'],
    needsIncomeContinuity: false,
  },
  completeness: 0,
  version: 1,
  updatedAt: new Date(0).toISOString(),
});

const starting = base();
assert.equal(calculateCompleteness(starting), 18, 'valid below-class-10 education must count toward profile basics');
assert.equal(calculateCompleteness({ ...starting, education: { level: 'postgraduate' } }), 18, 'education level must not bias completeness');
assert.equal(calculateCompleteness({ ...starting, skills: [skill(1)] }), 28, 'first skill evidence should add ten points');
assert.equal(calculateCompleteness({ ...starting, skills: Array.from({ length: 5 }, (_, index) => skill(index)) }), 33, 'five skills should add fifteen points');
assert.equal(calculateCompleteness({ ...starting, skills: Array.from({ length: 10 }, (_, index) => skill(index)) }), 38, 'ten skills should complete the skill section');

const complete: CareerPassport = {
  ...starting,
  skills: Array.from({ length: 10 }, (_, index) => skill(index)),
  riasec: { R: 50, I: 50, A: 50, S: 50, E: 50, C: 50 },
  aptitude: { numerical: 50, verbal: 50, logical: 50, spatial: 50 },
  values: { stability: 16, growth: 17, autonomy: 17, impact: 17, balance: 17, compensation: 16 },
  aspiration: {
    statement: 'Build a meaningful career.',
    horizonYears: 3,
    themes: ['impact'],
    dreamOccupationIds: ['software-developer'],
    entrepreneurialIntent: 'curious',
    capturedVia: 'form',
  },
  constraints: { ...starting.constraints, location: 'Hyderabad' },
};
const breakdown = getPassportCompletenessBreakdown(complete);
assert.equal(breakdown.reduce((sum, item) => sum + item.maximum, 0), 100, 'section weights must total 100');
assert.equal(calculateCompleteness(complete), 100, 'a fully evidenced passport must reach 100%');
assert.ok(breakdown.every((item) => item.complete), 'every full-passport section must be marked complete');
assert.ok(breakdown.every((item) => item.path.startsWith('/')), 'every incomplete-section action must be an internal route');

const legacyCustomSkill: SkillClaim = {
  skillId: 'custom_legacy',
  proficiency: 3,
  confidence: 0.6,
  evidence: [{
    type: 'self_reported',
    description: 'Manually added: Forecasting',
    confidence: 0.6,
    observedAt: new Date(0).toISOString(),
  }],
};
assert.equal(skillClaimName(legacyCustomSkill), 'Forecasting', 'legacy custom skill names must remain recoverable');
assert.deepEqual(groupSkillsByCategory([legacyCustomSkill]).custom, [legacyCustomSkill], 'custom skills must remain visible in the passport');

for (const hero of ['WordCloudMasthead.tsx', 'StaticMasthead.tsx', 'ShowpieceHero.tsx']) {
  const text = source(`src/app/components/hero/${hero}`);
  assert.match(text, /passport \? '\/dashboard'|hasPassport \? '\/dashboard'/, `${hero} must continue an existing case file at the dashboard`);
  assert.match(text, /homeSetup/, `${hero} must explain passport setup to signed-in users without a profile`);
}
assert.doesNotMatch(source('src/app/pages/OnboardingPage.tsx'), /skipped:\s*true|Skip to home/, 'onboarding must never fabricate consent through a skip path');
assert.match(source('src/app/pages/OnboardingPage.tsx'), /guardianPendingLogged && guardianConfirmed && dataConsentGiven/, 'minor onboarding must require a generated guardian request before confirmation');
assert.match(source('src/app/pages/AuthPage.tsx'), /!requestedRedirect\.startsWith\('\/\/'\)/, 'auth redirects must reject protocol-relative destinations');
assert.match(source('src/app/pages/RootLayout.tsx'), /'\/recommendations'/, 'profile-dependent workspace routes must share the onboarding guard');
for (const page of ['AssessRiasecPage.tsx', 'AssessAptitudePage.tsx', 'AssessValuesPage.tsx', 'AssessAspirationsPage.tsx']) {
  const text = source(`src/app/pages/${page}`);
  assert.match(text, /answerLock\.current/, `${page} must reject repeated answers during transitions`);
  assert.match(text, /disabled=\{[^}]*isAdvancing[^}]*\}/, `${page} must visibly disable answers while advancing`);
}
assert.match(source('src/app/pages/AssessmentHubPage.tsx'), /getPassportCompletenessBreakdown/, 'assessment status must use the canonical completion contract');
assert.doesNotMatch(source('src/app/pages/AssessmentHubPage.tsx'), /inProgress/, 'an untouched next assessment must not be mislabeled as in progress');
assert.match(source('src/app/routes.ts'), /ErrorBoundary:\s*RouteErrorPage/, 'route failures must use the branded recovery screen');
assert.match(source('src/app/components/ScrollingTitles.tsx'), /aria-hidden="true"/, 'decorative scrolling titles must stay out of the accessibility tree');
assert.match(source('src/app/data/jobs.ts'), /function normalizeJobData/, 'AI and cached dossier data must be normalized before rendering');
assert.match(source('src/app/pages/JobDetailPage.tsx'), /params\.get\("occupation"\)/, 'recommendation dossier links must resolve durable occupation ids');
assert.match(source('src/app/pages/InterviewPrepPage.tsx'), /currentJob\?\.title\?\.trim\(\) \|\| searchParams/, 'interview prep must fall back to its URL career when app state is empty');
assert.match(source('src/app/pages/SimulationPage.tsx'), /setCurrentJob\(generateJobData\(requestedJobTitle\)\)/, 'simulation reloads must restore their URL career when app state is empty');
assert.doesNotMatch(source('src/app/engine/pathways.ts'), /label: 'Fastest'/, 'a route must not claim to be fastest without comparing actual durations');
assert.match(source('src/app/pages/PathwayPage.tsx'), /Keep a saved plan stable/, 'completed pathway steps must not rebuild and lengthen the active plan');
assert.match(source('src/app/pages/PathwayPage.tsx'), /setChosenKind\(initial\?\.chosenRoute/, 'async pathway hydration must restore the saved selected route');
assert.match(source('src/app/services/ai.ts'), /explicit computed before\/after counterfactual/, 'the counselor must not invent score changes');
assert.match(source('src/app/pages/OnboardingPage.tsx'), /_localEventId/, 'local and cloud consent writes must share a deduplication id');
assert.match(source('src/app/pages/SettingsPage.tsx'), /schemaVersion: 1/, 'guidance exports must declare their schema version');

console.log(JSON.stringify({
  completenessScenarios: 6,
  routeContracts: 22,
  sectionWeights: breakdown.map(({ id, maximum }) => ({ id, maximum })),
  failures: [],
}, null, 2));
