import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  DeriveArtifactBackedEvidenceRequest,
  RegisterArtifactRequest,
  RegisterArtifactResponse,
  SihEnv,
} from './types';
import { SihRouteError } from './types';
import { buildSupabaseStorageHeaders } from './storageHeaders';

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

  // Build storage headers: modern sb_secret_* keys must NOT go into Authorization Bearer.
  const storageUrl = `${env.SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/career-evidence-private/${req.storageObjectPath}`;
  let storageResponse: Response;
  try {
    storageResponse = await fetch(storageUrl, {
      headers: buildSupabaseStorageHeaders(elevatedKey),
    });
  } catch {
    throw new SihRouteError('TRUSTED_PERSISTENCE_FAILURE', 500, 'Failed to connect to storage.');
  }

  if (storageResponse.status === 404) {
    throw new SihRouteError('ARTIFACT_NOT_FOUND', 404, 'Storage object was not found.');
  }
  if (!storageResponse.ok) {
    // Safe: never forward raw storage error body which may contain internal details.
    throw new SihRouteError('TRUSTED_PERSISTENCE_FAILURE', 500, `Storage fetch returned an unexpected response.`);
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
    // Classify bounded errors; never forward raw DB message
    const rawMsg: string = error ? String((error as unknown as Record<string, unknown>).message ?? '') : '';
    if (rawMsg.includes('conflict') || rawMsg.includes('differs')) {
      throw new SihRouteError('SNAPSHOT_CONFLICT', 409, 'Artifact registration conflict: immutable material mismatch.');
    }
    throw new SihRouteError('TRUSTED_PERSISTENCE_FAILURE', 500, 'Unable to register artifact.');
  }

  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown>;
  return {
    id: row.id as string,
    subjectActorId: row.subject_actor_id as string,
    storageBucketId: row.storage_bucket_id as string,
    storageObjectPath: row.storage_object_path as string,
    mediaType: row.media_type as string,
    displayName: row.display_name as string,
    integrityFingerprint: row.integrity_fingerprint as string,
    scanStatus: row.scan_status as string,
    createdAt: row.created_at as string,
  };
}

/**
 * Derive artifact-backed evidence via the trusted RPC.
 *
 * The derivation_kind is always 'artifact_backed' (server-defined; browser cannot override).
 * The derived evidence ID is server-assigned (deterministic from source+artifact+kind).
 * Only canonical production confirmation methods are accepted.
 */
export async function deriveArtifactBackedEvidence(
  elevatedClient: SupabaseClient,
  actorId: string,
  req: DeriveArtifactBackedEvidenceRequest,
): Promise<Record<string, unknown>> {
  const { data, error } = await elevatedClient.schema('sih26044').rpc('derive_artifact_backed_evidence', {
    p_source_evidence_record_id: req.sourceEvidenceRecordId,
    p_artifact_id: req.artifactId,
    p_subject_actor_id: actorId,
    p_literal_claim: req.literalClaim ?? null,
    p_confirmed_by_actor_id: actorId,
    p_confirmation_method: req.confirmationMethod,
  });

  if (error || !data) {
    // Classify bounded errors; never forward raw DB message
    const rawMsg: string = error ? String((error as unknown as Record<string, unknown>).message ?? '') : '';
    if (rawMsg.includes('clean scan status') || rawMsg.includes('scan_status')) {
      throw new SihRouteError('ARTIFACT_NOT_USABLE', 400, 'Artifact must have a clean scan status to back evidence.');
    }
    if (rawMsg.includes('Source evidence') || rawMsg.includes('Artifact does not')) {
      throw new SihRouteError('INVALID_REQUEST', 400, 'Source evidence or artifact not found or does not belong to actor.');
    }
    if (rawMsg.includes('Artifact must be linked')) {
      throw new SihRouteError('INVALID_REQUEST', 400, 'Artifact must be linked to the source evidence before derivation.');
    }
    throw new SihRouteError('TRUSTED_PERSISTENCE_FAILURE', 500, 'Unable to derive artifact-backed evidence.');
  }

  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown>;
  return row;
}
