import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ActorId,
  ApplicationId,
  ApplicationStage,
  ConsentPurpose,
  ConsentRecordId,
  EvidenceRecordId,
  OpportunityId,
  OpportunityRequirementId,
  OpportunityVersionId,
  OrganizationId,
  VerificationAction,
} from '../../domain';
import type {
  ApplicationEventReadModel,
  ApplicationReadModel,
  ConsentGrantReadModel,
  EvidenceArtifactReadModel,
  EvidenceRecordReadModel,
  EvidenceScopeReadModel,
  VerificationEventReadModel,
  VerificationRequestReadModel,
  VerificationRequestStatus,
} from './types';

export type EvidenceScopeKind = 'global_skill' | 'opportunity' | 'organization' | 'outcome';

export interface InsertWeakEvidenceInput {
  readonly literalClaim: string;
  readonly provenance: 'self_declared' | 'self_reported' | 'extracted' | 'inferred';
  readonly initialVerificationState?: 'proposed' | 'unverified' | 'self_confirmed';
  readonly proposalSource?: 'user_entry' | 'ai_extraction' | 'rule_based_extraction';
  readonly scopeKind: EvidenceScopeKind;
  readonly scopeSkillId?: string;
  readonly scopeLiteralSkillLabel?: string;
  readonly scopeOpportunityId?: OpportunityId;
  readonly scopeRequirementId?: OpportunityRequirementId;
  readonly scopeOrganizationId?: OrganizationId;
  readonly sourceSystem: string;
  readonly sourceRecordId?: string;
  readonly sourceUrl?: string;
  readonly sourceCapturedAt?: string;
  readonly visibility?: 'private' | 'consented_application' | 'organization_scoped' | 'public';
}

export interface GrantConsentInput {
  readonly granteeOrganizationId?: OrganizationId;
  readonly purpose: ConsentPurpose;
  readonly expiresAt?: string;
  readonly evidenceRecordIds: readonly EvidenceRecordId[];
}

export interface RequestVerificationInput {
  readonly evidenceRecordId: EvidenceRecordId;
  readonly requestedVerifierActorId?: ActorId;
  readonly requestedVerifierOrganizationId?: OrganizationId;
  readonly consentGrantId: ConsentRecordId;
  readonly scopeKind: EvidenceScopeKind;
  readonly scopeSkillId?: string;
  readonly scopeLiteralSkillLabel?: string;
  readonly scopeOpportunityId?: OpportunityId;
  readonly scopeRequirementId?: OpportunityRequirementId;
  readonly scopeOrganizationId?: OrganizationId;
  readonly expiresAt?: string;
}

export interface AppendVerificationEventInput {
  readonly verificationRequestId: string;
  readonly evidenceRecordId: EvidenceRecordId;
  readonly action: VerificationAction;
  readonly actorOrganizationId?: OrganizationId;
  readonly reason?: string;
  readonly supersedesEventId?: string;
}

export interface CreateApplicationInput {
  readonly opportunityId: OpportunityId;
  readonly opportunityVersionId: OpportunityVersionId;
  readonly ownerOrganizationId: OrganizationId;
  readonly initialStage?: 'saved' | 'preparing';
}

export interface TransitionApplicationStageInput {
  readonly applicationId: ApplicationId;
  readonly fromStage: ApplicationStage;
  readonly toStage: ApplicationStage;
  readonly reason?: string;
  readonly note?: string;
}

interface ListVerificationRequestsFilterBase {
  readonly status?: VerificationRequestStatus;
}

export type ListVerificationRequestsInput = ListVerificationRequestsFilterBase & (
  | { readonly requestedVerifierActorId: ActorId; readonly requestedVerifierOrganizationId?: OrganizationId }
  | { readonly requestedVerifierActorId?: never; readonly requestedVerifierOrganizationId: OrganizationId }
);

export type ListVerificationEventsInput =
  | { readonly verificationRequestId: string; readonly evidenceRecordId?: never }
  | { readonly evidenceRecordId: EvidenceRecordId; readonly verificationRequestId?: never };

export interface ListApplicationsInput {
  readonly opportunityId?: OpportunityId;
  readonly opportunityVersionId?: OpportunityVersionId;
  readonly initialStage?: 'saved' | 'preparing';
}

export interface ListApplicationsForRecruiterOrganizationInput extends ListApplicationsInput {
  /** Transparent workflow filtering only. This is applied after the append-only
   * application event history has been composed into the current stage. */
  readonly currentStage?: ApplicationStage;
}

interface EvidenceRecordRow {
  id: string;
  subject_actor_id: string;
  literal_claim: string;
  provenance: EvidenceRecordReadModel['provenance'];
  initial_verification_state: EvidenceRecordReadModel['initialVerificationState'];
  proposal_source: EvidenceRecordReadModel['proposalSource'] | null;
  scope_kind: EvidenceScopeKind;
  scope_skill_id: string | null;
  scope_literal_skill_label: string | null;
  scope_opportunity_id: string | null;
  scope_requirement_id: string | null;
  scope_organization_id: string | null;
  scope_outcome_event_id: string | null;
  source_system: string;
  source_record_id: string | null;
  source_url: string | null;
  source_captured_at: string;
  visibility: EvidenceRecordReadModel['visibility'];
  created_at: string;
}

interface VerificationRequestRow {
  id: string;
  evidence_record_id: string;
  subject_actor_id: string;
  requested_verifier_actor_id: string | null;
  requested_verifier_organization_id: string | null;
  consent_grant_id: string;
  scope_kind: EvidenceScopeKind;
  scope_skill_id: string | null;
  scope_literal_skill_label: string | null;
  scope_opportunity_id: string | null;
  scope_requirement_id: string | null;
  scope_organization_id: string | null;
  scope_outcome_event_id: string | null;
  status: VerificationRequestStatus;
  requested_at: string;
  expires_at: string | null;
  closed_at: string | null;
}

interface VerificationEventRow {
  id: string;
  sequence_number: number;
  verification_request_id: string;
  evidence_record_id: string;
  action: VerificationAction;
  actor_id: string;
  actor_organization_id: string | null;
  reason: string | null;
  supersedes_event_id: string | null;
  occurred_at: string;
}

interface ApplicationRow {
  id: string;
  applicant_actor_id: string;
  opportunity_id: string;
  opportunity_version_id: string;
  owner_organization_id: string;
  initial_stage: 'saved' | 'preparing';
  created_at: string;
}

interface ApplicationEventRow {
  id: string;
  sequence_number: number;
  application_id: string;
  from_stage: ApplicationStage;
  to_stage: ApplicationStage;
  event_kind: 'stage_transition' | 'human_rejection';
  actor_id: string;
  reason: string | null;
  note: string | null;
  occurred_at: string;
}

interface ConsentGrantRow {
  id: string;
  subject_actor_id: string;
  grantee_organization_id: string;
  purpose: 'application_review';
  granted_at: string;
  expires_at: string | null;
}

interface ConsentLifecycleEventRow {
  consent_grant_id: string;
  sequence_number: number;
  action: 'granted' | 'withdrawn' | 'expired';
  occurred_at: string;
}

const evidenceSelect = 'id,subject_actor_id,literal_claim,provenance,initial_verification_state,proposal_source,scope_kind,scope_skill_id,scope_literal_skill_label,scope_opportunity_id,scope_requirement_id,scope_organization_id,scope_outcome_event_id,source_system,source_record_id,source_url,source_captured_at,visibility,created_at';
const verificationRequestSelect = 'id,evidence_record_id,subject_actor_id,requested_verifier_actor_id,requested_verifier_organization_id,consent_grant_id,scope_kind,scope_skill_id,scope_literal_skill_label,scope_opportunity_id,scope_requirement_id,scope_organization_id,scope_outcome_event_id,status,requested_at,expires_at,closed_at';
const verificationEventSelect = 'id,sequence_number,verification_request_id,evidence_record_id,action,actor_id,actor_organization_id,reason,supersedes_event_id,occurred_at';
const applicationSelect = 'id,applicant_actor_id,opportunity_id,opportunity_version_id,owner_organization_id,initial_stage,created_at';
const applicationEventSelect = 'id,sequence_number,application_id,from_stage,to_stage,event_kind,actor_id,reason,note,occurred_at';

function required(value: string | null, field: string): string {
  if (value === null) throw new Error(`Invalid SIH read row: ${field} is required for its scope`);
  return value;
}

function mapScope(row: Pick<EvidenceRecordRow, 'scope_kind' | 'scope_skill_id' | 'scope_literal_skill_label' | 'scope_opportunity_id' | 'scope_requirement_id' | 'scope_organization_id' | 'scope_outcome_event_id'>): EvidenceScopeReadModel {
  switch (row.scope_kind) {
    case 'global_skill': return { kind: 'global_skill', skillId: row.scope_skill_id ?? undefined, literalSkillLabel: required(row.scope_literal_skill_label, 'scope_literal_skill_label') };
    case 'opportunity': return { kind: 'opportunity', opportunityId: required(row.scope_opportunity_id, 'scope_opportunity_id'), requirementId: row.scope_requirement_id ?? undefined };
    case 'organization': return { kind: 'organization', organizationId: required(row.scope_organization_id, 'scope_organization_id') };
    case 'outcome': return { kind: 'outcome', outcomeEventId: required(row.scope_outcome_event_id, 'scope_outcome_event_id') };
  }
}

function mapEvidenceRecord(row: EvidenceRecordRow): EvidenceRecordReadModel {
  return {
    id: row.id,
    subjectActorId: row.subject_actor_id,
    literalClaim: row.literal_claim,
    provenance: row.provenance,
    initialVerificationState: row.initial_verification_state,
    proposalSource: row.proposal_source ?? undefined,
    scope: mapScope(row),
    source: { system: row.source_system, recordId: row.source_record_id ?? undefined, url: row.source_url ?? undefined, capturedAt: row.source_captured_at },
    visibility: row.visibility,
    createdAt: row.created_at,
  };
}

function mapVerificationRequest(row: VerificationRequestRow): VerificationRequestReadModel {
  return {
    id: row.id,
    evidenceRecordId: row.evidence_record_id,
    subjectActorId: row.subject_actor_id,
    requestedVerifierActorId: row.requested_verifier_actor_id ?? undefined,
    requestedVerifierOrganizationId: row.requested_verifier_organization_id ?? undefined,
    consentGrantId: row.consent_grant_id,
    scope: mapScope(row),
    status: row.status,
    requestedAt: row.requested_at,
    expiresAt: row.expires_at ?? undefined,
    closedAt: row.closed_at ?? undefined,
  };
}

function mapVerificationEvent(row: VerificationEventRow): VerificationEventReadModel {
  return {
    id: row.id,
    verificationRequestId: row.verification_request_id,
    evidenceRecordId: row.evidence_record_id,
    action: row.action,
    actorId: row.actor_id,
    actorOrganizationId: row.actor_organization_id ?? undefined,
    reason: row.reason ?? undefined,
    supersedesEventId: row.supersedes_event_id ?? undefined,
    occurredAt: row.occurred_at,
  };
}

export class SihBrowserDal {
  constructor(private readonly supabase: SupabaseClient) {}

  private db() {
    return this.supabase.schema('sih26044');
  }

  async listEvidenceForSubject(subjectActorId: ActorId): Promise<EvidenceRecordReadModel[]> {
    const { data, error } = await this.db().from('evidence_records')
      .select(evidenceSelect).eq('subject_actor_id', subjectActorId).order('created_at', { ascending: false });
    if (error) throw error;
    const rows = (data ?? []) as EvidenceRecordRow[];
    return rows.map(mapEvidenceRecord);
  }

  async getEvidenceRecord(evidenceRecordId: EvidenceRecordId): Promise<EvidenceRecordReadModel | null> {
    const { data, error } = await this.db().from('evidence_records').select(evidenceSelect).eq('id', evidenceRecordId).maybeSingle();
    if (error) throw error;
    return data ? mapEvidenceRecord(data as EvidenceRecordRow) : null;
  }

  async listArtifactsForEvidence(evidenceRecordId: EvidenceRecordId): Promise<EvidenceArtifactReadModel[]> {
    const { data: linksData, error: linksError } = await this.db().from('evidence_artifact_links')
      .select('evidence_record_id,artifact_id,linked_at').eq('evidence_record_id', evidenceRecordId).order('linked_at', { ascending: false });
    if (linksError) throw linksError;
    const links = (linksData ?? []) as Array<{ evidence_record_id: string; artifact_id: string; linked_at: string }>;
    if (links.length === 0) return [];
    const { data: artifactsData, error: artifactsError } = await this.db().from('artifacts')
      .select('id,storage_bucket_id,storage_object_path,media_type,display_name,integrity_fingerprint,scan_status,created_at')
      .in('id', links.map(link => link.artifact_id));
    if (artifactsError) throw artifactsError;
    const artifacts = new Map(((artifactsData ?? []) as Array<{ id: string; storage_bucket_id: string; storage_object_path: string; media_type: string; display_name: string; integrity_fingerprint: string | null; scan_status: EvidenceArtifactReadModel['scanStatus']; created_at: string }>).map(row => [row.id, row]));
    return links.flatMap(link => {
      const artifact = artifacts.get(link.artifact_id);
      return artifact ? [{ id: artifact.id, evidenceRecordId: link.evidence_record_id, mediaType: artifact.media_type, displayName: artifact.display_name, storageBucketId: artifact.storage_bucket_id, storageObjectPath: artifact.storage_object_path, integrityFingerprint: artifact.integrity_fingerprint ?? undefined, scanStatus: artifact.scan_status, linkedAt: link.linked_at, createdAt: artifact.created_at }] : [];
    });
  }

  async listVerificationRequestsForVerifier(input: ListVerificationRequestsInput): Promise<VerificationRequestReadModel[]> {
    let query = this.db().from('verification_requests').select(verificationRequestSelect).order('requested_at', { ascending: false });
    if (input.requestedVerifierActorId) query = query.eq('requested_verifier_actor_id', input.requestedVerifierActorId);
    if (input.requestedVerifierOrganizationId) query = query.eq('requested_verifier_organization_id', input.requestedVerifierOrganizationId);
    if (input.status) query = query.eq('status', input.status);
    const { data, error } = await query;
    if (error) throw error;
    return ((data ?? []) as VerificationRequestRow[]).map(mapVerificationRequest);
  }

  async getVerificationRequest(verificationRequestId: string): Promise<VerificationRequestReadModel | null> {
    const { data, error } = await this.db().from('verification_requests').select(verificationRequestSelect).eq('id', verificationRequestId).maybeSingle();
    if (error) throw error;
    return data ? mapVerificationRequest(data as VerificationRequestRow) : null;
  }

  async listVerificationEvents(input: ListVerificationEventsInput): Promise<VerificationEventReadModel[]> {
    let query = this.db().from('verification_events').select(verificationEventSelect).order('sequence_number', { ascending: true });
    query = 'verificationRequestId' in input
      ? query.eq('verification_request_id', input.verificationRequestId)
      : query.eq('evidence_record_id', input.evidenceRecordId);
    const { data, error } = await query;
    if (error) throw error;
    return ((data ?? []) as VerificationEventRow[]).map(mapVerificationEvent);
  }

  async listApplicationsForApplicant(applicantActorId: ActorId, input: ListApplicationsInput = {}): Promise<ApplicationReadModel[]> {
    let query = this.db().from('applications').select(applicationSelect).eq('applicant_actor_id', applicantActorId).order('created_at', { ascending: false });
    if (input.opportunityId) query = query.eq('opportunity_id', input.opportunityId);
    if (input.opportunityVersionId) query = query.eq('opportunity_version_id', input.opportunityVersionId);
    if (input.initialStage) query = query.eq('initial_stage', input.initialStage);
    const { data, error } = await query;
    if (error) throw error;
    const rows = (data ?? []) as ApplicationRow[];
    return this.mapApplicationsWithCurrentStage(rows);
  }

  async listApplicationsForRecruiterOrganization(
    ownerOrganizationId: OrganizationId,
    input: ListApplicationsForRecruiterOrganizationInput = {},
  ): Promise<ApplicationReadModel[]> {
    let query = this.db().from('applications').select(applicationSelect)
      .eq('owner_organization_id', ownerOrganizationId)
      .order('created_at', { ascending: false });
    if (input.opportunityId) query = query.eq('opportunity_id', input.opportunityId);
    if (input.opportunityVersionId) query = query.eq('opportunity_version_id', input.opportunityVersionId);
    if (input.initialStage) query = query.eq('initial_stage', input.initialStage);
    const { data, error } = await query;
    if (error) throw error;
    const applications = await this.mapApplicationsWithCurrentStage((data ?? []) as ApplicationRow[]);
    return input.currentStage
      ? applications.filter(application => application.currentStage === input.currentStage)
      : applications;
  }

  async getApplication(applicationId: ApplicationId): Promise<ApplicationReadModel | null> {
    const { data, error } = await this.db().from('applications').select(applicationSelect).eq('id', applicationId).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return (await this.mapApplicationsWithCurrentStage([data as ApplicationRow]))[0] ?? null;
  }

  private async mapApplicationsWithCurrentStage(rows: ApplicationRow[]): Promise<ApplicationReadModel[]> {
    if (rows.length === 0) return [];
    const { data, error } = await this.db().from('application_events')
      .select('application_id,to_stage,sequence_number').in('application_id', rows.map(row => row.id)).order('sequence_number', { ascending: false });
    if (error) throw error;
    const currentStages = new Map<string, ApplicationStage>();
    for (const event of (data ?? []) as Array<{ application_id: string; to_stage: ApplicationStage; sequence_number: number }>) {
      if (!currentStages.has(event.application_id)) currentStages.set(event.application_id, event.to_stage);
    }
    return rows.map(row => ({ id: row.id, applicantActorId: row.applicant_actor_id, opportunityId: row.opportunity_id, opportunityVersionId: row.opportunity_version_id, ownerOrganizationId: row.owner_organization_id, initialStage: row.initial_stage, currentStage: currentStages.get(row.id) ?? row.initial_stage, createdAt: row.created_at }));
  }

  async listApplicationEvents(applicationId: ApplicationId): Promise<ApplicationEventReadModel[]> {
    const { data, error } = await this.db().from('application_events').select(applicationEventSelect).eq('application_id', applicationId).order('sequence_number', { ascending: true });
    if (error) throw error;
    return ((data ?? []) as ApplicationEventRow[]).map(row => ({ id: row.id, applicationId: row.application_id, fromStage: row.from_stage, toStage: row.to_stage, eventKind: row.event_kind, actorId: row.actor_id, reason: row.reason ?? undefined, note: row.note ?? undefined, occurredAt: row.occurred_at }));
  }

  async listApplicationReviewConsentsForSubject(subjectActorId: ActorId, granteeOrganizationId?: OrganizationId): Promise<ConsentGrantReadModel[]> {
    let query = this.db().from('consent_grants').select('id,subject_actor_id,grantee_organization_id,purpose,granted_at,expires_at')
      .eq('subject_actor_id', subjectActorId).eq('purpose', 'application_review').order('granted_at', { ascending: false });
    if (granteeOrganizationId) query = query.eq('grantee_organization_id', granteeOrganizationId);
    const { data, error } = await query;
    if (error) throw error;
    const grants = (data ?? []) as ConsentGrantRow[];
    if (grants.length === 0) return [];
    const grantIds = grants.map(grant => grant.id);
    const [eventsResult, evidenceResult] = await Promise.all([
      this.db().from('consent_lifecycle_events').select('consent_grant_id,sequence_number,action,occurred_at').in('consent_grant_id', grantIds).order('sequence_number', { ascending: false }),
      this.db().from('consent_evidence_records').select('consent_grant_id,evidence_record_id').in('consent_grant_id', grantIds),
    ]);
    if (eventsResult.error) throw eventsResult.error;
    if (evidenceResult.error) throw evidenceResult.error;
    const latestEvents = new Map<string, ConsentLifecycleEventRow>();
    for (const event of (eventsResult.data ?? []) as ConsentLifecycleEventRow[]) if (!latestEvents.has(event.consent_grant_id)) latestEvents.set(event.consent_grant_id, event);
    const evidenceIds = new Map<string, string[]>();
    for (const link of (evidenceResult.data ?? []) as Array<{ consent_grant_id: string; evidence_record_id: string }>) evidenceIds.set(link.consent_grant_id, [...(evidenceIds.get(link.consent_grant_id) ?? []), link.evidence_record_id]);
    const now = Date.now();
    return grants.map(grant => {
      const latest = latestEvents.get(grant.id);
      const expired = grant.expires_at !== null && Date.parse(grant.expires_at) <= now;
      const status = expired || latest?.action === 'expired' ? 'expired' : latest?.action === 'withdrawn' ? 'withdrawn' : 'granted';
      return { id: grant.id, subjectActorId: grant.subject_actor_id, granteeOrganizationId: grant.grantee_organization_id, purpose: grant.purpose, evidenceRecordIds: evidenceIds.get(grant.id) ?? [], status, grantedAt: grant.granted_at, expiresAt: grant.expires_at ?? undefined, withdrawnAt: latest?.action === 'withdrawn' ? latest.occurred_at : undefined };
    });
  }

  async insertWeakEvidence(subjectActorId: string, input: InsertWeakEvidenceInput) {
    const { data, error } = await this.db().from('evidence_records').insert({
      subject_actor_id: subjectActorId,
      literal_claim: input.literalClaim,
      provenance: input.provenance,
      initial_verification_state: input.initialVerificationState ?? 'unverified',
      proposal_source: input.proposalSource ?? 'user_entry',
      scope_kind: input.scopeKind,
      scope_skill_id: input.scopeSkillId ?? null,
      scope_literal_skill_label: input.scopeLiteralSkillLabel ?? null,
      scope_opportunity_id: input.scopeOpportunityId ?? null,
      scope_requirement_id: input.scopeRequirementId ?? null,
      scope_organization_id: input.scopeOrganizationId ?? null,
      source_system: input.sourceSystem,
      source_record_id: input.sourceRecordId ?? null,
      source_url: input.sourceUrl ?? null,
      source_captured_at: input.sourceCapturedAt ?? new Date().toISOString(),
      visibility: input.visibility ?? 'private',
    }).select().single();
    if (error) throw error;
    return data;
  }

  async grantConsent(subjectActorId: string, input: GrantConsentInput) {
    const { data: grant, error: grantError } = await this.db().from('consent_grants').insert({
      subject_actor_id: subjectActorId,
      grantee_organization_id: input.granteeOrganizationId ?? null,
      purpose: input.purpose,
      expires_at: input.expiresAt ?? null,
      created_by_actor_id: subjectActorId,
    }).select().single();
    if (grantError) throw grantError;

    if (input.evidenceRecordIds.length > 0) {
      const records = input.evidenceRecordIds.map(evidenceId => ({
        consent_grant_id: grant.id,
        evidence_record_id: evidenceId,
      }));
      const { error: linkError } = await this.db().from('consent_evidence_records').insert(records);
      if (linkError) throw linkError;
    }

    return grant;
  }

  async withdrawConsent(actorId: string, consentGrantId: string, reason = 'User requested consent withdrawal') {
    const { data, error } = await this.db().from('consent_lifecycle_events').insert({
      consent_grant_id: consentGrantId,
      action: 'withdrawn',
      actor_id: actorId,
      reason,
    }).select().single();
    if (error) throw error;
    return data;
  }

  async requestVerification(subjectActorId: string, input: RequestVerificationInput) {
    const { data, error } = await this.db().from('verification_requests').insert({
      evidence_record_id: input.evidenceRecordId,
      subject_actor_id: subjectActorId,
      requested_verifier_actor_id: input.requestedVerifierActorId ?? null,
      requested_verifier_organization_id: input.requestedVerifierOrganizationId ?? null,
      consent_grant_id: input.consentGrantId,
      scope_kind: input.scopeKind,
      scope_skill_id: input.scopeSkillId ?? null,
      scope_literal_skill_label: input.scopeLiteralSkillLabel ?? null,
      scope_opportunity_id: input.scopeOpportunityId ?? null,
      scope_requirement_id: input.scopeRequirementId ?? null,
      scope_organization_id: input.scopeOrganizationId ?? null,
      expires_at: input.expiresAt ?? null,
    }).select().single();
    if (error) throw error;
    return data;
  }

  async appendVerificationEvent(actorId: string, input: AppendVerificationEventInput) {
    const { data, error } = await this.db().from('verification_events').insert({
      verification_request_id: input.verificationRequestId,
      evidence_record_id: input.evidenceRecordId,
      action: input.action,
      actor_id: actorId,
      actor_organization_id: input.actorOrganizationId ?? null,
      reason: input.reason ?? null,
      supersedes_event_id: input.supersedesEventId ?? null,
    }).select().single();
    if (error) throw error;
    return data;
  }

  async createApplication(applicantActorId: string, input: CreateApplicationInput) {
    const { data, error } = await this.db().from('applications').insert({
      applicant_actor_id: applicantActorId,
      opportunity_id: input.opportunityId,
      opportunity_version_id: input.opportunityVersionId,
      owner_organization_id: input.ownerOrganizationId,
      initial_stage: input.initialStage ?? 'saved',
    }).select().single();
    if (error) throw error;
    return data;
  }

  async transitionApplicationStage(actorId: string, input: TransitionApplicationStageInput) {
    const eventKind = input.toStage === 'rejected_by_human' ? 'human_rejection' : 'stage_transition';
    const { data, error } = await this.db().from('application_events').insert({
      application_id: input.applicationId,
      from_stage: input.fromStage,
      to_stage: input.toStage,
      event_kind: eventKind,
      actor_id: actorId,
      reason: input.reason ?? null,
      note: input.note ?? null,
    }).select().single();
    if (error) throw error;
    return data;
  }

  /** Explicit high-impact publication action. The database function derives
   * actor authority from the authenticated session, validates confirmation,
   * freezes the version, updates the current version, and records the publisher. */
  async publishOpportunityVersion(opportunityVersionId: OpportunityVersionId): Promise<OpportunityVersionId> {
    const { data, error } = await this.db().rpc('publish_opportunity_version', {
      requested_version_id: opportunityVersionId,
    });
    if (error) throw error;
    if (data !== opportunityVersionId) {
      throw new Error('Published opportunity version identity did not match the requested version.');
    }
    return data as OpportunityVersionId;
  }
}
