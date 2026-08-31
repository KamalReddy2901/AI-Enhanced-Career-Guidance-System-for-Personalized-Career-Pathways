import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  combineEvidenceConfidence,
  confirmSkillClaimProposals,
  createSkillClaimProposals,
  customSkillId,
  extractLiteralResumeSkills,
  matchSkillsToKB,
  mergeSkillClaims,
  normalizeSkillEvidence,
  skillClaimName,
} from '../src/app/engine/skillProfile';
import type { SkillClaim, SkillEvidence } from '../src/app/engine/types';

const extracted = (name: string) => ({
  name,
  proficiency: 2 as const,
  evidence: `Resume literal: ${name}`,
});

const customResult = matchSkillsToKB([
  extracted('Quantum Ceramics'),
  extracted('Underwater Tax Strategy'),
]);
assert.equal(customResult.matched.length, 2);
assert.notEqual(customResult.matched[0].skillId, customResult.matched[1].skillId,
  'unrelated custom skills must have distinct merge identities');
assert.deepEqual(customResult.matched.map(skillClaimName), ['Quantum Ceramics', 'Underwater Tax Strategy'],
  'unresolved labels must be preserved literally');
assert.equal(customResult.matched[0].skillId.startsWith('custom:'), true);
assert.equal(customResult.matched[0].skillId === 'pottery', false,
  'Quantum Ceramics must not token-match Pottery & Ceramics');
assert.equal(extractLiteralResumeSkills('Quantum Ceramics').some(claim => claim.name === 'Pottery & Ceramics'), false,
  'literal fallback must not promote a contained alias inside unrelated language');
assert.equal(mergeSkillClaims([], customResult.matched).length, 2,
  'custom skills must not collapse into a shared merge bucket');
assert.equal(customSkillId('Quantum Ceramics'), customSkillId('  quantum   ceramics  '),
  'superficial case and spacing differences must share one unresolved identity');
assert.notEqual(customSkillId('Quantum Ceramics'), customSkillId('Ceramics'),
  'normalized identity must not introduce semantic/fuzzy equivalence');
const caseVariantCustomClaims = matchSkillsToKB([
  extracted('Quantum Ceramics'),
  extracted('  quantum   ceramics  '),
]).matched;
assert.equal(caseVariantCustomClaims[1].name, '  quantum   ceramics  ',
  'literal unresolved wording must remain unchanged for display and provenance');
assert.equal(mergeSkillClaims([], caseVariantCustomClaims).length, 1,
  'case/spacing variants must merge by normalized internal identity');
const legacyCustomClaims = customResult.matched.map((claim, index) => ({
  ...claim,
  skillId: undefined as unknown as string,
  name: index === 0 ? 'Legacy Quantum Ceramics' : 'Legacy Underwater Tax Strategy',
}));
const migratedLegacyCustomClaims = mergeSkillClaims([], legacyCustomClaims);
assert.equal(migratedLegacyCustomClaims.length, 2,
  'legacy custom claims with unsafe undefined IDs must receive distinct stable IDs');

const weakEvidence: SkillEvidence = {
  type: 'self_reported',
  description: 'Self report',
  confidence: .65,
  observedAt: new Date(0).toISOString(),
  verificationState: 'self_attested',
};
assert.equal(combineEvidenceConfidence(Array.from({ length: 20 }, () => weakEvidence)), .65,
  'repeated weak evidence must not compound toward certainty');

const weakClaim: SkillClaim = {
  skillId: 'custom:weak:test',
  name: 'Weak evidence skill',
  proficiency: 2,
  confidence: .65,
  evidence: Array.from({ length: 20 }, () => weakEvidence),
};
const mergedWeak = mergeSkillClaims([], [weakClaim])[0];
assert.equal(mergedWeak.confidence, .65);
assert.equal(mergedWeak.evidence.every(item => item.verificationState === 'self_attested'), true,
  'self-reports must retain self-attested provenance state');
assert.equal(combineEvidenceConfidence([{ ...weakEvidence, verificationState: 'issuer_verified', confidence: .99 }]), .65,
  'a verification flag must not mathematically rewrite self-reported provenance as issuer-grade evidence');

const freeTextCredential = normalizeSkillEvidence({
  type: 'credentialed',
  description: 'Credential: pasted course link',
  confidence: .9,
  observedAt: new Date(0).toISOString(),
});
assert.equal(freeTextCredential.type, 'credential_claim');
assert.equal(freeTextCredential.verificationState, 'unreviewed');
assert.equal(freeTextCredential.confidence, .6);

const pathwayCheckbox = normalizeSkillEvidence({
  type: 'credentialed',
  description: 'Completed pathway step: Finish qualification',
  confidence: .9,
  observedAt: new Date(0).toISOString(),
});
assert.equal(pathwayCheckbox.type, 'pathway_activity');
assert.equal(pathwayCheckbox.verificationState, 'self_attested');
assert.equal(pathwayCheckbox.confidence, .6);

const proposed = createSkillClaimProposals([customResult.matched[0]], 'ai_resume_extraction');
assert.equal(proposed[0].status, 'proposed');
assert.equal(proposed[0].claim.evidence[0].verificationState, 'unreviewed',
  'AI extraction must remain proposed and unreviewed before confirmation');
const confirmed = confirmSkillClaimProposals(proposed);
assert.equal(confirmed[0].evidence[0].type, 'inferred_from_resume');
assert.equal(confirmed[0].evidence[0].verificationState, 'self_attested',
  'confirmation may add self-attestation but must not rewrite provenance as human/issuer verified');

const [validationSource, pathwaySource, passportSource, guidanceContextSource] = await Promise.all([
  readFile(new URL('../src/app/components/guidance/SkillValidationDialog.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/app/pages/PathwayPage.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/app/pages/PassportPage.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/app/context/GuidanceContext.tsx', import.meta.url), 'utf8'),
]);
assert.doesNotMatch(validationSource, /['"]credentialed['"]/,
  'free-text validation UI must not mint credentialed evidence');
assert.doesNotMatch(pathwaySource, /['"]credentialed['"]/,
  'pathway checkbox UI must not mint credentialed evidence');
assert.match(passportSource, /createSkillClaimProposals[\s\S]*confirmSkillClaimProposals/,
  'resume UI must retain an explicit proposal-to-confirmation transition');
assert.match(passportSource, /data-proposed-record="skill"/,
  'resume review must render every proposed skill record');
assert.match(passportSource, /data-proposed-record="skill"[\s\S]*claim\.skillId[\s\S]*claim\.proficiency[\s\S]*claim\.confidence[\s\S]*evidence\.type[\s\S]*evidence\.description[\s\S]*evidence\.confidence[\s\S]*evidence\.observedAt[\s\S]*self_attested/,
  'resume review must disclose every proposed skill field and post-confirmation verification state');
assert.match(passportSource, /data-proposed-record="experience"[\s\S]*record\.title[\s\S]*record\.years[\s\S]*record\.description/,
  'resume review must render all proposed experience fields');
assert.match(passportSource, /data-proposed-record="education"[\s\S]*education\.record\.level[\s\S]*education\.record\.field/,
  'resume review must render all proposed education fields');
assert.match(passportSource, /filter\(item => item\.included\)/,
  'resume persistence must honor per-record include/exclude review choices');
assert.doesNotMatch(passportSource, /Also proposed:/,
  'summary-only confirmation copy must not replace informed structured review');
const extractionSection = passportSource.slice(
  passportSource.indexOf('const handleResumeExtract'),
  passportSource.indexOf('const confirmResumeReview'),
);
assert.doesNotMatch(extractionSection, /updatePassport\s*\(/,
  'resume extraction must not persist any proposed record before confirmation');
assert.match(guidanceContextSource, /skills:\s*Array\.isArray\(value\.skills\)\s*\?\s*normalizeSkillClaims/,
  'stored Career Passport loading must normalize legacy evidence');

console.log(JSON.stringify({
  customSkillsDistinct: true,
  literalLabelsPreserved: true,
  normalizedCustomIdentity: true,
  fuzzyPromotionBlocked: true,
  weakEvidenceCompoundingBlocked: true,
  freeTextCredentialDowngraded: true,
  pathwayCompletionDowngraded: true,
  aiProposalConfirmationRequired: true,
  informedResumeReviewRequired: true,
}, null, 2));
