import { useState, useCallback } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SihTrustedApiClient } from '../services/sih/SihTrustedApiClient';
import type { RegisterArtifactResponse } from '../services/sih/types';

export interface UploadArtifactOptions {
  evidenceRecordId?: string;
  deriveEvidence?: boolean;
  literalClaim?: string;
}

export function useEvidenceArtifactUpload(
  supabase: SupabaseClient,
  apiClient: SihTrustedApiClient,
  actorId: string // Must be derived from authenticated session context in the component using this hook
) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const sanitizeFilename = (filename: string) => {
    // Basic sanitization: alphanumeric, dashes, dots, underscores
    return filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  };

  const uploadArtifact = useCallback(async (
    file: File,
    options: UploadArtifactOptions = {}
  ): Promise<RegisterArtifactResponse['artifact']> => {
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      if (!actorId) {
        throw new Error('Unauthenticated: Missing actor context.');
      }

      // Generate artifact ID according to project convention (UUID)
      const artifactId = crypto.randomUUID();
      const safeFilename = sanitizeFilename(file.name);
      
      // Target path: <actor-id>/<artifact-id>/<safe-filename>
      const storageObjectPath = `${actorId}/${artifactId}/${safeFilename}`;

      // Upload to private Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('career-evidence-private')
        .upload(storageObjectPath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError || !uploadData) {
        throw new Error(`Storage upload failed: ${uploadError?.message ?? 'Unknown error'}`);
      }
      
      setUploadProgress(50);

      // Register with trusted API
      const artifact = await apiClient.registerArtifact({
        artifactId,
        evidenceRecordId: options.evidenceRecordId,
        storageObjectPath,
        displayName: file.name, // Display name can be original
        mediaType: file.type || 'application/octet-stream',
      });

      setUploadProgress(80);

      // Optionally derive artifact-backed evidence if requested
      if (options.deriveEvidence && options.evidenceRecordId) {
        await apiClient.deriveArtifactBackedEvidence({
          sourceEvidenceRecordId: options.evidenceRecordId,
          artifactId,
          literalClaim: options.literalClaim,
          derivationKind: 'artifact_backed',
          confirmationMethod: 'direct_confirmation'
        });
      }

      setUploadProgress(100);
      return artifact;
    } catch (err) {
      const wrappedError = err instanceof Error ? err : new Error(String(err));
      setError(wrappedError);
      throw wrappedError;
    } finally {
      setIsUploading(false);
    }
  }, [supabase, apiClient, actorId]);

  return {
    uploadArtifact,
    isUploading,
    uploadProgress,
    error,
  };
}
