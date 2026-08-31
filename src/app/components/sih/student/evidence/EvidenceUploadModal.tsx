import { useState, useRef, type FormEvent, useEffect } from 'react';
import type { ActorId, EvidenceRecordId, OrganizationId } from '../../../../domain/shared';
import type { SihTrustedApiClient } from '../../../../services/sih/SihTrustedApiClient';
import { supabase } from '../../../../services/supabase';
import { isEscape, trapFocus } from '../../../../utils/keyboardUtils';

interface EvidenceUploadModalProps {
  readonly actorId: ActorId;
  readonly trustedApi: SihTrustedApiClient;
  readonly evidenceRecordId?: EvidenceRecordId;
  readonly requirementContext?: {
    readonly opportunityVersionId: string;
    readonly requirementId: string;
    readonly skillLabel: string;
  };
  readonly onClose: () => void;
  readonly onSuccess: () => void;
}

export function EvidenceUploadModal({
  actorId,
  trustedApi,
  evidenceRecordId,
  requirementContext,
  onClose,
  onSuccess,
}: EvidenceUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string>();
  const [displayName, setDisplayName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File>();
  const [requestVerification, setRequestVerification] = useState(false);
  const [verifierOrganizationId, setVerifierOrganizationId] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus management: trap focus in modal and handle ESC key
  useEffect(() => {
    const firstFocusable = modalRef.current?.querySelector('input, button') as HTMLElement;
    firstFocusable?.focus();
  }, []);

  function handleKeyDown(event: React.KeyboardEvent) {
    if (isEscape(event)) {
      onClose();
    } else if (modalRef.current) {
      trapFocus(event, modalRef.current);
    }
  }

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!displayName) {
        setDisplayName(file.name);
      }
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selectedFile || !displayName.trim()) {
      setError('File and display name are required.');
      return;
    }

    setUploading(true);
    setError(undefined);

    try {
      // Generate artifact ID
      const artifactId = crypto.randomUUID();
      const fileName = selectedFile.name.replace(/[^A-Za-z0-9._-]/g, '_');
      const storagePath = `${actorId}/${artifactId}/${fileName}`;

      // Upload to Supabase Storage
      if (!supabase) {
        throw new Error('Supabase client is not configured.');
      }

      const { error: uploadError } = await supabase.storage
        .from('career-evidence-private')
        .upload(storagePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      setUploading(false);
      setRegistering(true);

      // Register artifact via trusted API
      const artifact = await trustedApi.registerArtifact({
        artifactId,
        storageObjectPath: storagePath,
        mediaType: selectedFile.type || 'application/octet-stream',
        displayName: displayName.trim(),
        evidenceRecordId: evidenceRecordId ?? undefined,
      });

      // If evidenceRecordId provided and requestVerification enabled, create verification request
      if (evidenceRecordId && requestVerification && verifierOrganizationId && supabase) {
        // First, create consent grant for evidence_verification purpose
        const { data: consentData, error: consentError } = await supabase
          .schema('sih26044')
          .from('consent_grants')
          .insert({
            subject_actor_id: actorId,
            recipient_organization_id: verifierOrganizationId,
            purpose: 'evidence_verification',
          })
          .select('id')
          .single();

        if (consentError) {
          throw new Error(`Consent grant failed: ${consentError.message}`);
        }

        const consentGrantId = consentData.id;

        // Link evidence to consent
        const { error: consentEvidenceError } = await supabase
          .schema('sih26044')
          .from('consent_evidence_records')
          .insert({
            consent_grant_id: consentGrantId,
            evidence_record_id: evidenceRecordId,
          });

        if (consentEvidenceError) {
          throw new Error(`Evidence consent link failed: ${consentEvidenceError.message}`);
        }

        // Create verification request
        const { error: requestError } = await supabase
          .schema('sih26044')
          .from('verification_requests')
          .insert({
            evidence_record_id: evidenceRecordId,
            subject_actor_id: actorId,
            requested_verifier_organization_id: verifierOrganizationId,
            consent_grant_id: consentGrantId,
            scope_kind: requirementContext ? 'opportunity' : 'global_skill',
            scope_opportunity_id: requirementContext?.opportunityVersionId ?? null,
            scope_requirement_id: requirementContext?.requirementId ?? null,
            scope_literal_skill_label: requirementContext?.skillLabel ?? null,
          });

        if (requestError) {
          throw new Error(`Verification request failed: ${requestError.message}`);
        }
      }

      setRegistering(false);
      onSuccess();
    } catch (err) {
      setUploading(false);
      setRegistering(false);
      setError(err instanceof Error ? err.message : 'Upload failed.');
    }
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
      onKeyDown={handleKeyDown}
    >
      <div ref={modalRef} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border-2 border-black bg-white shadow-[8px_8px_0_#111]">
        <header className="border-b-2 border-black bg-[#f7f4ed] p-5">
          <p className="font-mono-ui text-[10px] font-black uppercase tracking-[.2em] text-[#d63c1d]">
            Upload artifact evidence
          </p>
          <h2 id="upload-modal-title" className="mt-2 text-2xl font-black">Register work sample</h2>
          {requirementContext && (
            <p className="mt-2 text-sm text-black/70">
              For requirement: <strong>{requirementContext.skillLabel}</strong>
            </p>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={uploading || registering}
            className="absolute right-5 top-5 border-2 border-black bg-white p-2 hover:bg-black hover:text-white disabled:opacity-40"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-5">
          <div className="space-y-5">
            <div>
              <label className="block font-mono-ui text-xs font-bold uppercase">
                File
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  disabled={uploading || registering}
                  className="mt-2 block w-full border-2 border-black p-2 text-sm disabled:opacity-40"
                />
              </label>
              <p className="mt-2 text-xs text-black/60">
                Upload a PDF, image, ZIP archive, or link documentation demonstrating your capability.
              </p>
            </div>

            <div>
              <label className="block font-mono-ui text-xs font-bold uppercase">
                Display name
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={uploading || registering}
                  placeholder="e.g., React Portfolio Project"
                  className="mt-2 block w-full border-2 border-black p-2 text-sm disabled:opacity-40"
                />
              </label>
            </div>

            {evidenceRecordId && (
              <div className="border-2 border-black bg-[#fff4c7] p-4">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={requestVerification}
                    onChange={(e) => setRequestVerification(e.target.checked)}
                    disabled={uploading || registering}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-bold">Request verification</p>
                    <p className="mt-1 text-xs text-black/70">
                      After uploading, create a verification request to have a mentor or issuer attest to this evidence.
                    </p>
                  </div>
                </label>

                {requestVerification && (
                  <div className="mt-4">
                    <label className="block font-mono-ui text-xs font-bold uppercase">
                      Verifier organization ID
                      <input
                        type="text"
                        value={verifierOrganizationId}
                        onChange={(e) => setVerifierOrganizationId(e.target.value)}
                        disabled={uploading || registering}
                        placeholder="Organization UUID"
                        className="mt-2 block w-full border-2 border-black p-2 text-sm disabled:opacity-40"
                      />
                    </label>
                    <p className="mt-2 text-xs text-black/60">
                      The organization that will review and verify this evidence.
                    </p>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="border-2 border-[#d63c1d] bg-[#fff1ec] p-4 text-sm">
                {error}
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="submit"
              disabled={!selectedFile || !displayName.trim() || uploading || registering}
              className="border-2 border-black bg-[#e7ff57] px-5 py-2 font-mono-ui text-xs font-black uppercase disabled:opacity-40"
            >
              {uploading ? 'Uploading…' : registering ? 'Registering…' : 'Upload & Register'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={uploading || registering}
              className="border-2 border-black bg-white px-5 py-2 font-mono-ui text-xs font-black uppercase disabled:opacity-40"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
