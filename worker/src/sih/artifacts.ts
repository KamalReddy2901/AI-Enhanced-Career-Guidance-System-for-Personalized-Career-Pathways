import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  DeriveArtifactBackedEvidenceRequest,
  RegisterArtifactRequest,
  RegisterArtifactResponse,
  SihEnv,
} from './types';
import { SihRouteError } from './types';

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

export async function computeSha256(bytes: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  return bufferToHex(hashBuffer);
}

export async function registerArtifact(
  elevatedClient: SupabaseClient,
  env: SihEnv,
  actorId: string,
  req: RegisterArtifactRequest,
): Promise<RegisterArtifactResponse['artifact']> {
  const pathRegex = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/;
  if (!pathRegex.test(req.storageObjectPath)) {
    throw new SihRouteError('INVALID_REQUEST', 400, 'Invalid storage object path format.');
  }

  const parts = req.storageObjectPath.split('/');
  if (parts[0] !== actorId || parts[1] !== req.artifactId) {
    throw new SihRouteError('ARTIFACT_PATH_MISMATCH', 403, 'Storage path does not match actor ID and artifact ID.');
  }

  const elevatedKey = env.SUPABASE_ELEVATED_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!elevatedKey || !env.SUPABASE_URL) {
    throw new SihRouteError('TRUSTED_PERSISTENCE_FAILURE', 500, 'Storage configuration is missing.');
  }

  // Fetch actual stored bytes from Supabase Storage API using elevated key
  const storageUrl = `${env.SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/career-evidence-private/${req.storageObjectPath}`;
  let storageResponse: Response;
  try {
    storageResponse = await fetch(storageUrl, {
      headers: {
        apikey: elevatedKey,
        Authorization: `Bearer ${elevatedKey}`,
      },
    });
  } catch {
    throw new SihRouteError('TRUSTED_PERSISTENCE_FAILURE', 500, 'Failed to connect to storage.');
  }

  if (storageResponse.status === 404) {
    throw new SihRouteError('ARTIFACT_NOT_FOUND', 404, 'Storage object was not found.');
  }
  if (!storageResponse.ok) {
    throw new SihRouteError('TRUSTED_PERSISTENCE_FAILURE', 500, `Storage fetch failed with status ${storageResponse.status}`);
  }

  const fileBytes = await storageResponse.arrayBuffer();
  const fingerprint = await computeSha256(fileBytes);

  const { data, error } = await elevatedClient.schema('sih26044').rpc('register_trusted_artifact', {
    p_artifact_id: req.artifactId,
    p_subject_actor_id: actorId,
    p_storage_bucket_id: 'career-evidence-private',
    p_storage_object_path: req.storageObjectPath,
    p_media_type: req.mediaType,
    p_display_name: req.displayName,
    p_integrity_fingerprint: fingerprint,
    p_evidence_record_id: req.evidenceRecordId ?? null,
  });

  if (error || !data) {
    const message = error ? (error as any).message : 'Unable to register artifact.';
    if (message.includes('conflict') || message.includes('differs')) {
      throw new SihRouteError('SNAPSHOT_CONFLICT', 409, message);
    }
    throw new SihRouteError('TRUSTED_PERSISTENCE_FAILURE', 500, message);
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    id: row.id,
    subjectActorId: row.subject_actor_id,
    storageBucketId: row.storage_bucket_id,
    storageObjectPath: row.storage_object_path,
    mediaType: row.media_type,
    displayName: row.display_name,
    integrityFingerprint: row.integrity_fingerprint,
    scanStatus: row.scan_status,
    createdAt: row.created_at,
  };
}

export async function deriveArtifactBackedEvidence(
  elevatedClient: SupabaseClient,
  actorId: string,
  req: DeriveArtifactBackedEvidenceRequest,
): Promise<Record<string, unknown>> {
  const validMethods = ['structured_human_entry', 'ai_assisted_review', 'direct_confirmation', 'self_assessment_review'];
  if (!validMethods.includes(req.confirmationMethod)) {
    throw new SihRouteError('INVALID_REQUEST', 400, 'Invalid human confirmation method for derivation.');
  }

  const derivedId = req.derivedEvidenceId ?? crypto.randomUUID();
  const { data, error } = await elevatedClient.schema('sih26044').rpc('derive_artifact_backed_evidence', {
    p_derived_evidence_id: derivedId,
    p_source_evidence_record_id: req.sourceEvidenceRecordId,
    p_artifact_id: req.artifactId,
    p_subject_actor_id: actorId,
    p_literal_claim: req.literalClaim ?? null,
    p_derivation_kind: req.derivationKind,
    p_confirmed_by_actor_id: actorId,
    p_confirmation_method: req.confirmationMethod,
  });

  if (error || !data) {
    const msg = error ? (error as any).message : 'Unable to derive artifact-backed evidence.';
    if (msg.includes('clean scan status')) {
      throw new SihRouteError('ARTIFACT_NOT_USABLE', 400, msg);
    }
    throw new SihRouteError('INVALID_REQUEST', 400, msg);
  }

  const row = Array.isArray(data) ? data[0] : data;
  return row as Record<string, unknown>;
}
