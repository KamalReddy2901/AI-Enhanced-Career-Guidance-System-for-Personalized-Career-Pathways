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
} from '../domain';

export interface RecruiterShareableEvidence {
  readonly evidenceRecordId: EvidenceRecordId;
  readonly literalClaim: string;
  readonly provenance: EvidenceProvenance;
  readonly verificationState: VerificationState;
  readonly artifactIds: readonly EvidenceArtifactId[];
  readonly artifactDisplayNames: readonly string[];
}

export interface RecruiterRequirementProjection {
  readonly requirementId: OpportunityRequirementId;
  readonly literalSourceWording: string;
  readonly priority: RequirementPriority;
  readonly state: RequirementState;
  readonly supportingEvidenceIds: readonly EvidenceRecordId[];
}

export interface RecruiterSharePreviewInput {
  readonly applicantDisplayName: string;
  readonly syntheticPersona: true;
  readonly opportunityId: OpportunityId;
  readonly opportunityVersionId: OpportunityVersionId;
  readonly educationSummary: string;
  readonly readinessResultId: OpportunityReadinessResultId;
  readonly readinessBand: ReadinessBand;
  readonly requirements: readonly RecruiterRequirementProjection[];
  readonly evidence: readonly RecruiterShareableEvidence[];
}

export interface RecruiterSharePreview {
  readonly applicant: {
    readonly displayName: string;
    readonly syntheticPersona: true;
  };
  readonly opportunityId: OpportunityId;
  readonly opportunityVersionId: OpportunityVersionId;
  readonly educationSummary: string;
  readonly readinessResultId: OpportunityReadinessResultId;
  readonly readinessBand: ReadinessBand;
  readonly requirements: readonly RecruiterRequirementProjection[];
  readonly evidence: readonly RecruiterShareableEvidence[];
  readonly sharedWorkSamples: readonly {
    readonly artifactId: EvidenceArtifactId;
    readonly displayName: string;
  }[];
}

export interface RecruiterApplicationProjection extends RecruiterSharePreview {
  readonly applicationId: ApplicationId;
  readonly applicationSnapshotId: ApplicationSnapshotId;
  readonly consentRecordId: ConsentRecordId;
  readonly applicationStage: ApplicationStage;
}

export function buildRecruiterSharePreview(input: RecruiterSharePreviewInput): RecruiterSharePreview {
  return {
    applicant: {
      displayName: input.applicantDisplayName,
      syntheticPersona: true,
    },
    opportunityId: input.opportunityId,
    opportunityVersionId: input.opportunityVersionId,
    educationSummary: input.educationSummary,
    readinessResultId: input.readinessResultId,
    readinessBand: input.readinessBand,
    requirements: input.requirements.map(requirement => ({
      requirementId: requirement.requirementId,
      literalSourceWording: requirement.literalSourceWording,
      priority: requirement.priority,
      state: requirement.state,
      supportingEvidenceIds: [...requirement.supportingEvidenceIds],
    })),
    evidence: input.evidence.map(item => ({
      evidenceRecordId: item.evidenceRecordId,
      literalClaim: item.literalClaim,
      provenance: item.provenance,
      verificationState: item.verificationState,
      artifactIds: [...item.artifactIds],
      artifactDisplayNames: [...item.artifactDisplayNames],
    })),
    sharedWorkSamples: input.evidence.flatMap(item => item.artifactIds.map((artifactId, index) => ({
      artifactId,
      displayName: item.artifactDisplayNames[index] ?? 'Controlled work sample',
    }))),
  };
}

export function buildRecruiterApplicationProjection(
  preview: RecruiterSharePreview,
  applicationId: ApplicationId,
  applicationSnapshotId: ApplicationSnapshotId,
  consentRecordId: ConsentRecordId,
  applicationStage: ApplicationStage,
): RecruiterApplicationProjection {
  return {
    applicant: {
      displayName: preview.applicant.displayName,
      syntheticPersona: true,
    },
    opportunityId: preview.opportunityId,
    opportunityVersionId: preview.opportunityVersionId,
    educationSummary: preview.educationSummary,
    readinessResultId: preview.readinessResultId,
    readinessBand: preview.readinessBand,
    requirements: preview.requirements.map(requirement => ({
      requirementId: requirement.requirementId,
      literalSourceWording: requirement.literalSourceWording,
      priority: requirement.priority,
      state: requirement.state,
      supportingEvidenceIds: [...requirement.supportingEvidenceIds],
    })),
    evidence: preview.evidence.map(item => ({
      evidenceRecordId: item.evidenceRecordId,
      literalClaim: item.literalClaim,
      provenance: item.provenance,
      verificationState: item.verificationState,
      artifactIds: [...item.artifactIds],
      artifactDisplayNames: [...item.artifactDisplayNames],
    })),
    sharedWorkSamples: preview.sharedWorkSamples.map(item => ({
      artifactId: item.artifactId,
      displayName: item.displayName,
    })),
    applicationId,
    applicationSnapshotId,
    consentRecordId,
    applicationStage,
  };
}

export function withRecruiterApplicationStage(
  projection: RecruiterApplicationProjection,
  applicationStage: ApplicationStage,
): RecruiterApplicationProjection {
  return {
    applicant: {
      displayName: projection.applicant.displayName,
      syntheticPersona: true,
    },
    opportunityId: projection.opportunityId,
    opportunityVersionId: projection.opportunityVersionId,
    educationSummary: projection.educationSummary,
    readinessResultId: projection.readinessResultId,
    readinessBand: projection.readinessBand,
    requirements: projection.requirements,
    evidence: projection.evidence,
    sharedWorkSamples: projection.sharedWorkSamples,
    applicationId: projection.applicationId,
    applicationSnapshotId: projection.applicationSnapshotId,
    consentRecordId: projection.consentRecordId,
    applicationStage,
  };
}
