import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { SihBrowserDal } from '../services/sih/browserDal';
import { VerificationRequestInbox } from '../components/sih/verification/VerificationRequestInbox';
import { VerificationRequestDetail } from '../components/sih/verification/VerificationRequestDetail';
import type {
  VerificationRequestReadModel,
  EvidenceRecordReadModel,
  VerificationEventReadModel,
  VerifierActingContextReadModel,
  TerminalVerificationDecisionAction,
} from '../services/sih/types';
import type { ExtendedArtifactReference } from '../components/evidence/ArtifactPreview';
import { supabase } from '../services/supabase';
import type { EvidenceArtifactId, EvidenceRecordId } from '../domain/shared';

interface VerificationDecisionFormData {
  readonly action: TerminalVerificationDecisionAction;
  readonly reason?: string;
}

export function VerificationPage() {
  const { user } = useAuth();

  const [requests, setRequests] = useState<VerificationRequestReadModel[]>([]);
  const [actingContexts, setActingContexts] = useState<VerifierActingContextReadModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  const [selectedRequest, setSelectedRequest] = useState<VerificationRequestReadModel | undefined>();
  const [evidence, setEvidence] = useState<EvidenceRecordReadModel | undefined>();
  const [artifacts, setArtifacts] = useState<ExtendedArtifactReference[] | undefined>();
  const [history, setHistory] = useState<VerificationEventReadModel[] | undefined>();
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<Error | null>(null);

  const dal = useMemo(() => {
    if (!supabase) throw new Error("Supabase client not initialized");
    return new SihBrowserDal(supabase);
  }, []);

  useEffect(() => {
    if (!user) return;

    let active = true;
    setIsLoading(true);

    dal.getCurrentVerifierActingContexts()
      .then(async contexts => {
        if (!active) return;
        setActingContexts(contexts);
        if (contexts.length === 0) {
          setRequests([]);
          return;
        }
        const actorId = contexts[0].actorId;
        const requestGroups = await Promise.all([
          dal.listVerificationRequestsForVerifier({ requestedVerifierActorId: actorId }),
          ...contexts.map(context => dal.listVerificationRequestsForVerifier({
            requestedVerifierOrganizationId: context.organizationId,
          })),
        ]);
        if (!active) return;
        const uniqueRequests = new Map(requestGroups.flat().map(request => [request.id, request]));
        setRequests([...uniqueRequests.values()]);
        setError(null);
      })
      .catch(err => {
        if (!active) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => { active = false; };
  }, [user, dal]);

  useEffect(() => {
    if (!selectedRequestId) {
      setSelectedRequest(undefined);
      setEvidence(undefined);
      setArtifacts(undefined);
      setHistory(undefined);
      setDetailError(null);
      return;
    }

    let active = true;
    setIsDetailLoading(true);
    setDetailError(null);

    async function loadDetail() {
      try {
        const req = await dal.getVerificationRequest(selectedRequestId!);
        if (!req) throw new Error('Verification request not found.');

        const ev = await dal.getEvidenceRecord(req.evidenceRecordId as EvidenceRecordId);
        if (!ev) throw new Error('Associated evidence record not found.');

        const arts = await dal.listArtifactsForEvidence(req.evidenceRecordId as EvidenceRecordId);

        const evts = await dal.listVerificationEvents({ verificationRequestId: req.id });

        if (!active) return;
        setSelectedRequest(req);
        setEvidence(ev);
        setArtifacts(arts.map(artifact => ({
          id: artifact.id as EvidenceArtifactId,
          mediaType: artifact.mediaType,
          storageReference: `${artifact.storageBucketId}/${artifact.storageObjectPath}`,
          displayName: artifact.displayName,
          checksum: artifact.integrityFingerprint,
          scanStatus: artifact.scanStatus,
          integrityFingerprint: artifact.integrityFingerprint,
        })));
        setHistory(evts);
      } catch (err) {
        if (!active) return;
        setDetailError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (active) setIsDetailLoading(false);
      }
    }

    void loadDetail();

    return () => { active = false; };
  }, [selectedRequestId, dal]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const selectedActingContext = selectedRequest
    ? actingContexts.find(context => context.organizationId === selectedRequest.requestedVerifierOrganizationId)
      ?? (selectedRequest.requestedVerifierActorId
        ? actingContexts.find(context => context.actorId === selectedRequest.requestedVerifierActorId)
        : undefined)
    : undefined;

  const handleActionSubmit = async (data: VerificationDecisionFormData) => {
    if (!selectedRequest || !selectedRequestId) return;
    if (!selectedActingContext) {
      setDetailError(new Error('No active authorized verifier organization matches this request.'));
      return;
    }
    setIsSubmitting(true);
    setDetailError(null);
    try {
      await dal.completeVerificationRequestDecision({
        verificationRequestId: selectedRequest.id,
        evidenceRecordId: selectedRequest.evidenceRecordId as EvidenceRecordId,
        action: data.action,
        actorOrganizationId: selectedActingContext.organizationId,
        reason: data.reason,
      });
      setIsSuccess(true);

      // Refresh request history
      const evts = await dal.listVerificationEvents({ verificationRequestId: selectedRequest.id });
      setHistory(evts);

      const req = await dal.getVerificationRequest(selectedRequest.id);
      if (req) {
        setSelectedRequest(req);
        // Also update in the list
        setRequests(prev => prev.map(p => p.id === req.id ? req : p));
      }
    } catch (err) {
      setDetailError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--paper)] p-4 md:p-8 flex items-center justify-center">
        <p className="text-muted-foreground">Please log in to view verification requests.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--paper)] p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">

        <header className="mb-8 border-b-2 border-[var(--ink)] pb-6">
          <h1 className="font-display text-4xl leading-[1.25]">Verifier Dashboard</h1>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">Review and manage your pending verification requests.</p>
        </header>

        {selectedRequestId && (selectedRequest || isDetailLoading || detailError) ? (
          <div>
            {isDetailLoading && !selectedRequest ? (
               <div className="py-12 text-center text-muted-foreground">Loading request details...</div>
            ) : detailError ? (
               <div className="py-12 text-center text-destructive">Failed to load detail: {detailError.message}</div>
            ) : selectedRequest && (
              <VerificationRequestDetail
                request={selectedRequest}
                evidence={evidence}
                artifacts={artifacts}
                history={history}
                isSubmitting={isSubmitting}
                isSuccess={isSuccess}
                error={detailError}
                onBack={() => {
                  setSelectedRequestId(null);
                  setIsSuccess(false);
                }}
                onSubmit={handleActionSubmit}
                canVerifyAsIssuer={selectedActingContext?.roles.includes('issuer_verifier') ?? false}
              />
            )}
          </div>
        ) : (
          <VerificationRequestInbox
            requests={requests}
            isLoading={isLoading}
            error={error}
            onOpenRequest={setSelectedRequestId}
          />
        )}
      </div>
    </div>
  );
}
