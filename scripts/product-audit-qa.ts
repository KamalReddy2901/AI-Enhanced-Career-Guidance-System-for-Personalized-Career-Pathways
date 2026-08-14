import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calculateCompleteness, getPassportCompletenessBreakdown } from '../src/app/engine/skillProfile';
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

for (const hero of ['WordCloudMasthead.tsx', 'StaticMasthead.tsx', 'ShowpieceHero.tsx']) {
  const text = source(`src/app/components/hero/${hero}`);
  assert.match(text, /passport \? '\/dashboard'|hasPassport \? '\/dashboard'/, `${hero} must continue an existing case file at the dashboard`);
  assert.match(text, /homeSetup/, `${hero} must explain passport setup to signed-in users without a profile`);
}
assert.doesNotMatch(source('src/app/pages/OnboardingPage.tsx'), /skipped:\s*true|Skip to home/, 'onboarding must never fabricate consent through a skip path');
assert.match(source('src/app/pages/OnboardingPage.tsx'), /guardianPendingLogged && guardianConfirmed && dataConsentGiven/, 'minor onboarding must require a generated guardian request before confirmation');
assert.match(source('src/app/pages/AuthPage.tsx'), /!requestedRedirect\.startsWith\('\/\/'\)/, 'auth redirects must reject protocol-relative destinations');
assert.match(source('src/app/pages/RootLayout.tsx'), /'\/recommendations'/, 'profile-dependent workspace routes must share the onboarding guard');

console.log(JSON.stringify({
  completenessScenarios: 6,
  routeContracts: 6,
  sectionWeights: breakdown.map(({ id, maximum }) => ({ id, maximum })),
  failures: [],
}, null, 2));
