import type {
  ApplicationId,
  ApplicationSnapshotId,
  ApplicationStage,
  ConsentRecordId,
  EvidenceArtifactId,
  EvidenceProvenance,
  EvidenceRecordId,
  OpportunityId,
  OpportunityReadinessResultId,
  OpportunityRequirementId,
  OpportunityVersionId,
  ReadinessBand,
  RequirementPriority,
  RequirementState,
  VerificationState,
} from '../../domain';

export interface ProductionRecruiterEvidenceItem {
  readonly evidenceRecordId: EvidenceRecordId;
  readonly literalClaim: string;
  readonly provenance: EvidenceProvenance;
  readonly verificationState: VerificationState;
  readonly verificationAssertions: readonly ProductionRecruiterVerificationAssertion[];
  readonly artifactIds: readonly EvidenceArtifactId[];
  readonly artifactDisplayNames: readonly string[];
}

export interface ProductionRecruiterVerificationAssertion {
  readonly verificationRequestId: string;
  readonly verificationState: VerificationState;
  readonly action: string;
  readonly sequenceNumber: number;
  readonly occurredAt?: string;
}

export interface ProductionRecruiterRequirementItem {
  readonly requirementId: OpportunityRequirementId;
  readonly literalSourceWording: string;
  readonly priority: RequirementPriority;
  readonly state: RequirementState;
  readonly supportingEvidenceIds: readonly EvidenceRecordId[];
}

export interface ProductionRecruiterWorkSample {
  readonly artifactId: EvidenceArtifactId;
  readonly displayName: string;
}

export interface ProductionRecruiterProjectionInput {
  readonly applicantDisplayName: string;
  readonly applicationId: ApplicationId;
  readonly applicationSnapshotId: ApplicationSnapshotId;
  readonly consentRecordId: ConsentRecordId;
  readonly applicationStage: ApplicationStage;
  readonly opportunityId: OpportunityId;
  readonly opportunityVersionId: OpportunityVersionId;
  readonly educationSummary: string;
  readonly readinessResultId: OpportunityReadinessResultId;
  readonly readinessBand: ReadinessBand;
  readonly requirements: readonly ProductionRecruiterRequirementItem[];
  readonly evidence: readonly ProductionRecruiterEvidenceItem[];
  readonly sharedWorkSamples?: readonly ProductionRecruiterWorkSample[];
}

export interface ProductionRecruiterProjection {
  readonly applicant: {
    readonly displayName: string;
  };
  readonly applicationId: ApplicationId;
  readonly applicationSnapshotId: ApplicationSnapshotId;
  readonly applicationStage: ApplicationStage;
  readonly consentRecordId: ConsentRecordId;
  readonly educationSummary: string;
  readonly evidence: readonly ProductionRecruiterEvidenceItem[];
  readonly opportunityId: OpportunityId;
  readonly opportunityVersionId: OpportunityVersionId;
  readonly readinessBand: ReadinessBand;
  readonly readinessResultId: OpportunityReadinessResultId;
  readonly requirements: readonly ProductionRecruiterRequirementItem[];
  readonly sharedWorkSamples: readonly ProductionRecruiterWorkSample[];
}

const PROHIBITED_KEYS = [
  'riasec',
  'work_values',
  'workvalues',
  'private_aspirations',
  'privateaspirations',
  'counselor_history',
  'counselorhistory',
  'private_guidance',
  'privateguidance',
  'financial_constraints',
  'financialconstraints',
  'family_constraints',
  'familyconstraints',
  'guardian_data',
  'guardiandata',
  'private_constraints',
  'privateconstraints',
  'unrelated_disability',
  'unrelated_accessibility',
  'hiring_probability',
  'hiringprobability',
  'candidate_rank',
  'candidaterank',
  'employability_score',
  'employabilityscore',
  'opaque_fit_score',
  'readiness_percentage',
  'fit_percentage',
  'success_probability',
  'syntheticpersona',
];

export function validateNoProhibitedKeys(value: unknown, path = 'projection'): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateNoProhibitedKeys(item, `${path}[${index}]`));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      const normalized = key.toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (PROHIBITED_KEYS.includes(normalized)) {
        throw new Error(`Prohibited key detected in production recruiter projection: ${path}.${key}`);
      }
      validateNoProhibitedKeys(nested, `${path}.${key}`);
    }
  }
}

export function buildProductionRecruiterProjection(
  input: ProductionRecruiterProjectionInput,
): ProductionRecruiterProjection {
  const sharedWorkSamples = input.sharedWorkSamples
    ? input.sharedWorkSamples.map(sample => ({
        artifactId: sample.artifactId,
        displayName: sample.displayName,
      }))
    : input.evidence.flatMap(item =>
        item.artifactIds.map((artifactId, index) => ({
          artifactId,
          displayName: item.artifactDisplayNames[index] ?? 'Clean work sample',
        })),
      );

  const projection: ProductionRecruiterProjection = {
    applicant: {
      displayName: input.applicantDisplayName,
    },
    applicationId: input.applicationId,
    applicationSnapshotId: input.applicationSnapshotId,
    applicationStage: input.applicationStage,
    consentRecordId: input.consentRecordId,
    educationSummary: input.educationSummary,
    evidence: input.evidence.map(item => ({
      evidenceRecordId: item.evidenceRecordId,
      literalClaim: item.literalClaim,
      provenance: item.provenance,
      verificationState: item.verificationState,
      verificationAssertions: item.verificationAssertions.map(assertion => ({ ...assertion })),
      artifactIds: [...item.artifactIds],
      artifactDisplayNames: [...item.artifactDisplayNames],
    })),
    opportunityId: input.opportunityId,
    opportunityVersionId: input.opportunityVersionId,
    readinessBand: input.readinessBand,
    readinessResultId: input.readinessResultId,
    requirements: input.requirements.map(req => ({
      requirementId: req.requirementId,
      literalSourceWording: req.literalSourceWording,
      priority: req.priority,
      state: req.state,
      supportingEvidenceIds: [...req.supportingEvidenceIds],
    })),
    sharedWorkSamples,
  };

  validateNoProhibitedKeys(projection);
  return projection;
}
