import type { SupabaseClient } from "@supabase/supabase-js";
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
  OutcomeEventId,
  VerificationAction,
} from "../../domain";
import type {
  ApplicationEventReadModel,
  ApplicationOutcomeKind,
  ApplicationReadModel,
  ApplicationRecruitmentRecordKind,
  ApplicationRecruitmentRecordReadModel,
  ApplicationSnapshotReadModel,
  ConsentGrantReadModel,
  CompleteVerificationRequestDecisionInput,
  CompleteVerificationRequestDecisionResult,
  CreateVerificationRequestWithConsentResult,
  EvidenceArtifactReadModel,
  EvidenceRecordReadModel,
  EvidenceScopeReadModel,
  VerificationEventReadModel,
  VerificationRequestReadModel,
  VerificationRequestStatus,
  VerifierActingContextReadModel,
} from "./types";

type NonTerminalVerificationAction = Exclude<
  VerificationAction,
  "verified_by_human" | "verified_by_issuer" | "disputed"
>;

export type EvidenceScopeKind =
  "global_skill" | "opportunity" | "organization" | "outcome";

export interface InsertWeakEvidenceInput {
  readonly literalClaim: string;
  readonly provenance:
    "self_declared" | "self_reported" | "extracted" | "inferred";
  readonly initialVerificationState?:
    "proposed" | "unverified" | "self_confirmed";
  readonly proposalSource?:
    "user_entry" | "ai_extraction" | "rule_based_extraction";
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
  readonly visibility?:
    "private" | "consented_application" | "organization_scoped" | "public";
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
  readonly scopeOutcomeEventId?: OutcomeEventId;
  readonly expiresAt?: string;
}

export interface CreateVerificationRequestWithConsentInput {
  readonly evidenceRecordId: EvidenceRecordId;
  readonly requestedVerifierOrganizationId: OrganizationId;
  readonly expiresAt?: string;
}

export interface AppendVerificationEventInput {
  readonly verificationRequestId: string;
  readonly evidenceRecordId: EvidenceRecordId;
  readonly action: NonTerminalVerificationAction;
  readonly actorOrganizationId?: OrganizationId;
  readonly reason?: string;
  readonly supersedesEventId?: string;
}

export interface CreateApplicationInput {
  readonly opportunityId: OpportunityId;
  readonly opportunityVersionId: OpportunityVersionId;
  readonly ownerOrganizationId: OrganizationId;
  readonly initialStage?: "saved" | "preparing";
}

export interface TransitionApplicationStageInput {
  readonly applicationId: ApplicationId;
  readonly fromStage: ApplicationStage;
  readonly toStage: ApplicationStage;
  readonly reason?: string;
  readonly note?: string;
  /** Required for submission. This is the exact finalized immutable snapshot;
   * callers must never infer it from the newest/finalized snapshot. */
  readonly applicationSnapshotId?: string;
  /** Applicant-visible lifecycle detail. This is never an internal note. */
  readonly sharedMessage?: string;
  readonly internalNote?: string;
  readonly scheduledAt?: string;
  readonly scheduleTimezone?: string;
  readonly interactionMode?: string;
  readonly locationReference?: string;
  readonly expiresAt?: string;
  readonly outcomeKind?: ApplicationOutcomeKind;
}

export interface RecordApplicationRecruitmentActionInput {
  readonly applicationId: ApplicationId;
  readonly currentStage: ApplicationStage;
  readonly kind: Extract<
    ApplicationRecruitmentRecordKind,
    "evidence_response" | "interview_completed" | "feedback"
  >;
  readonly sharedMessage?: string;
  readonly internalNote?: string;
}

interface ListVerificationRequestsFilterBase {
  readonly status?: VerificationRequestStatus;
}

export type ListVerificationRequestsInput = ListVerificationRequestsFilterBase &
  (
    | {
        readonly requestedVerifierActorId: ActorId;
        readonly requestedVerifierOrganizationId?: OrganizationId;
      }
    | {
        readonly requestedVerifierActorId?: never;
        readonly requestedVerifierOrganizationId: OrganizationId;
      }
  );

export type ListVerificationEventsInput =
  | {
      readonly verificationRequestId: string;
      readonly evidenceRecordId?: never;
    }
  | {
      readonly evidenceRecordId: EvidenceRecordId;
      readonly verificationRequestId?: never;
    };

export interface ListApplicationsInput {
  readonly opportunityId?: OpportunityId;
  readonly opportunityVersionId?: OpportunityVersionId;
  readonly initialStage?: "saved" | "preparing";
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
  provenance: EvidenceRecordReadModel["provenance"];
  initial_verification_state: EvidenceRecordReadModel["initialVerificationState"];
  proposal_source: EvidenceRecordReadModel["proposalSource"] | null;
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
  visibility: EvidenceRecordReadModel["visibility"];
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

interface CompleteVerificationRequestDecisionRow {
  request_id: string;
  request_evidence_record_id: string;
  request_subject_actor_id: string;
  request_requested_verifier_actor_id: string | null;
  request_requested_verifier_organization_id: string | null;
  request_consent_grant_id: string;
  request_scope_kind: EvidenceScopeKind;
  request_scope_skill_id: string | null;
  request_scope_literal_skill_label: string | null;
  request_scope_opportunity_id: string | null;
  request_scope_requirement_id: string | null;
  request_scope_organization_id: string | null;
  request_scope_outcome_event_id: string | null;
  request_status: VerificationRequestStatus;
  request_requested_at: string;
  request_expires_at: string | null;
  request_closed_at: string | null;
  event_id: string;
  event_sequence_number: number;
  event_action: VerificationAction;
  event_actor_id: string;
  event_actor_organization_id: string | null;
  event_reason: string | null;
  event_occurred_at: string;
}

interface ApplicationRow {
  id: string;
  applicant_actor_id: string;
  opportunity_id: string;
  opportunity_version_id: string;
  owner_organization_id: string;
  initial_stage: "saved" | "preparing";
  created_at: string;
}

interface ApplicationEventRow {
  id: string;
  sequence_number: number;
  application_id: string;
  from_stage: ApplicationStage;
  to_stage: ApplicationStage;
  event_kind: "stage_transition" | "human_rejection";
  application_snapshot_id: string | null;
  actor_id: string;
  reason: string | null;
  note: string | null;
  occurred_at: string;
}

interface ApplicationRecruitmentRecordRow {
  id: string;
  application_id: string;
  application_event_id: string | null;
  outcome_event_id: string | null;
  kind: ApplicationRecruitmentRecordKind;
  actor_id: string;
  actor_organization_id: string | null;
  visibility: "applicant_and_recruiter" | "recruiter_internal";
  message: string | null;
  scheduled_at: string | null;
  schedule_timezone: string | null;
  interaction_mode: string | null;
  location_reference: string | null;
  expires_at: string | null;
  outcome_kind: ApplicationOutcomeKind | null;
  occurred_at: string;
}

interface ConsentGrantRow {
  id: string;
  subject_actor_id: string;
  grantee_organization_id: string;
  purpose: "application_review";
  granted_at: string;
  expires_at: string | null;
}

interface ConsentLifecycleEventRow {
  consent_grant_id: string;
  sequence_number: number;
  action: "granted" | "withdrawn" | "expired";
  occurred_at: string;
}

const evidenceSelect =
  "id,subject_actor_id,literal_claim,provenance,initial_verification_state,proposal_source,scope_kind,scope_skill_id,scope_literal_skill_label,scope_opportunity_id,scope_requirement_id,scope_organization_id,scope_outcome_event_id,source_system,source_record_id,source_url,source_captured_at,visibility,created_at";
const verificationRequestSelect =
  "id,evidence_record_id,subject_actor_id,requested_verifier_actor_id,requested_verifier_organization_id,consent_grant_id,scope_kind,scope_skill_id,scope_literal_skill_label,scope_opportunity_id,scope_requirement_id,scope_organization_id,scope_outcome_event_id,status,requested_at,expires_at,closed_at";
const verificationEventSelect =
  "id,sequence_number,verification_request_id,evidence_record_id,action,actor_id,actor_organization_id,reason,supersedes_event_id,occurred_at";
const applicationSelect =
  "id,applicant_actor_id,opportunity_id,opportunity_version_id,owner_organization_id,initial_stage,created_at";
const applicationEventSelect =
  "id,sequence_number,application_id,from_stage,to_stage,event_kind,application_snapshot_id,actor_id,reason,note,occurred_at";
const applicationRecruitmentRecordSelect =
  "id,sequence_number,application_id,application_event_id,outcome_event_id,kind,actor_id,actor_organization_id,visibility,message,scheduled_at,schedule_timezone,interaction_mode,location_reference,expires_at,outcome_kind,occurred_at";

function required(value: string | null, field: string): string {
  if (value === null)
    throw new Error(`Invalid SIH read row: ${field} is required for its scope`);
  return value;
}

function mapScope(
  row: Pick<
    EvidenceRecordRow,
    | "scope_kind"
    | "scope_skill_id"
    | "scope_literal_skill_label"
    | "scope_opportunity_id"
    | "scope_requirement_id"
    | "scope_organization_id"
    | "scope_outcome_event_id"
  >,
): EvidenceScopeReadModel {
  switch (row.scope_kind) {
    case "global_skill":
      return {
        kind: "global_skill",
        skillId: row.scope_skill_id ?? undefined,
        literalSkillLabel: required(
          row.scope_literal_skill_label,
          "scope_literal_skill_label",
        ),
      };
    case "opportunity":
      return {
        kind: "opportunity",
        opportunityId: required(
          row.scope_opportunity_id,
          "scope_opportunity_id",
        ),
        requirementId: row.scope_requirement_id ?? undefined,
      };
    case "organization":
      return {
        kind: "organization",
        organizationId: required(
          row.scope_organization_id,
          "scope_organization_id",
        ),
      };
    case "outcome":
      return {
        kind: "outcome",
        outcomeEventId: required(
          row.scope_outcome_event_id,
          "scope_outcome_event_id",
        ),
      };
  }
}

function mapEvidenceRecord(row: EvidenceRecordRow): EvidenceRecordReadModel {
  return {
    id: row.id as EvidenceRecordId,
    subjectActorId: row.subject_actor_id,
    literalClaim: row.literal_claim,
    provenance: row.provenance,
    initialVerificationState: row.initial_verification_state,
    proposalSource: row.proposal_source ?? undefined,
    scope: mapScope(row),
    source: {
      system: row.source_system,
      recordId: row.source_record_id ?? undefined,
      url: row.source_url ?? undefined,
      capturedAt: row.source_captured_at,
    },
    visibility: row.visibility,
    createdAt: row.created_at,
  };
}

function mapVerificationRequest(
  row: VerificationRequestRow,
): VerificationRequestReadModel {
  return {
    id: row.id,
    evidenceRecordId: row.evidence_record_id,
    subjectActorId: row.subject_actor_id,
    requestedVerifierActorId: row.requested_verifier_actor_id ?? undefined,
    requestedVerifierOrganizationId:
      row.requested_verifier_organization_id ?? undefined,
    consentGrantId: row.consent_grant_id,
    scope: mapScope(row),
    status: row.status,
    requestedAt: row.requested_at,
    expiresAt: row.expires_at ?? undefined,
    closedAt: row.closed_at ?? undefined,
  };
}

function mapVerificationEvent(
  row: VerificationEventRow,
): VerificationEventReadModel {
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
    return this.supabase.schema("sih26044");
  }

  async getCurrentActorId(): Promise<ActorId | null> {
    const { data, error } = await this.db().rpc("current_actor_id");
    if (error) throw error;
    return (data as ActorId | null) ?? null;
  }

  async getCurrentVerifierActingContexts(): Promise<
    VerifierActingContextReadModel[]
  > {
    const actorId = await this.getCurrentActorId();
    if (!actorId) return [];

    const { data: membershipData, error: membershipError } = await this.db()
      .from("organization_memberships")
      .select("id,organization_id,status,valid_from,valid_until")
      .eq("actor_id", actorId)
      .eq("status", "active");
    if (membershipError) throw membershipError;
    const now = Date.now();
    const memberships = (
      (membershipData ?? []) as Array<{
        id: string;
        organization_id: OrganizationId;
        status: string;
        valid_from: string;
        valid_until: string | null;
      }>
    ).filter(
      (membership) =>
        Date.parse(membership.valid_from) <= now &&
        (membership.valid_until === null ||
          Date.parse(membership.valid_until) > now),
    );
    if (memberships.length === 0) return [];

    const { data: roleData, error: roleError } = await this.db()
      .from("organization_membership_roles")
      .select("membership_id,role")
      .in(
        "membership_id",
        memberships.map((membership) => membership.id),
      );
    if (roleError) throw roleError;
    const rolesByMembership = new Map<
      string,
      Array<"faculty" | "issuer_verifier">
    >();
    for (const row of (roleData ?? []) as Array<{
      membership_id: string;
      role: string;
    }>) {
      if (row.role !== "faculty" && row.role !== "issuer_verifier") continue;
      rolesByMembership.set(row.membership_id, [
        ...(rolesByMembership.get(row.membership_id) ?? []),
        row.role,
      ]);
    }

    return memberships.flatMap((membership) => {
      const roles = rolesByMembership.get(membership.id) ?? [];
      return roles.length > 0
        ? [{ actorId, organizationId: membership.organization_id, roles }]
        : [];
    });
  }

  async listEvidenceForSubject(
    subjectActorId: ActorId,
  ): Promise<EvidenceRecordReadModel[]> {
    const { data, error } = await this.db()
      .from("evidence_records")
      .select(evidenceSelect)
      .eq("subject_actor_id", subjectActorId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    const rows = (data ?? []) as EvidenceRecordRow[];
    return rows.map(mapEvidenceRecord);
  }

  async getEvidenceRecord(
    evidenceRecordId: EvidenceRecordId,
  ): Promise<EvidenceRecordReadModel | null> {
    const { data, error } = await this.db()
      .from("evidence_records")
      .select(evidenceSelect)
      .eq("id", evidenceRecordId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapEvidenceRecord(data as EvidenceRecordRow) : null;
  }

  async listArtifactsForEvidence(
    evidenceRecordId: EvidenceRecordId,
  ): Promise<EvidenceArtifactReadModel[]> {
    const { data: linksData, error: linksError } = await this.db()
      .from("evidence_artifact_links")
      .select("evidence_record_id,artifact_id,linked_at")
      .eq("evidence_record_id", evidenceRecordId)
      .order("linked_at", { ascending: false });
    if (linksError) throw linksError;
    const links = (linksData ?? []) as Array<{
      evidence_record_id: string;
      artifact_id: string;
      linked_at: string;
    }>;
    if (links.length === 0) return [];
    const { data: artifactsData, error: artifactsError } = await this.db()
      .from("artifacts")
      .select(
        "id,storage_bucket_id,storage_object_path,media_type,display_name,integrity_fingerprint,scan_status,created_at",
      )
      .in(
        "id",
        links.map((link) => link.artifact_id),
      );
    if (artifactsError) throw artifactsError;
    const artifacts = new Map(
      (
        (artifactsData ?? []) as Array<{
          id: string;
          storage_bucket_id: string;
          storage_object_path: string;
          media_type: string;
          display_name: string;
          integrity_fingerprint: string | null;
          scan_status: EvidenceArtifactReadModel["scanStatus"];
          created_at: string;
        }>
      ).map((row) => [row.id, row]),
    );
    return links.flatMap((link) => {
      const artifact = artifacts.get(link.artifact_id);
      return artifact
        ? [
            {
              id: artifact.id,
              evidenceRecordId: link.evidence_record_id,
              mediaType: artifact.media_type,
              displayName: artifact.display_name,
              storageBucketId: artifact.storage_bucket_id,
              storageObjectPath: artifact.storage_object_path,
              integrityFingerprint: artifact.integrity_fingerprint ?? undefined,
              scanStatus: artifact.scan_status,
              linkedAt: link.linked_at,
              createdAt: artifact.created_at,
            },
          ]
        : [];
    });
  }

  async listVerificationRequestsForVerifier(
    input: ListVerificationRequestsInput,
  ): Promise<VerificationRequestReadModel[]> {
    let query = this.db()
      .from("verification_requests")
      .select(verificationRequestSelect)
      .order("requested_at", { ascending: false });
    if (input.requestedVerifierActorId)
      query = query.eq(
        "requested_verifier_actor_id",
        input.requestedVerifierActorId,
      );
    if (input.requestedVerifierOrganizationId)
      query = query.eq(
        "requested_verifier_organization_id",
        input.requestedVerifierOrganizationId,
      );
    if (input.status) query = query.eq("status", input.status);
    const { data, error } = await query;
    if (error) throw error;
    return ((data ?? []) as VerificationRequestRow[]).map(
      mapVerificationRequest,
    );
  }

  async listVerificationRequestsForSubject(
    subjectActorId: ActorId,
  ): Promise<VerificationRequestReadModel[]> {
    const { data, error } = await this.db()
      .from("verification_requests")
      .select(verificationRequestSelect)
      .eq("subject_actor_id", subjectActorId)
      .order("requested_at", { ascending: false });
    if (error) throw error;
    return ((data ?? []) as VerificationRequestRow[]).map(mapVerificationRequest);
  }

  async getVerificationRequest(
    verificationRequestId: string,
  ): Promise<VerificationRequestReadModel | null> {
    const { data, error } = await this.db()
      .from("verification_requests")
      .select(verificationRequestSelect)
      .eq("id", verificationRequestId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapVerificationRequest(data as VerificationRequestRow) : null;
  }

  async listVerificationEvents(
    input: ListVerificationEventsInput,
  ): Promise<VerificationEventReadModel[]> {
    let query = this.db()
      .from("verification_events")
      .select(verificationEventSelect)
      .order("sequence_number", { ascending: true });
    query =
      "verificationRequestId" in input
        ? query.eq("verification_request_id", input.verificationRequestId)
        : query.eq("evidence_record_id", input.evidenceRecordId);
    const { data, error } = await query;
    if (error) throw error;
    return ((data ?? []) as VerificationEventRow[]).map(mapVerificationEvent);
  }

  async listApplicationsForApplicant(
    applicantActorId: ActorId,
    input: ListApplicationsInput = {},
  ): Promise<ApplicationReadModel[]> {
    let query = this.db()
      .from("applications")
      .select(applicationSelect)
      .eq("applicant_actor_id", applicantActorId)
      .order("created_at", { ascending: false });
    if (input.opportunityId)
      query = query.eq("opportunity_id", input.opportunityId);
    if (input.opportunityVersionId)
      query = query.eq("opportunity_version_id", input.opportunityVersionId);
    if (input.initialStage)
      query = query.eq("initial_stage", input.initialStage);
    const { data, error } = await query;
    if (error) throw error;
    const rows = (data ?? []) as ApplicationRow[];
    return this.mapApplicationsWithCurrentStage(rows);
  }

  async listApplicationsForRecruiterOrganization(
    ownerOrganizationId: OrganizationId,
    input: ListApplicationsForRecruiterOrganizationInput = {},
  ): Promise<ApplicationReadModel[]> {
    let query = this.db()
      .from("applications")
      .select(applicationSelect)
      .eq("owner_organization_id", ownerOrganizationId)
      .order("created_at", { ascending: false });
    if (input.opportunityId)
      query = query.eq("opportunity_id", input.opportunityId);
    if (input.opportunityVersionId)
      query = query.eq("opportunity_version_id", input.opportunityVersionId);
    if (input.initialStage)
      query = query.eq("initial_stage", input.initialStage);
    const { data, error } = await query;
    if (error) throw error;
    const applications = await this.mapApplicationsWithCurrentStage(
      (data ?? []) as ApplicationRow[],
    );
    return input.currentStage
      ? applications.filter(
          (application) => application.currentStage === input.currentStage,
        )
      : applications;
  }

  async getApplication(
    applicationId: ApplicationId,
  ): Promise<ApplicationReadModel | null> {
    const { data, error } = await this.db()
      .from("applications")
      .select(applicationSelect)
      .eq("id", applicationId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return (
      (
        await this.mapApplicationsWithCurrentStage([data as ApplicationRow])
      )[0] ?? null
    );
  }

  private async mapApplicationsWithCurrentStage(
    rows: ApplicationRow[],
  ): Promise<ApplicationReadModel[]> {
    if (rows.length === 0) return [];
    const { data, error } = await this.db()
      .from("application_events")
      .select("application_id,to_stage,sequence_number")
      .in(
        "application_id",
        rows.map((row) => row.id),
      )
      .order("sequence_number", { ascending: false });
    if (error) throw error;
    const currentStages = new Map<string, ApplicationStage>();
    for (const event of (data ?? []) as Array<{
      application_id: string;
      to_stage: ApplicationStage;
      sequence_number: number;
    }>) {
      if (!currentStages.has(event.application_id))
        currentStages.set(event.application_id, event.to_stage);
    }
    return rows.map((row) => ({
      id: row.id as ApplicationId,
      applicantActorId: row.applicant_actor_id,
      opportunityId: row.opportunity_id,
      opportunityVersionId: row.opportunity_version_id,
      ownerOrganizationId: row.owner_organization_id,
      initialStage: row.initial_stage,
      currentStage: currentStages.get(row.id) ?? row.initial_stage,
      createdAt: row.created_at,
    }));
  }

  async listApplicationEvents(
    applicationId: ApplicationId,
  ): Promise<ApplicationEventReadModel[]> {
    const { data, error } = await this.db()
      .from("application_events")
      .select(applicationEventSelect)
      .eq("application_id", applicationId)
      .order("sequence_number", { ascending: true });
    if (error) throw error;
    return ((data ?? []) as ApplicationEventRow[]).map((row) => ({
      id: row.id,
      applicationId: row.application_id as ApplicationId,
      fromStage: row.from_stage,
      toStage: row.to_stage,
      eventKind: row.event_kind,
      applicationSnapshotId: row.application_snapshot_id ?? undefined,
      actorId: row.actor_id,
      reason: row.reason ?? undefined,
      note: row.note ?? undefined,
      occurredAt: row.occurred_at,
    }));
  }

  async getExactSubmittedApplicationSnapshot(
    applicationId: ApplicationId,
  ): Promise<ApplicationSnapshotReadModel | null> {
    const { data: events, error: eventError } = await this.db()
      .from("application_events")
      .select("application_snapshot_id,to_stage,event_kind,sequence_number")
      .eq("application_id", applicationId)
      .eq("to_stage", "applied")
      .eq("event_kind", "stage_transition")
      .order("sequence_number", { ascending: true })
      .limit(2);
    if (eventError) throw eventError;
    if (!events || events.length === 0) return null;
    if (events.length !== 1 || !events[0].application_snapshot_id) {
      throw new Error("Application history does not identify one exact submitted snapshot.");
    }
    const snapshotId = events[0].application_snapshot_id as string;
    const [snapshotResult, evidenceResult] = await Promise.all([
      this.db()
        .from("application_snapshots")
        .select("id,application_id,opportunity_version_id,readiness_result_id,engine_version,evidence_policy_version,recruiter_projection_version,captured_at,integrity_fingerprint,finalized_at")
        .eq("id", snapshotId)
        .eq("application_id", applicationId)
        .maybeSingle(),
      this.db()
        .from("application_snapshot_evidence")
        .select("evidence_record_id")
        .eq("application_snapshot_id", snapshotId),
    ]);
    if (snapshotResult.error) throw snapshotResult.error;
    if (evidenceResult.error) throw evidenceResult.error;
    const row = snapshotResult.data;
    if (!row || !row.finalized_at || !row.integrity_fingerprint) return null;
    return {
      id: row.id,
      applicationId: row.application_id as ApplicationId,
      opportunityVersionId: row.opportunity_version_id,
      readinessResultId: row.readiness_result_id,
      engineVersion: row.engine_version,
      evidencePolicyVersion: row.evidence_policy_version,
      recruiterProjectionVersion: row.recruiter_projection_version,
      capturedAt: row.captured_at,
      integrityFingerprint: row.integrity_fingerprint,
      finalizedAt: row.finalized_at,
      selectedEvidenceRecordIds: (evidenceResult.data ?? []).map(link => link.evidence_record_id as EvidenceRecordId).sort(),
    };
  }

  async listApplicationRecruitmentRecords(
    applicationId: ApplicationId,
  ): Promise<ApplicationRecruitmentRecordReadModel[]> {
    const { data, error } = await this.db()
      .from("application_recruitment_records")
      .select(applicationRecruitmentRecordSelect)
      .eq("application_id", applicationId)
      .order("sequence_number", { ascending: true });
    if (error) throw error;
    return ((data ?? []) as ApplicationRecruitmentRecordRow[]).map((row) => ({
      id: row.id,
      applicationId: row.application_id as ApplicationId,
      applicationEventId: row.application_event_id ?? undefined,
      outcomeEventId: row.outcome_event_id ?? undefined,
      kind: row.kind,
      actorId: row.actor_id,
      actorOrganizationId: row.actor_organization_id ?? undefined,
      visibility: row.visibility,
      message: row.message ?? undefined,
      scheduledAt: row.scheduled_at ?? undefined,
      scheduleTimezone: row.schedule_timezone ?? undefined,
      interactionMode: row.interaction_mode ?? undefined,
      locationReference: row.location_reference ?? undefined,
      expiresAt: row.expires_at ?? undefined,
      outcomeKind: row.outcome_kind ?? undefined,
      occurredAt: row.occurred_at,
    }));
  }

  async listApplicationReviewConsentsForSubject(
    subjectActorId: ActorId,
    granteeOrganizationId?: OrganizationId,
  ): Promise<ConsentGrantReadModel[]> {
    let query = this.db()
      .from("consent_grants")
      .select(
        "id,subject_actor_id,grantee_organization_id,purpose,granted_at,expires_at",
      )
      .eq("subject_actor_id", subjectActorId)
      .eq("purpose", "application_review")
      .order("granted_at", { ascending: false });
    if (granteeOrganizationId)
      query = query.eq("grantee_organization_id", granteeOrganizationId);
    const { data, error } = await query;
    if (error) throw error;
    const grants = (data ?? []) as ConsentGrantRow[];
    if (grants.length === 0) return [];
    const grantIds = grants.map((grant) => grant.id);
    const [eventsResult, evidenceResult] = await Promise.all([
      this.db()
        .from("consent_lifecycle_events")
        .select("consent_grant_id,sequence_number,action,occurred_at")
        .in("consent_grant_id", grantIds)
        .order("sequence_number", { ascending: false }),
      this.db()
        .from("consent_evidence_records")
        .select("consent_grant_id,evidence_record_id")
        .in("consent_grant_id", grantIds),
    ]);
    if (eventsResult.error) throw eventsResult.error;
    if (evidenceResult.error) throw evidenceResult.error;
    const latestEvents = new Map<string, ConsentLifecycleEventRow>();
    for (const event of (eventsResult.data ?? []) as ConsentLifecycleEventRow[])
      if (!latestEvents.has(event.consent_grant_id))
        latestEvents.set(event.consent_grant_id, event);
    const evidenceIds = new Map<string, string[]>();
    for (const link of (evidenceResult.data ?? []) as Array<{
      consent_grant_id: string;
      evidence_record_id: string;
    }>)
      evidenceIds.set(link.consent_grant_id, [
        ...(evidenceIds.get(link.consent_grant_id) ?? []),
        link.evidence_record_id,
      ]);
    const now = Date.now();
    return grants.map((grant) => {
      const latest = latestEvents.get(grant.id);
      const expired =
        grant.expires_at !== null && Date.parse(grant.expires_at) <= now;
      const status =
        expired || latest?.action === "expired"
          ? "expired"
          : latest?.action === "withdrawn"
            ? "withdrawn"
            : "granted";
      return {
        id: grant.id as ConsentRecordId,
        subjectActorId: grant.subject_actor_id,
        granteeOrganizationId: grant.grantee_organization_id,
        purpose: grant.purpose,
        evidenceRecordIds: (evidenceIds.get(grant.id) ??
          []) as EvidenceRecordId[],
        status,
        grantedAt: grant.granted_at,
        expiresAt: grant.expires_at ?? undefined,
        withdrawnAt:
          latest?.action === "withdrawn" ? latest.occurred_at : undefined,
      };
    });
  }

  async insertWeakEvidence(
    subjectActorId: string,
    input: InsertWeakEvidenceInput,
  ) {
    const { data, error } = await this.db()
      .from("evidence_records")
      .insert({
        subject_actor_id: subjectActorId,
        literal_claim: input.literalClaim,
        provenance: input.provenance,
        initial_verification_state:
          input.initialVerificationState ?? "unverified",
        proposal_source: input.proposalSource ?? "user_entry",
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
        visibility: input.visibility ?? "private",
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async grantConsent(subjectActorId: string, input: GrantConsentInput) {
    const { data: grant, error: grantError } = await this.db()
      .from("consent_grants")
      .insert({
        subject_actor_id: subjectActorId,
        grantee_organization_id: input.granteeOrganizationId ?? null,
        purpose: input.purpose,
        expires_at: input.expiresAt ?? null,
        created_by_actor_id: subjectActorId,
      })
      .select()
      .single();
    if (grantError) throw grantError;

    if (input.evidenceRecordIds.length > 0) {
      const records = input.evidenceRecordIds.map((evidenceId) => ({
        consent_grant_id: grant.id,
        evidence_record_id: evidenceId,
      }));
      const { error: linkError } = await this.db()
        .from("consent_evidence_records")
        .insert(records);
      if (linkError) throw linkError;
    }

    return grant;
  }

  async withdrawConsent(
    actorId: string,
    consentGrantId: string,
    reason = "User requested consent withdrawal",
  ) {
    const { data, error } = await this.db()
      .from("consent_lifecycle_events")
      .insert({
        consent_grant_id: consentGrantId,
        action: "withdrawn",
        actor_id: actorId,
        reason,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async requestVerification(
    subjectActorId: string,
    input: RequestVerificationInput,
  ) {
    const { data, error } = await this.db()
      .from("verification_requests")
      .insert({
        evidence_record_id: input.evidenceRecordId,
        subject_actor_id: subjectActorId,
        requested_verifier_actor_id: input.requestedVerifierActorId ?? null,
        requested_verifier_organization_id:
          input.requestedVerifierOrganizationId ?? null,
        consent_grant_id: input.consentGrantId,
        scope_kind: input.scopeKind,
        scope_skill_id: input.scopeSkillId ?? null,
        scope_literal_skill_label: input.scopeLiteralSkillLabel ?? null,
        scope_opportunity_id: input.scopeOpportunityId ?? null,
        scope_requirement_id: input.scopeRequirementId ?? null,
        scope_organization_id: input.scopeOrganizationId ?? null,
        scope_outcome_event_id: input.scopeOutcomeEventId ?? null,
        expires_at: input.expiresAt ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async createVerificationRequestWithConsent(
    input: CreateVerificationRequestWithConsentInput,
  ): Promise<CreateVerificationRequestWithConsentResult> {
    const { data, error } = await this.db().rpc(
      "create_verification_request_with_consent",
      {
        requested_evidence_record_id: input.evidenceRecordId,
        requested_verifier_organization_id:
          input.requestedVerifierOrganizationId,
        requested_expires_at: input.expiresAt ?? null,
      },
    );
    if (error) throw error;
    const row = (Array.isArray(data) ? data[0] : data) as
      | {
          verification_request_id: string;
          consent_grant_id: string;
        }
      | undefined;
    if (!row)
      throw new Error("Verification request RPC returned no result");
    return {
      verificationRequestId: row.verification_request_id,
      consentGrantId: row.consent_grant_id as ConsentRecordId,
    };
  }

  async appendVerificationEvent(
    actorId: string,
    input: AppendVerificationEventInput,
  ) {
    const { data, error } = await this.db()
      .from("verification_events")
      .insert({
        verification_request_id: input.verificationRequestId,
        evidence_record_id: input.evidenceRecordId,
        action: input.action,
        actor_id: actorId,
        actor_organization_id: input.actorOrganizationId ?? null,
        reason: input.reason ?? null,
        supersedes_event_id: input.supersedesEventId ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async completeVerificationRequestDecision(
    input: CompleteVerificationRequestDecisionInput,
  ): Promise<CompleteVerificationRequestDecisionResult> {
    const { data, error } = await this.db().rpc(
      "complete_verification_request_decision",
      {
        requested_verification_request_id: input.verificationRequestId,
        requested_evidence_record_id: input.evidenceRecordId,
        requested_action: input.action,
        requested_actor_organization_id: input.actorOrganizationId,
        requested_reason: input.reason ?? null,
      },
    );
    if (error) throw error;
    const row = (Array.isArray(data) ? data[0] : data) as
      CompleteVerificationRequestDecisionRow | undefined;
    if (!row) throw new Error("Verification decision RPC returned no result");

    return {
      verificationRequest: mapVerificationRequest({
        id: row.request_id,
        evidence_record_id: row.request_evidence_record_id,
        subject_actor_id: row.request_subject_actor_id,
        requested_verifier_actor_id: row.request_requested_verifier_actor_id,
        requested_verifier_organization_id:
          row.request_requested_verifier_organization_id,
        consent_grant_id: row.request_consent_grant_id,
        scope_kind: row.request_scope_kind,
        scope_skill_id: row.request_scope_skill_id,
        scope_literal_skill_label: row.request_scope_literal_skill_label,
        scope_opportunity_id: row.request_scope_opportunity_id,
        scope_requirement_id: row.request_scope_requirement_id,
        scope_organization_id: row.request_scope_organization_id,
        scope_outcome_event_id: row.request_scope_outcome_event_id,
        status: row.request_status,
        requested_at: row.request_requested_at,
        expires_at: row.request_expires_at,
        closed_at: row.request_closed_at,
      }),
      verificationEvent: mapVerificationEvent({
        id: row.event_id,
        sequence_number: row.event_sequence_number,
        verification_request_id: row.request_id,
        evidence_record_id: row.request_evidence_record_id,
        action: row.event_action,
        actor_id: row.event_actor_id,
        actor_organization_id: row.event_actor_organization_id,
        reason: row.event_reason,
        supersedes_event_id: null,
        occurred_at: row.event_occurred_at,
      }),
    };
  }

  async createApplication(
    applicantActorId: string,
    input: CreateApplicationInput,
  ) {
    const { data, error } = await this.db()
      .from("applications")
      .insert({
        applicant_actor_id: applicantActorId,
        opportunity_id: input.opportunityId,
        opportunity_version_id: input.opportunityVersionId,
        owner_organization_id: input.ownerOrganizationId,
        initial_stage: input.initialStage ?? "saved",
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async transitionApplicationStage(
    actorId: string,
    input: TransitionApplicationStageInput,
  ) {
    if (input.toStage !== "applied") {
      const kind: ApplicationRecruitmentRecordKind =
        input.toStage === "evidence_requested"
          ? "evidence_request"
          : input.toStage === "interview"
            ? "interview_scheduled"
            : input.toStage === "offered"
              ? "offer"
              : input.toStage === "outcome_recorded"
                ? "outcome"
                : "stage_transition";
      const { data, error } = await this.db().rpc(
        "record_application_recruitment_action",
        {
          requested_application_id: input.applicationId,
          requested_expected_from_stage: input.fromStage,
          requested_to_stage: input.toStage,
          requested_kind: kind,
          requested_message: input.sharedMessage ?? input.note ?? null,
          requested_reason: input.reason ?? null,
          requested_internal_note: input.internalNote ?? null,
          requested_scheduled_at: input.scheduledAt ?? null,
          requested_schedule_timezone: input.scheduleTimezone ?? null,
          requested_interaction_mode: input.interactionMode ?? null,
          requested_location_reference: input.locationReference ?? null,
          requested_expires_at: input.expiresAt ?? null,
          requested_outcome_kind: input.outcomeKind ?? null,
        },
      );
      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    }
    const { data, error } = await this.db()
      .from("application_events")
      .insert({
        application_id: input.applicationId,
        from_stage: input.fromStage,
        to_stage: input.toStage,
        event_kind: "stage_transition",
        application_snapshot_id: input.applicationSnapshotId ?? null,
        actor_id: actorId,
        reason: input.reason ?? null,
        note: input.note ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async recordApplicationRecruitmentAction(
    input: RecordApplicationRecruitmentActionInput,
  ) {
    const { data, error } = await this.db().rpc(
      "record_application_recruitment_action",
      {
        requested_application_id: input.applicationId,
        requested_expected_from_stage: input.currentStage,
        requested_to_stage: null,
        requested_kind: input.kind,
        requested_message: input.sharedMessage ?? null,
        requested_reason: null,
        requested_internal_note: input.internalNote ?? null,
        requested_scheduled_at: null,
        requested_schedule_timezone: null,
        requested_interaction_mode: null,
        requested_location_reference: null,
        requested_expires_at: null,
        requested_outcome_kind: null,
      },
    );
    if (error) throw error;
    return Array.isArray(data) ? data[0] : data;
  }

  /** Explicit high-impact publication action. The database function derives
   * actor authority from the authenticated session, validates confirmation,
   * freezes the version, updates the current version, and records the publisher. */
  async publishOpportunityVersion(
    opportunityVersionId: OpportunityVersionId,
  ): Promise<OpportunityVersionId> {
    const { data, error } = await this.db().rpc("publish_opportunity_version", {
      requested_version_id: opportunityVersionId,
    });
    if (error) throw error;
    if (data !== opportunityVersionId) {
      throw new Error(
        "Published opportunity version identity did not match the requested version.",
      );
    }
    return data as OpportunityVersionId;
  }
}
