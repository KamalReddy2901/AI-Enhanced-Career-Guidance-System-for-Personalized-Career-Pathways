import assert from 'node:assert/strict';
import { matchCareers, GUIDANCE_ENGINE_VERSION, ASSESSMENT_VERSION, SCORING_VERSION } from '../src/app/engine/matching';
import { OCCUPATIONS } from '../src/app/data/knowledge';
import type { CareerPassport, SkillClaim } from '../src/app/engine/types';

const timestamp = new Date(0).toISOString();
const base: CareerPassport = {
  segment: 'career_switcher',
  education: { level: 'undergraduate', field: 'Commerce' },
  experiences: [{ title: 'Retail Store Manager', occupationId: 'store-manager', years: 5, description: 'Led sales and inventory.' }],
  skills: [],
  riasec: { R: 35, I: 65, A: 40, S: 62, E: 72, C: 70 },
  aptitude: { numerical: 75, verbal: 70, logical: 78, spatial: 48 },
  values: { stability: 18, growth: 20, autonomy: 14, impact: 14, balance: 18, compensation: 16 },
  aspiration: { statement: 'Move into analytical business work.', horizonYears: 3, themes: ['analytics', 'business'], dreamOccupationIds: ['business-analyst'], entrepreneurialIntent: 'curious', capturedVia: 'form' },
  constraints: { location: 'Hyderabad', canRelocate: true, weeklyLearningHours: 8, budgetLevel: 'medium', languages: ['English'], needsIncomeContinuity: true },
  completeness: 90,
  version: 1,
  updatedAt: timestamp,
};

const claim = (confidence: number): SkillClaim => ({
  skillId: 'excel', proficiency: 3, confidence,
  evidence: [{ type: 'self_reported', description: 'Regression fixture', confidence, observedAt: timestamp }],
});

const stable = (passport: CareerPassport) => {
  const result = matchCareers(passport);
  return {
    ...result,
    generatedAt: '<generated-at>',
  };
};

const recommendationFor = (passport: CareerPassport, occupationId: string) => {
  const result = matchCareers({
    ...passport,
    aspiration: {
      ...(passport.aspiration ?? {
        statement: `Explore ${occupationId}`,
        horizonYears: 3,
        themes: [],
        entrepreneurialIntent: 'curious' as const,
        capturedVia: 'form' as const,
      }),
      dreamOccupationIds: [occupationId],
    },
  });
  const recommendation = result.recommendations.find(item => item.occupationId === occupationId);
  assert.ok(recommendation, `${occupationId} must be present when explicitly named as a dream occupation`);
  return recommendation;
};

const componentScore = (passport: CareerPassport, occupationId: string, dimension: string): number => {
  const recommendation = recommendationFor(passport, occupationId);
  const component = recommendation.components.find(item => item.dimension === dimension);
  assert.ok(component, `${occupationId} must expose ${dimension}`);
  return component.score;
};

const noSkills = matchCareers(base);
assert.equal(noSkills.engineVersion, GUIDANCE_ENGINE_VERSION);
assert.equal(noSkills.assessmentVersion, ASSESSMENT_VERSION);
assert.equal(noSkills.scoringVersion, SCORING_VERSION);
assert.deepEqual(stable(base), stable(base), 'identical passports must produce identical guidance');

for (const recommendation of noSkills.recommendations) {
  const skill = recommendation.components.find(component => component.dimension === 'skill');
  assert.equal(skill?.score, 50, 'missing skills must be neutral rather than a hidden penalty');
  assert.equal(skill?.dataAvailable, false, 'missing skills must disclose their absence');
  assert.equal(recommendation.evidenceCoverage >= 0 && recommendation.evidenceCoverage <= 100, true);
  assert.equal(recommendation.components.reduce((sum, component) => sum + component.weight, 0), 1, 'recommendation weights must total 1');
  for (const component of recommendation.components) {
    assert.ok(component.source, `${recommendation.occupationId}/${component.dimension} needs a source`);
    assert.ok(component.sourceDetail, `${recommendation.occupationId}/${component.dimension} needs source detail`);
  }
}

const lowEvidence = matchCareers({ ...base, skills: [claim(.2)] });
const highEvidence = matchCareers({ ...base, skills: [claim(.95)] });
const lowExcel = lowEvidence.recommendations.find(item => item.occupationId === 'business-analyst');
const highExcel = highEvidence.recommendations.find(item => item.occupationId === 'business-analyst');
assert.ok(lowExcel && highExcel, 'business analyst must remain a candidate for the fixture');
const lowSkill = lowExcel.components.find(component => component.dimension === 'skill')!;
const highSkill = highExcel.components.find(component => component.dimension === 'skill')!;
assert.ok(highSkill.score > lowSkill.score, 'stronger evidence must increase the skill component');

// Exhaustive scoring must make sparse-profile guidance independent of KB array order.
// The old top-40/top-30 pre-pruning selected arbitrary careers when neutral scores tied.
const sparse: CareerPassport = {
  ...base,
  experiences: [],
  skills: [],
  riasec: undefined,
  aptitude: undefined,
  values: undefined,
  aspiration: undefined,
  constraints: { ...base.constraints, location: '', canRelocate: false },
  completeness: 18,
};
const originalOrder = [...OCCUPATIONS];
const sparseForward = stable(sparse);
try {
  OCCUPATIONS.reverse();
  assert.deepEqual(stable(sparse), sparseForward, 'sparse-profile guidance must not depend on occupation dataset order');
} finally {
  OCCUPATIONS.splice(0, OCCUPATIONS.length, ...originalOrder);
}

// Geography must understand common Indian aliases and broad market-region labels.
const bangalorePassport: CareerPassport = {
  ...base,
  skills: [claim(.8)],
  constraints: { ...base.constraints, location: 'Bengaluru, Karnataka', canRelocate: false },
};
assert.equal(componentScore(bangalorePassport, 'data-analyst', 'geographic'), 85, 'Bengaluru must match Bangalore market records');
assert.equal(componentScore(bangalorePassport, 'software-developer', 'geographic'), 85, 'Bengaluru must match broad metro availability');
assert.equal(componentScore({ ...bangalorePassport, constraints: { ...bangalorePassport.constraints, location: 'Kochi, Kerala' } }, 'electrician', 'geographic'), 85, 'All India availability must match any stated Indian location');
assert.equal(componentScore({ ...bangalorePassport, constraints: { ...bangalorePassport.constraints, location: 'Kochi, Kerala' } }, 'data-analyst', 'geographic'), 55, 'a non-matching city without relocation must retain the geographic penalty');

// Learning feasibility must compare hours with hours. Lower weekly capacity should
// reduce feasibility for the same target when the route workload exceeds capacity.
const lowCapacity: CareerPassport = {
  ...base,
  skills: [claim(.8)],
  constraints: { ...base.constraints, weeklyLearningHours: 1 },
};
const highCapacity: CareerPassport = {
  ...lowCapacity,
  constraints: { ...lowCapacity.constraints, weeklyLearningHours: 20 },
};
const lowFeasibility = componentScore(lowCapacity, 'business-analyst', 'learningFeasibility');
const highFeasibility = componentScore(highCapacity, 'business-analyst', 'learningFeasibility');
assert.ok(highFeasibility > lowFeasibility, 'higher weekly learning capacity must improve feasibility when the low-capacity route is overloaded');

console.log(JSON.stringify({
  engineVersion: GUIDANCE_ENGINE_VERSION,
  assessmentVersion: ASSESSMENT_VERSION,
  scoringVersion: SCORING_VERSION,
  occupationsChecked: noSkills.recommendations.length,
  exhaustiveOccupationPool: OCCUPATIONS.length,
  deterministic: true,
  provenanceChecks: noSkills.recommendations.length * noSkills.recommendations[0].components.length,
  geographyRegressionCases: 4,
  learningCapacityRegressionCases: 1,
  failures: [],
}, null, 2));
