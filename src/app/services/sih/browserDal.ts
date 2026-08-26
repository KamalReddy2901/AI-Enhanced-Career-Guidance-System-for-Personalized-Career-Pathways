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

export class SihBrowserDal {
  constructor(private readonly supabase: SupabaseClient) {}

  private db() {
    return this.supabase.schema('sih26044');
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
}
