import { skillById } from '../data/knowledge';
import type {
  ActorId,
  ApplicationEventId,
  ApplicationId,
  ApplicationSnapshotId,
  CollaborationEngagement,
  CollaborationEngagementId,
  ConsentRecordId,
  EvidenceArtifactId,
  EvidenceRecordId,
  IsoTimestamp,
  OpportunityId,
  OpportunityReadinessResultId,
  OpportunityRequirement,
  OpportunityRequirementId,
  OpportunityVersionId,
  Organization,
  OrganizationId,
  OutcomeEventId,
  VerificationEventId,
} from '../domain';
import type { DemoEvidenceLedgerEntry, DemoFixtureCatalog, DemoTraceEvent } from './demoTypes';

export const DEMO_TIME = {
  fixtureCreated: '2026-08-25T09:00:00.000Z' as IsoTimestamp,
  initialReadiness: '2026-08-25T09:05:00.000Z' as IsoTimestamp,
  workSampleAttached: '2026-08-25T09:10:00.000Z' as IsoTimestamp,
  workSampleReadiness: '2026-08-25T09:11:00.000Z' as IsoTimestamp,
  mentorVerified: '2026-08-25T09:20:00.000Z' as IsoTimestamp,
  mentorReadiness: '2026-08-25T09:21:00.000Z' as IsoTimestamp,
  previewViewed: '2026-08-25T09:25:00.000Z' as IsoTimestamp,
  consentGranted: '2026-08-25T09:26:00.000Z' as IsoTimestamp,
  applicationSubmitted: '2026-08-25T09:30:00.000Z' as IsoTimestamp,
  reviewStarted: '2026-08-25T09:35:00.000Z' as IsoTimestamp,
  shortlisted: '2026-08-25T09:40:00.000Z' as IsoTimestamp,
  outcomeRecorded: '2026-08-25T09:50:00.000Z' as IsoTimestamp,
} as const;

export const DEMO_IDS = {
  student: 'demo-actor-student' as ActorId,
  mentor: 'demo-actor-mentor' as ActorId,
  recruiter: 'demo-actor-recruiter' as ActorId,
  institution: 'demo-actor-institution' as ActorId,
  faculty: 'demo-actor-faculty' as ActorId,
  partnerOrganization: 'demo-org-ayush-research-partner' as OrganizationId,
  institutionOrganization: 'demo-org-institution' as OrganizationId,
  opportunity: 'demo-opportunity-ayush-data-intern' as OpportunityId,
  opportunityVersion: 'demo-opportunity-ayush-data-intern-v1' as OpportunityVersionId,
  requirementDataAnalysis: 'demo-req-data-analysis' as OpportunityRequirementId,
  requirementWorkSample: 'demo-req-work-sample' as OpportunityRequirementId,
  requirementAyushStandardization: 'demo-req-ayush-standardization' as OpportunityRequirementId,
  requirementResearchPreferred: 'demo-req-research-preferred' as OpportunityRequirementId,
  evidenceDataAnalysis: 'demo-evidence-data-analysis' as EvidenceRecordId,
  evidenceWorkSampleClaim: 'demo-evidence-work-sample-claim' as EvidenceRecordId,
  evidenceWorkSampleArtifact: 'demo-evidence-work-sample-artifact' as EvidenceRecordId,
  evidenceAyushContribution: 'demo-evidence-ayush-contribution' as EvidenceRecordId,
  artifactDataWorkbook: 'demo-artifact-data-workbook' as EvidenceArtifactId,
  artifactStandardizationSample: 'demo-artifact-standardization-sample' as EvidenceArtifactId,
  mentorVerification: 'demo-verification-mentor-contribution' as VerificationEventId,
  readinessInitial: 'demo-readiness-initial' as OpportunityReadinessResultId,
  readinessWorkSample: 'demo-readiness-work-sample' as OpportunityReadinessResultId,
  readinessMentor: 'demo-readiness-mentor' as OpportunityReadinessResultId,
  consentApplicationReview: 'demo-consent-application-review' as ConsentRecordId,
  application: 'demo-application-ayush-intern' as ApplicationId,
  applicationSnapshot: 'demo-application-snapshot-v1' as ApplicationSnapshotId,
  applicationAppliedEvent: 'demo-application-event-applied' as ApplicationEventId,
  applicationReviewEvent: 'demo-application-event-under-review' as ApplicationEventId,
  applicationShortlistEvent: 'demo-application-event-shortlisted' as ApplicationEventId,
  outcomeSelected: 'demo-outcome-selected' as OutcomeEventId,
  collaborationResearch: 'demo-collaboration-research' as CollaborationEngagementId,
  collaborationFdp: 'demo-collaboration-fdp' as CollaborationEngagementId,
  collaborationWorkshop: 'demo-collaboration-workshop' as CollaborationEngagementId,
} as const;

function canonicalSkill(skillId: string): { skillId: string; label: string } {
  const skill = skillById.get(skillId);
  if (!skill) throw new Error(`Controlled demo fixture references missing canonical skill: ${skillId}`);
  return { skillId, label: skill.name };
}

export const DEMO_CANONICAL_SKILLS = {
  dataAnalysis: canonicalSkill('data-analysis'),
  research: canonicalSkill('research'),
} as const;

const confirmation = {
  humanConfirmed: true as const,
  confirmedByActorId: DEMO_IDS.recruiter,
  confirmedAt: DEMO_TIME.fixtureCreated,
  confirmationMethod: 'controlled_fixture' as const,
};

export const DEMO_ORGANIZATIONS: readonly Organization[] = [
  {
    id: DEMO_IDS.partnerOrganization,
    legalName: 'Controlled Demo AYUSH Research Partner Private Fixture',
    displayName: 'Controlled Demo AYUSH Research Partner',
    kind: 'employer',
    status: 'active',
    createdAt: DEMO_TIME.fixtureCreated,
  },
  {
    id: DEMO_IDS.institutionOrganization,
    legalName: 'Controlled Demo Institute of Health Data Studies Fixture',
    displayName: 'Controlled Demo Institute',
    kind: 'educational_institution',
    status: 'active',
    createdAt: DEMO_TIME.fixtureCreated,
  },
];

export const DEMO_PERSONAS = [
  { id: DEMO_IDS.student, displayName: 'Aarav — synthetic learner', status: 'active', roleLabel: 'Student / learner', syntheticPersona: true },
  { id: DEMO_IDS.mentor, displayName: 'Dr. Meera — synthetic faculty mentor', status: 'active', roleLabel: 'Faculty verifier', syntheticPersona: true },
  { id: DEMO_IDS.recruiter, displayName: 'Riya — synthetic industry reviewer', status: 'active', roleLabel: 'Human recruiter reviewer', syntheticPersona: true },
  { id: DEMO_IDS.institution, displayName: 'Dev — synthetic T&P analyst', status: 'active', roleLabel: 'Institution / T&P', syntheticPersona: true },
  { id: DEMO_IDS.faculty, displayName: 'Prof. Ishan — synthetic faculty lead', status: 'active', roleLabel: 'Faculty collaboration lead', syntheticPersona: true },
] as const;

export const DEMO_REQUIREMENTS: readonly OpportunityRequirement[] = [
  {
    id: DEMO_IDS.requirementDataAnalysis,
    category: 'skill',
    priority: 'required',
    importance: 3,
    evidenceExpectation: 'any_recorded',
    hardGate: false,
    literalSourceWording: 'Demonstrate Data Analysis at proficiency level 3 for controlled clinical-research datasets.',
    canonicalResolution: {
      state: 'resolved',
      skillId: DEMO_CANONICAL_SKILLS.dataAnalysis.skillId,
      matchKind: 'exact',
    },
    minimumProficiency: 3,
    ...confirmation,
  },
  {
    id: DEMO_IDS.requirementWorkSample,
    category: 'document_evidence',
    priority: 'required',
    importance: 3,
    evidenceExpectation: 'artifact_expected',
    hardGate: false,
    literalSourceWording: 'Attach an inspectable controlled work sample showing a de-identified data-standardization table.',
    requestedArtifactKind: 'controlled_work_sample',
    ...confirmation,
  },
  {
    id: DEMO_IDS.requirementAyushStandardization,
    category: 'skill',
    priority: 'required',
    importance: 3,
    evidenceExpectation: 'human_or_issuer_expected',
    hardGate: false,
    literalSourceWording: 'Show an observed contribution to AYUSH clinical terminology standardization in a supervised context.',
    canonicalResolution: {
      state: 'unresolved',
      literalText: 'AYUSH clinical terminology standardization',
    },
    ...confirmation,
  },
  {
    id: DEMO_IDS.requirementResearchPreferred,
    category: 'skill',
    priority: 'preferred',
    importance: 1,
    evidenceExpectation: 'any_recorded',
    hardGate: false,
    literalSourceWording: 'Research capability is preferred for literature and protocol review.',
    canonicalResolution: {
      state: 'resolved',
      skillId: DEMO_CANONICAL_SKILLS.research.skillId,
      matchKind: 'exact',
    },
    minimumProficiency: 2,
    ...confirmation,
  },
];

const DEMO_FIXTURE_WITHOUT_COLLABORATIONS = {
  personas: DEMO_PERSONAS,
  organizations: DEMO_ORGANIZATIONS,
  opportunity: {
    id: DEMO_IDS.opportunity,
    ownerOrganizationId: DEMO_IDS.partnerOrganization,
    currentVersionId: DEMO_IDS.opportunityVersion,
    status: 'published',
  },
  opportunityVersion: {
    id: DEMO_IDS.opportunityVersion,
    opportunityId: DEMO_IDS.opportunity,
    version: 1,
    createdAt: DEMO_TIME.fixtureCreated,
    createdBy: DEMO_IDS.recruiter,
    title: 'AYUSH Clinical Research Data & Standardization Intern — Controlled Demo Partner',
    description: 'A synthetic opportunity used only to demonstrate evidence-bounded opportunity readiness and consented review.',
    type: 'internship',
    audiences: ['student'],
    requirements: DEMO_REQUIREMENTS,
    eligibilityRules: [{
      kind: 'education_level',
      operator: 'at_least',
      value: 'undergraduate',
      literalSourceWording: 'Applicant is currently enrolled at undergraduate level or above.',
      ...confirmation,
    }],
    source: {
      sourceSystem: 'controlled_demo_fixture',
      sourceRecordId: 'synthetic-opportunity-001',
      capturedAt: DEMO_TIME.fixtureCreated,
    },
    publishedAt: DEMO_TIME.fixtureCreated,
  },
} satisfies Omit<DemoFixtureCatalog, 'collaborations'>;

const evidenceSource = (sourceRecordId: string) => ({
  sourceSystem: 'controlled_demo_fixture',
  sourceRecordId,
  capturedAt: DEMO_TIME.fixtureCreated,
});

export const DEMO_INITIAL_EVIDENCE: readonly DemoEvidenceLedgerEntry[] = [
  {
    record: {
      id: DEMO_IDS.evidenceDataAnalysis,
      subjectActorId: DEMO_IDS.student,
      literalClaim: 'Completed a controlled assessment using a de-identified clinical-research dataset.',
      provenance: 'assessed',
      scope: { kind: 'opportunity', opportunityId: DEMO_IDS.opportunity, requirementId: DEMO_IDS.requirementDataAnalysis },
      artifacts: [{
        id: DEMO_IDS.artifactDataWorkbook,
        mediaType: 'application/vnd.controlled-demo.table',
        storageReference: 'controlled-demo-artifact:data-analysis-workbook-v1',
        checksum: 'controlled-fixture-checksum-data-analysis-v1',
        displayName: 'Controlled de-identified analysis workbook',
      }],
      source: evidenceSource('synthetic-evidence-data-analysis'),
      visibility: 'consented_application',
      consentRecordIds: [],
      createdAt: DEMO_TIME.fixtureCreated,
      verificationState: 'self_confirmed',
    },
    readiness: {
      proficiency: 3,
      capabilityAssertion: 'supports',
      directness: 'direct',
      workSampleArtifactIds: [DEMO_IDS.artifactDataWorkbook],
    },
  },
  {
    record: {
      id: DEMO_IDS.evidenceWorkSampleClaim,
      subjectActorId: DEMO_IDS.student,
      literalClaim: 'A controlled terminology-standardization table was prepared, but no inspectable artifact is attached yet.',
      provenance: 'self_reported',
      scope: { kind: 'opportunity', opportunityId: DEMO_IDS.opportunity, requirementId: DEMO_IDS.requirementWorkSample },
      artifacts: [],
      source: evidenceSource('synthetic-evidence-work-sample-claim'),
      visibility: 'consented_application',
      consentRecordIds: [],
      createdAt: DEMO_TIME.fixtureCreated,
      verificationState: 'self_confirmed',
    },
    readiness: {
      capabilityAssertion: 'supports',
      directness: 'explicit_claim',
      workSampleArtifactIds: [],
    },
  },
  {
    record: {
      id: DEMO_IDS.evidenceAyushContribution,
      subjectActorId: DEMO_IDS.student,
      literalClaim: 'Contributed to a supervised controlled exercise mapping AYUSH terms into a structured research table.',
      provenance: 'self_reported',
      scope: { kind: 'opportunity', opportunityId: DEMO_IDS.opportunity, requirementId: DEMO_IDS.requirementAyushStandardization },
      artifacts: [],
      source: evidenceSource('synthetic-evidence-ayush-contribution'),
      visibility: 'consented_application',
      consentRecordIds: [],
      createdAt: DEMO_TIME.fixtureCreated,
      verificationState: 'self_confirmed',
    },
    readiness: {
      capabilityAssertion: 'supports',
      directness: 'direct',
      workSampleArtifactIds: [],
    },
  },
];

export const DEMO_WORK_SAMPLE_EVIDENCE: DemoEvidenceLedgerEntry = {
  record: {
    id: DEMO_IDS.evidenceWorkSampleArtifact,
    subjectActorId: DEMO_IDS.student,
    literalClaim: 'Attached a controlled, de-identified terminology-standardization table for contextual review.',
    provenance: 'artifact_backed',
    scope: { kind: 'opportunity', opportunityId: DEMO_IDS.opportunity, requirementId: DEMO_IDS.requirementWorkSample },
    artifacts: [{
      id: DEMO_IDS.artifactStandardizationSample,
      mediaType: 'application/vnd.controlled-demo.table',
      storageReference: 'controlled-demo-artifact:standardization-table-v1',
      checksum: 'controlled-fixture-checksum-standardization-v1',
      displayName: 'Controlled AYUSH terminology table',
    }],
    source: evidenceSource('synthetic-evidence-work-sample-artifact'),
    visibility: 'consented_application',
    consentRecordIds: [],
    createdAt: DEMO_TIME.workSampleAttached,
    verificationState: 'self_confirmed',
  },
  readiness: {
    capabilityAssertion: 'supports',
    directness: 'direct',
    workSampleArtifactIds: [DEMO_IDS.artifactStandardizationSample],
  },
};

export const DEMO_COLLABORATIONS: readonly CollaborationEngagement[] = [
  {
    id: DEMO_IDS.collaborationResearch,
    kind: 'collaborative_research',
    hostOrganizationId: DEMO_IDS.institutionOrganization,
    partnerOrganizationIds: [DEMO_IDS.partnerOrganization],
    participantActorIds: [DEMO_IDS.faculty, DEMO_IDS.mentor],
    status: 'active',
    objectives: ['Co-design a controlled terminology data dictionary', 'Review reproducible de-identification practice'],
    startsAt: DEMO_TIME.fixtureCreated,
  },
  {
    id: DEMO_IDS.collaborationFdp,
    kind: 'faculty_development_program',
    hostOrganizationId: DEMO_IDS.partnerOrganization,
    partnerOrganizationIds: [DEMO_IDS.institutionOrganization],
    participantActorIds: [DEMO_IDS.faculty],
    status: 'approved',
    objectives: ['Faculty development on evidence-led clinical research data workflows'],
    startsAt: DEMO_TIME.fixtureCreated,
  },
  {
    id: DEMO_IDS.collaborationWorkshop,
    kind: 'workshop',
    hostOrganizationId: DEMO_IDS.institutionOrganization,
    partnerOrganizationIds: [DEMO_IDS.partnerOrganization],
    participantActorIds: [DEMO_IDS.faculty, DEMO_IDS.student],
    status: 'proposed',
    objectives: ['Controlled workshop on inspectable work samples and contextual verification'],
  },
];

export const DEMO_FIXTURE: DemoFixtureCatalog = {
  ...DEMO_FIXTURE_WITHOUT_COLLABORATIONS,
  collaborations: DEMO_COLLABORATIONS,
};

export const DEMO_INITIAL_TRACE: readonly DemoTraceEvent[] = [{
  id: 'demo-trace-initial-evidence',
  kind: 'initial_evidence',
  actorLabel: 'Controlled fixture',
  occurredAt: DEMO_TIME.fixtureCreated,
  summary: 'Initial synthetic evidence ledger established; no production student data was loaded.',
}];
