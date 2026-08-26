import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CreateApplicationSnapshotRequest,
  CreateApplicationSnapshotResponse,
} from './types';
import { SihRouteError } from './types';
import { recomputeAndPersistReadiness } from './readiness';
import { buildProductionRecruiterProjection } from '../../../src/app/services/sih/productionRecruiterProjection';
import type { ProductionRecruiterEvidenceItem } from '../../../src/app/services/sih/productionRecruiterProjection';

type Row = Record<string, any>;

export async function createAndFinalizeApplicationSnapshot(
  userClient: SupabaseClient,
  elevatedClient: SupabaseClient,
  actorId: string,
  req: CreateApplicationSnapshotRequest,
): Promise<CreateApplicationSnapshotResponse> {
  const dbUser = userClient.schema('sih26044');
  const dbElevated = elevatedClient.schema('sih26044');

  const { data: application, error: appError } = await dbUser
    .from('applications')
    .select('id, applicant_actor_id, opportunity_id, opportunity_version_id, owner_organization_id')
    .eq('id', req.applicationId)
    .maybeSingle();

  if (appError || !application || application.applicant_actor_id !== actorId) {
    throw new SihRouteError('NOT_FOUND', 404, 'Application not found.');
  }

  if (application.opportunity_version_id !== req.opportunityVersionId) {
    throw new SihRouteError('INVALID_REQUEST', 400, 'Opportunity version mismatch with application.');
  }

  // 1. Ensure canonical current readiness result
  const readinessResult = await recomputeAndPersistReadiness(
    userClient, elevatedClient, actorId, req.opportunityVersionId,
  );

  // 2. Verify active consent grant
  const { data: consentActive, error: consentErr } = await dbElevated.rpc('is_consent_active', {
    requested_consent_id: req.consentGrantId,
    requested_subject_actor_id: actorId,
    requested_grantee_organization_id: application.owner_organization_id,
    requested_purpose: 'application_review',
  });

  if (consentErr || !consentActive) {
    throw new SihRouteError('CONSENT_REQUIRED', 400, 'Active application_review consent is required for this employer.');
  }

  // 3. Verify all selected evidence records are covered by this consent
  // Use user-context client (RLS-authenticated) so the subject can only see
  // their own consent_evidence_records; no elevated SELECT required.
  const { data: coveredEvidence, error: coveredErr } = await dbUser
    .from('consent_evidence_records')
    .select('evidence_record_id')
    .eq('consent_grant_id', req.consentGrantId);

  if (coveredErr) {
    throw new SihRouteError('TRUSTED_PERSISTENCE_FAILURE', 500, 'Unable to verify consent coverage.');
  }

  const coveredSet = new Set((coveredEvidence ?? []).map(r => r.evidence_record_id));
  for (const evid of req.selectedEvidenceRecordIds) {
    if (!coveredSet.has(evid)) {
      throw new SihRouteError(
        'CONSENT_REQUIRED', 400,
        `Evidence record ${evid} is not covered by the granted application_review consent.`,
      );
    }
  }

  // 4. Query applicant actor info and subject facts for education summary
  // All reads below are subject-owned data -- use user-context client (RLS active).
  const [actorRes, factsRes, evidenceRes] = await Promise.all([
    dbUser.from('actors').select('display_name').eq('id', actorId).maybeSingle(),
    dbUser.from('readiness_subject_facts').select('education_level, graduation_year').eq('subject_actor_id', actorId).maybeSingle(),
    req.selectedEvidenceRecordIds.length
      ? dbUser.from('evidence_records').select('*').in('id', req.selectedEvidenceRecordIds)
      : Promise.resolve({ data: [] as Row[], error: null }),
  ]);

  const actorDisplayName = (actorRes.data as Row | null)?.display_name ?? 'Applicant';
  const facts = factsRes.data as Row | null;
  const educationSummary = facts?.education_level
    ? `${facts.education_level}${facts.graduation_year ? ` (Class of ${facts.graduation_year})` : ''}`
    : 'Not provided';

  // 5. Query clean linked artifacts for selected evidence
  const selectedEvidenceRows = (evidenceRes.data ?? []) as Row[];
  const evidenceIds = selectedEvidenceRows.map(r => r.id);
  const [linksRes, eventsRes] = evidenceIds.length ? await Promise.all([
    dbUser.from('evidence_artifact_links').select('evidence_record_id, artifact_id').in('evidence_record_id', evidenceIds),
    dbUser.from('verification_events').select('evidence_record_id, sequence_number, action').in('evidence_record_id', evidenceIds),
  ]) : [{ data: [] }, { data: [] }];

  const links = (linksRes.data ?? []) as Row[];
  const linkedArtifactIds = [...new Set(links.map(l => l.artifact_id))];
  const artifactRows = linkedArtifactIds.length
    ? ((await dbUser.from('artifacts').select('id, display_name, scan_status').in('id', linkedArtifactIds)).data ?? []) as Row[]
    : [];

  const cleanArtifactMap = new Map(
    artifactRows.filter(a => a.scan_status === 'clean').map(a => [a.id, a.display_name]),
  );

  const actionToState: Record<string, string> = {
    self_confirmed: 'self_confirmed', verified_by_human: 'human_verified',
    verified_by_issuer: 'issuer_verified', disputed: 'disputed', revoked: 'revoked', corrected: 'corrected',
  };

  const selectedEvidenceItems: ProductionRecruiterEvidenceItem[] = selectedEvidenceRows.map(rec => {
    const recEvents = ((eventsRes.data ?? []) as Row[])
      .filter(e => e.evidence_record_id === rec.id && e.action !== 'submitted_for_review')
      .sort((a, b) => Number(b.sequence_number) - Number(a.sequence_number));
    const currentVerification = recEvents[0] ? actionToState[recEvents[0].action] : rec.initial_verification_state;

    const cleanArtifactsForRec = links
      .filter(l => l.evidence_record_id === rec.id && cleanArtifactMap.has(l.artifact_id))
      .map(l => ({ id: l.artifact_id, name: cleanArtifactMap.get(l.artifact_id)! }));

    return {
      evidenceRecordId: rec.id,
      literalClaim: rec.literal_claim,
      provenance: rec.provenance,
      verificationState: currentVerification as any,
      artifactIds: cleanArtifactsForRec.map(a => a.id as any),
      artifactDisplayNames: cleanArtifactsForRec.map(a => a.name),
    };
  });

  // 6. Compute deterministic snapshot ID using same algorithm as DB
  //    Matches migration 014 create_application_snapshot() uuid_generate_v5 derivation
  const sortedEvidenceIds = [...req.selectedEvidenceRecordIds].sort();
  const sortedConsentIds = [req.consentGrantId].sort();
  const snapshotNamespace = 'b6c7d3a0-f2e1-4b89-9c05-1a2b3c4d5e6f';
  const canonicalMaterial = [
    'sih26044:snapshot',
    req.applicationId,
    req.opportunityVersionId,
    readinessResult.resultId,
    readinessResult.inputVersion,
    readinessResult.subjectFactsVersion,
    readinessResult.evidenceProjectionVersion,
    sortedEvidenceIds.join(','),
    sortedConsentIds.join(','),
    JSON.stringify(req.requirementResponses ?? {}),
    'recruiter-projection-v1',
  ].join(':');
  
  const encoder = new TextEncoder();
  const data = encoder.encode(snapshotNamespace + canonicalMaterial);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = new Uint8Array(hashBuffer);
  
  // UUIDv5: set version bits (4) and variant bits (10)
  hashArray[6] = (hashArray[6] & 0x0f) | 0x50;
  hashArray[8] = (hashArray[8] & 0x3f) | 0x80;
  
  const hex = Array.from(hashArray.slice(0, 16))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  const deterministicSnapshotId = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  
  const capturedAt = new Date().toISOString();

  // 7. Build allowlisted production recruiter projection with consent-minimized supporting evidence
  const allReqs = readinessResult.requiredRequirementResults.concat(readinessResult.preferredRequirementResults);
  const selectedEvidenceSet = new Set(req.selectedEvidenceRecordIds);
  
  const recruiterProjection = buildProductionRecruiterProjection({
    applicantDisplayName: actorDisplayName,
    applicationId: req.applicationId as any,
    applicationSnapshotId: deterministicSnapshotId as any,
    consentRecordId: req.consentGrantId as any,
    applicationStage: 'applied',
    opportunityId: application.opportunity_id as any,
    opportunityVersionId: req.opportunityVersionId as any,
    educationSummary,
    readinessResultId: readinessResult.resultId as any,
    readinessBand: readinessResult.readinessBand,
    requirements: allReqs.map(r => ({
      requirementId: r.requirementId,
      literalSourceWording: r.literalSourceWording,
      priority: r.priority,
      state: r.state,
      supportingEvidenceIds: r.supportingEvidenceIds.filter(id => selectedEvidenceSet.has(id)),
    })),
    evidence: selectedEvidenceItems,
  });

  // 8. Insert snapshot records via elevated RPC (migration 014: 14-param, deterministic ID)
  // p_id and p_captured_at removed; server assigns deterministic UUID via uuid_generate_v5.
  // p_applicant_actor_id added for actor ownership validation.
  const { data: createdSnapshot, error: createError } = await dbElevated.rpc('create_application_snapshot', {
    p_application_id: req.applicationId,
    p_opportunity_version_id: req.opportunityVersionId,
    p_readiness_result_id: readinessResult.resultId,
    p_engine_version: readinessResult.engineVersion,
    p_evidence_policy_version: readinessResult.policyVersion,
    p_input_version: readinessResult.inputVersion,
    p_subject_facts_version: readinessResult.subjectFactsVersion,
    p_evidence_projection_version: readinessResult.evidenceProjectionVersion,
    p_recruiter_projection_version: 'recruiter-projection-v1',
    p_recruiter_allowlist_projection: recruiterProjection,
    p_requirement_responses: req.requirementResponses ?? {},
    p_selected_evidence_ids: req.selectedEvidenceRecordIds,
    p_consent_grant_ids: [req.consentGrantId],
    p_applicant_actor_id: actorId,
  });

  if (createError) {
    throw new SihRouteError(
      'SNAPSHOT_CONFLICT',
      400,
      'Application snapshot conflicts with existing immutable material.',
    );
  }

  if (!createdSnapshot) {
    throw new SihRouteError(
      'TRUSTED_PERSISTENCE_FAILURE',
      500,
      'Trusted persistence operation failed.',
    );
  }

  // Server assigned the deterministic snapshot ID
  const createdRow = Array.isArray(createdSnapshot) ? createdSnapshot[0] : createdSnapshot;
  const serverSnapshotId = String(createdRow?.snapshot_id ?? createdRow?.id ?? '');
  
  // Validate: server ID must equal Worker-computed deterministic ID
  if (serverSnapshotId !== deterministicSnapshotId) {
    throw new SihRouteError(
      'TRUSTED_PERSISTENCE_FAILURE',
      500,
      'Snapshot identity mismatch between Worker and database.',
    );
  }
  
  // Validate: persisted projection.applicationSnapshotId must equal server ID
  const persistedProjectionSnapshotId = String(
    (createdRow?.recruiter_allowlist_projection as any)?.applicationSnapshotId ?? ''
  );
  if (persistedProjectionSnapshotId !== serverSnapshotId) {
    throw new SihRouteError(
      'TRUSTED_PERSISTENCE_FAILURE',
      500,
      'Persisted projection applicationSnapshotId does not match snapshot row ID.',
    );
  }

  // 9. Finalize snapshot with user client (carrying applicant JWT for current_actor_id() check)
  const { data: fingerprint, error: finalizeError } = await dbUser.rpc('finalize_application_snapshot', {
    requested_snapshot_id: serverSnapshotId,
  });

  if (finalizeError) {
    throw new SihRouteError(
      'TRUSTED_PERSISTENCE_FAILURE',
      500,
      'Snapshot finalization failed.',
    );
  }

  return {
    ok: true,
    snapshotId: serverSnapshotId,
    integrityFingerprint: fingerprint as string,
    finalizedAt: capturedAt,
    recruiterProjection,
  };
}
