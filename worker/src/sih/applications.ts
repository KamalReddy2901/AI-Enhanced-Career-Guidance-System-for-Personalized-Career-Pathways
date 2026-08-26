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
  const { data: coveredEvidence, error: coveredErr } = await dbElevated
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
  const [actorRes, factsRes, evidenceRes] = await Promise.all([
    dbElevated.from('actors').select('display_name').eq('id', actorId).maybeSingle(),
    dbElevated.from('readiness_subject_facts').select('education_level, graduation_year').eq('subject_actor_id', actorId).maybeSingle(),
    req.selectedEvidenceRecordIds.length
      ? dbElevated.from('evidence_records').select('*').in('id', req.selectedEvidenceRecordIds)
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
    dbElevated.from('evidence_artifact_links').select('evidence_record_id, artifact_id').in('evidence_record_id', evidenceIds),
    dbElevated.from('verification_events').select('evidence_record_id, sequence_number, action').in('evidence_record_id', evidenceIds),
  ]) : [{ data: [] }, { data: [] }];

  const links = (linksRes.data ?? []) as Row[];
  const linkedArtifactIds = [...new Set(links.map(l => l.artifact_id))];
  const artifactRows = linkedArtifactIds.length
    ? ((await dbElevated.from('artifacts').select('id, display_name, scan_status').in('id', linkedArtifactIds)).data ?? []) as Row[]
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

  const snapshotId = crypto.randomUUID();
  const capturedAt = new Date().toISOString();

  // 6. Build allowlisted production recruiter projection
  const allReqs = readinessResult.requiredRequirementResults.concat(readinessResult.preferredRequirementResults);
  const recruiterProjection = buildProductionRecruiterProjection({
    applicantDisplayName: actorDisplayName,
    applicationId: req.applicationId as any,
    applicationSnapshotId: snapshotId as any,
    consentRecordId: req.consentGrantId as any,
    applicationStage: 'saved',
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
      supportingEvidenceIds: r.supportingEvidenceIds,
    })),
    evidence: selectedEvidenceItems,
  });

  // 7. Insert snapshot records via elevated RPC
  const { data: createdSnapshot, error: createError } = await dbElevated.rpc('create_application_snapshot', {
    p_id: snapshotId,
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
    p_captured_at: capturedAt,
  });

  if (createError || !createdSnapshot) {
    throw new SihRouteError('TRUSTED_PERSISTENCE_FAILURE', 500, createError ? (createError as any).message : 'Unable to create application snapshot.');
  }

  // 8. Finalize snapshot with user client (carrying applicant JWT for current_actor_id() check)
  const { data: fingerprint, error: finalizeError } = await dbUser.rpc('finalize_application_snapshot', {
    requested_snapshot_id: snapshotId,
  });

  if (finalizeError || !fingerprint) {
    throw new SihRouteError('TRUSTED_PERSISTENCE_FAILURE', 500, finalizeError ? (finalizeError as any).message : 'Snapshot finalization failed.');
  }

  return {
    ok: true,
    snapshotId,
    integrityFingerprint: fingerprint as string,
    finalizedAt: capturedAt,
    recruiterProjection,
  };
}
