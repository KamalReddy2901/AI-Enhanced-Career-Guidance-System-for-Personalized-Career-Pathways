import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { ActorId, OpportunityId, OpportunityRequirementId } from '../../../../domain/shared';
import type { SihTrustedApiClient } from '../../../../services/sih/SihTrustedApiClient';
import type { SihBrowserDal } from '../../../../services/sih/browserDal';
import { isEscape, trapFocus } from '../../../../utils/keyboardUtils';

interface EvidenceRecordComposerProps {
  readonly actorId: ActorId;
  readonly browserDal: SihBrowserDal;
  readonly trustedApi: SihTrustedApiClient;
  readonly requirementContext: {
    readonly opportunityId: string;
    readonly opportunityVersionId: string;
    readonly requirementId: string;
    readonly requirementLabel: string;
  };
  readonly onClose: () => void;
  readonly onSuccess: (evidenceRecordId: string) => void;
}

/**
 * Creates a subject-owned weak evidence claim for an opportunity requirement.
 * The claim remains self-reported/self-confirmed; the trusted Worker only
 * records the requirement-scoped readiness projection and never upgrades
 * provenance or verification authority.
 */
export function EvidenceRecordComposer({
  actorId,
  browserDal,
  trustedApi,
  requirementContext,
  onClose,
  onSuccess,
}: EvidenceRecordComposerProps) {
  const [literalClaim, setLiteralClaim] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const firstFocusable = modalRef.current?.querySelector('textarea, button') as HTMLElement;
    firstFocusable?.focus();
  }, []);

  function handleKeyDown(event: React.KeyboardEvent) {
    if (isEscape(event)) onClose();
    else if (modalRef.current) trapFocus(event, modalRef.current);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const claim = literalClaim.trim();
    if (!claim) {
      setError('Describe the capability or work demonstrated by this evidence.');
      return;
    }

    setSaving(true);
    setError(undefined);
    try {
      const record = await browserDal.insertWeakEvidence(actorId, {
        literalClaim: claim,
        provenance: 'self_reported',
        initialVerificationState: 'self_confirmed',
        proposalSource: 'user_entry',
        scopeKind: 'opportunity',
        scopeOpportunityId: requirementContext.opportunityId as OpportunityId,
        scopeRequirementId: requirementContext.requirementId as OpportunityRequirementId,
        sourceSystem: 'careercase_production_student_entry',
        sourceRecordId: requirementContext.opportunityVersionId,
        sourceCapturedAt: new Date().toISOString(),
        visibility: 'private',
      });

      await trustedApi.saveEvidenceProjection({
        evidenceRecordId: record.id,
        requirementId: requirementContext.requirementId,
        literalRequirementWording: requirementContext.requirementLabel,
        directness: 'explicit_claim',
        capabilityAssertion: 'supports',
        observedAt: new Date().toISOString(),
        confirmationMethod: 'structured_human_entry',
      });

      onSuccess(record.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Evidence claim could not be saved.');
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="evidence-record-title"
      onKeyDown={handleKeyDown}
    >
      <div ref={modalRef} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border-2 border-black bg-white shadow-[8px_8px_0_#111]">
        <header className="border-b-2 border-black bg-[#f7f4ed] p-5">
          <p className="font-mono-ui text-[10px] font-black uppercase tracking-[.2em] text-[#d63c1d]">Add evidence claim</p>
          <h2 id="evidence-record-title" className="mt-2 text-2xl font-black">Describe what you can prove</h2>
          <p className="mt-2 text-sm text-black/70">Requirement: <strong>{requirementContext.requirementLabel}</strong></p>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="absolute right-5 top-5 border-2 border-black bg-white p-2 hover:bg-black hover:text-white disabled:opacity-40"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-5">
          <label className="block font-mono-ui text-xs font-bold uppercase" htmlFor="evidence-literal-claim">
            Evidence claim
            <textarea
              id="evidence-literal-claim"
              value={literalClaim}
              onChange={(event) => setLiteralClaim(event.target.value)}
              disabled={saving}
              rows={4}
              placeholder="e.g., Compared two structured datasets in a spreadsheet and explained the finding."
              className="mt-2 block w-full border-2 border-black p-3 text-sm disabled:opacity-40"
            />
          </label>
          <p className="mt-2 text-xs leading-relaxed text-black/60">
            This is your self-reported claim. Adding a file will link a work sample, but it will not turn this claim into issuer verification or an automatic hiring signal.
          </p>

          {error && <div className="mt-4 border-2 border-[#d63c1d] bg-[#fff1ec] p-4 text-sm">{error}</div>}

          <div className="mt-6 flex gap-3">
            <button
              type="submit"
              disabled={saving || !literalClaim.trim()}
              className="border-2 border-black bg-[#e7ff57] px-5 py-2 font-mono-ui text-xs font-black uppercase disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save claim & add artifact'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
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
