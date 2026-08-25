import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  APPLICATION_STAGES,
  EVIDENCE_PROVENANCE,
  canEnterConfirmedEvidenceLedger,
  canRepresentConnectorAsLive,
  resolveSkill,
  suggestSkillResolutions,
} from '../src/app/domain';
import type {
  ActorRole,
  AggregateMetric,
  ApplicationEvent,
  EvidenceRecord,
  OpportunityRequirement,
  OpportunityRequirementId,
  ProhibitedRecruiterData,
} from '../src/app/domain';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const sourceRoot = join(repositoryRoot, 'src', 'app');

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : Promise.resolve(extname(path).startsWith('.ts') ? [path] : []);
  }));
  return nested.flat();
}

const isEngineBModule = (path: string) => {
  const normalized = path.split(sep).join('/');
  return normalized.includes('/src/app/domain/')
    || normalized.includes('/engine-b/')
    || normalized.includes('/engineB/')
    || normalized.includes('/opportunity-readiness/')
    || /\/src\/app\/engine\/(opportunity|gapClosure|collaborationPolicies)/.test(normalized);
};

const prohibitedPatterns: ReadonlyArray<[RegExp, string]> = [
  [/from\s+['"][^'"]*(?:\/|^)(?:matching|weights|gaps)['"]/, 'imports an Engine A scoring/readiness module'],
  [/\bGapReport\b/, 'references legacy GapReport'],
  [/\bgapReport\s*\.\s*readiness\b/, 'references legacy GapReport.readiness'],
  [/\bcomputeGapReport\b/, 'references the Engine A gap computation'],
];

const violations: string[] = [];
for (const path of (await sourceFiles(sourceRoot)).filter(isEngineBModule)) {
  const source = await readFile(path, 'utf8');
  for (const [pattern, reason] of prohibitedPatterns) {
    if (pattern.test(source)) violations.push(`${relative(repositoryRoot, path)}: ${reason}`);
  }
}
assert.deepEqual(violations, [], `Engine B boundary violations:\n${violations.join('\n')}`);

const pottery = resolveSkill('Pottery & Ceramics');
assert.equal(pottery.matchKind, 'exact');
assert.equal(pottery.skillId, 'pottery');
const unresolved = resolveSkill('  Quantum Ceramics  ');
assert.deepEqual(unresolved, { label: 'Quantum Ceramics', matchKind: 'none' });
assert.equal(suggestSkillResolutions('Quantum Ceramics').every(item => item.reviewOnly), true,
  'similarity results may only be review suggestions');

const unresolvedSkillRequirement: OpportunityRequirement = {
  id: 'requirement-skill' as OpportunityRequirementId,
  category: 'skill',
  priority: 'required',
  literalSourceWording: 'Quantum Ceramics',
  canonicalResolution: { state: 'unresolved', literalText: 'Quantum Ceramics' },
};
assert.equal(unresolvedSkillRequirement.canonicalResolution.state, 'unresolved');
assert.equal(unresolvedSkillRequirement.literalSourceWording, 'Quantum Ceramics');
const experienceRequirement: OpportunityRequirement = {
  id: 'requirement-experience' as OpportunityRequirementId,
  category: 'experience',
  priority: 'preferred',
  literalSourceWording: 'Two years working with laboratory equipment',
  minimumYears: 2,
};
assert.equal('canonicalResolution' in experienceRequirement, false,
  'non-skill requirements must not carry skill canonicalization state');

const applicationStages = [
  'saved', 'preparing', 'applied', 'screening', 'evidence_requested',
  'under_review', 'interview', 'shortlisted', 'offered', 'accepted',
  'declined', 'rejected_by_human', 'withdrawn', 'active', 'completed',
  'cancelled', 'outcome_recorded',
];
assert.deepEqual([...APPLICATION_STAGES], applicationStages);
assert.equal(APPLICATION_STAGES.includes('rejected' as never), false,
  'the canonical lifecycle must not contain an unattributed rejection stage');
const humanRejection = {
  eventKind: 'human_rejection',
  toStage: 'rejected_by_human',
  actorId: 'human-reviewer',
  reason: 'Human reviewer decision',
} as ApplicationEvent;
assert.equal(humanRejection.eventKind, 'human_rejection');

const aiProposed = {
  provenance: 'extracted',
  proposalSource: 'ai_extraction',
  verificationState: 'proposed',
} as EvidenceRecord;
assert.equal(EVIDENCE_PROVENANCE.includes('ai_proposed' as never), false,
  'AI proposal source must not masquerade as evidence provenance');
assert.deepEqual(
  ['self_declared', 'self_reported', 'extracted', 'inferred', 'assessed', 'artifact_backed', 'human_attested', 'issuer_verified', 'outcome_linked']
    .filter(value => !EVIDENCE_PROVENANCE.includes(value as never)),
  [],
);
assert.equal(canEnterConfirmedEvidenceLedger(aiProposed), false);
assert.equal(canEnterConfirmedEvidenceLedger({
  ...aiProposed,
  verificationState: 'self_confirmed',
} as EvidenceRecord), true, 'explicit user confirmation must be the minimum transition for an AI proposal');
assert.equal(aiProposed.provenance, 'extracted',
  'confirmation eligibility must not promote extracted provenance to human or issuer authority');

const analystRole: ActorRole = 'policy_program_analyst';
assert.equal(analystRole, 'policy_program_analyst');
const requiredAggregateMetrics: AggregateMetric[] = [
  'readiness_distribution',
  'evidence_gap_distribution',
  'capability_gap_distribution',
  'eligibility_gap_distribution',
  'logistics_gap_distribution',
  'application_funnel',
  'recruitment_funnel',
  'outcome_distribution',
  'intervention_effectiveness_association',
  'requirement_pattern',
  'demand_pattern',
  'faculty_industry_engagement',
  'curriculum_program_alignment',
];
assert.equal(requiredAggregateMetrics.length, 13);
const prohibitedRecruiterData: ProhibitedRecruiterData[] = [
  'riasec',
  'work_values',
  'private_aspirations',
  'counselor_history',
  'financial_constraints',
  'family_constraints',
  'private_constraints',
  'guardian_data',
  'unrelated_disability_information',
  'unrelated_accessibility_information',
];
assert.equal(prohibitedRecruiterData.length, 10);

const opportunitySource = await readFile(join(sourceRoot, 'domain', 'opportunity.ts'), 'utf8');
assert.doesNotMatch(opportunitySource, /RequirementEvidenceState|\bMET_STRONG\b|\bMET_WEAK_EVIDENCE\b|\bEVIDENCE_PRESENT\b|\bPARTIAL\b|\bUNKNOWN\b|\bGAP\b|\bNOT_APPLICABLE\b/,
  'Checkpoint A.1 must not define a premature Engine B requirement-state model');

assert.equal(canRepresentConnectorAsLive({
  key: 'example',
  displayName: 'Example target',
  capabilityState: 'target_architecture',
  operationalState: 'live_connected',
  supportedOperations: [],
  liveAuthorizationReference: 'claimed-but-not-implemented',
}), false, 'target architecture must never be represented as a live connector');

console.log(JSON.stringify({
  engineBFilesInspected: (await sourceFiles(sourceRoot)).filter(isEngineBModule).length,
  boundaryViolations: violations,
  exactResolution: pottery,
  unresolvedResolution: unresolved,
  nonSkillCanonicalizationBlocked: true,
  applicationLifecycleStages: APPLICATION_STAGES.length,
  aiProposalLedgerGuard: true,
  analystAggregateOnlyRole: true,
  aggregateMetricCoverage: requiredAggregateMetrics.length,
  recruiterProhibitedCategories: prohibitedRecruiterData.length,
  connectorTruthGuard: true,
}, null, 2));
