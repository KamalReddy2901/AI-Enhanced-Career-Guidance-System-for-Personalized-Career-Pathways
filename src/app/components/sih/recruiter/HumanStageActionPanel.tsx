import { useEffect, useState } from 'react';
import type { ApplicationStage } from '../../../domain';
import type { RecordApplicationRecruitmentActionInput, TransitionApplicationStageInput } from '../../../services/sih/browserDal';

interface Props {
  readonly currentStage: ApplicationStage;
  readonly allowedNextStages: readonly ApplicationStage[];
  readonly onTransition: (input: Omit<TransitionApplicationStageInput, 'applicationId'>) => Promise<void>;
  readonly isProcessing: boolean;
  readonly onRecordAction: (input: Omit<RecordApplicationRecruitmentActionInput, 'applicationId' | 'currentStage'>) => Promise<void>;
}

export default function HumanStageActionPanel({ currentStage, allowedNextStages, onTransition, onRecordAction, isProcessing }: Props) {
  const [selectedStage, setSelectedStage] = useState<ApplicationStage | ''>('');
  const [reason, setReason] = useState('');
  const [sharedMessage, setSharedMessage] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [scheduleTimezone, setScheduleTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [interactionMode, setInteractionMode] = useState('');
  const [locationReference, setLocationReference] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [outcomeKind, setOutcomeKind] = useState<NonNullable<TransitionApplicationStageInput['outcomeKind']> | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [standaloneKind, setStandaloneKind] = useState<'interview_completed' | 'feedback'>('feedback');
  const [standaloneMessage, setStandaloneMessage] = useState('');

  useEffect(() => {
    if (currentStage !== 'interview' && standaloneKind === 'interview_completed') setStandaloneKind('feedback');
  }, [currentStage, standaloneKind]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedStage) return;

    if (selectedStage === 'rejected_by_human' && !reason.trim()) {
      setError('A reason is required when rejecting an application.');
      return;
    }
    if (selectedStage === 'evidence_requested' && !sharedMessage.trim()) {
      setError('Applicant-visible evidence request details are required.');
      return;
    }
    if (selectedStage === 'interview' && (!scheduledAt || !scheduleTimezone.trim() || !interactionMode.trim())) {
      setError('Interview date/time, timezone and mode are required.');
      return;
    }
    if (selectedStage === 'offered' && !sharedMessage.trim()) {
      setError('An applicant-visible offer summary is required.');
      return;
    }
    if (selectedStage === 'outcome_recorded' && !outcomeKind) {
      setError('Select the recorded outcome.');
      return;
    }

    try {
      await onTransition({
        fromStage: currentStage,
        toStage: selectedStage,
        reason: selectedStage === 'rejected_by_human' ? reason : undefined,
        sharedMessage: sharedMessage.trim() || undefined,
        internalNote: internalNote.trim() || undefined,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        scheduleTimezone: selectedStage === 'interview' ? scheduleTimezone.trim() : undefined,
        interactionMode: selectedStage === 'interview' ? interactionMode.trim() : undefined,
        locationReference: locationReference.trim() || undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        outcomeKind: outcomeKind || undefined,
      });
      setSelectedStage('');
      setReason('');
      setSharedMessage('');
      setInternalNote('');
      setScheduledAt('');
      setInteractionMode('');
      setLocationReference('');
      setExpiresAt('');
      setOutcomeKind('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update stage');
    }
  };

  const isRejected = selectedStage === 'rejected_by_human';
  const isValid = Boolean(selectedStage)
    && (!isRejected || reason.trim().length > 0)
    && (selectedStage !== 'evidence_requested' || sharedMessage.trim().length > 0)
    && (selectedStage !== 'interview' || Boolean(scheduledAt && scheduleTimezone.trim() && interactionMode.trim()))
    && (selectedStage !== 'offered' || sharedMessage.trim().length > 0)
    && (selectedStage !== 'outcome_recorded' || Boolean(outcomeKind));

  return (
    <div className="space-y-6 border-2 border-black bg-white p-6 shadow-[4px_4px_0_#111]">
      <div>
      <h3 className="mb-4 font-mono-ui text-[11px] font-black uppercase text-[#d63c1d]">
        Record Human Action
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block font-mono-ui text-[10px] font-black uppercase tracking-wide">
            Next Stage
          </label>
          <select
            value={selectedStage}
            onChange={e => {
              setSelectedStage(e.target.value as ApplicationStage);
              setError(null);
            }}
            disabled={isProcessing}
            className="w-full border-2 border-black p-2 text-sm focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#e7ff57]"
          >
            <option value="" disabled>Select stage...</option>
            {allowedNextStages.map(s => (
              <option key={s} value={s}>{s.replace(/_/g, ' ').toUpperCase()}</option>
            ))}
          </select>
        </div>

        {isRejected && (
          <div>
            <label className="mb-2 block font-mono-ui text-[10px] font-black uppercase tracking-wide text-[#d63c1d]">
              Reason (Required for Rejection)
            </label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              disabled={isProcessing}
              className="w-full border-2 border-black p-2 text-sm focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#e7ff57]"
              placeholder="e.g. Does not meet minimum experience requirement"
            />
          </div>
        )}

        {selectedStage === 'interview' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2 font-mono-ui text-[10px] font-black uppercase">Interview date and time
              <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} disabled={isProcessing} className="min-h-11 border-2 border-black p-2 text-sm normal-case" required />
            </label>
            <label className="grid gap-2 font-mono-ui text-[10px] font-black uppercase">Timezone
              <input value={scheduleTimezone} onChange={e => setScheduleTimezone(e.target.value)} disabled={isProcessing} className="min-h-11 border-2 border-black p-2 text-sm normal-case" required />
            </label>
            <label className="grid gap-2 font-mono-ui text-[10px] font-black uppercase">Mode
              <select value={interactionMode} onChange={e => setInteractionMode(e.target.value)} disabled={isProcessing} className="min-h-11 border-2 border-black p-2 text-sm normal-case" required>
                <option value="">Select mode…</option><option value="video">Video</option><option value="phone">Phone</option><option value="in_person">In person</option>
              </select>
            </label>
            <label className="grid gap-2 font-mono-ui text-[10px] font-black uppercase">Location or joining reference
              <input value={locationReference} onChange={e => setLocationReference(e.target.value)} disabled={isProcessing} className="min-h-11 border-2 border-black p-2 text-sm normal-case" />
            </label>
          </div>
        )}

        {selectedStage === 'offered' && (
          <label className="grid gap-2 font-mono-ui text-[10px] font-black uppercase">Offer expiry (optional)
            <input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} disabled={isProcessing} className="min-h-11 border-2 border-black p-2 text-sm normal-case" />
          </label>
        )}

        {selectedStage === 'outcome_recorded' && (
          <label className="grid gap-2 font-mono-ui text-[10px] font-black uppercase">Outcome
            <select value={outcomeKind} onChange={e => setOutcomeKind(e.target.value as typeof outcomeKind)} disabled={isProcessing} className="min-h-11 border-2 border-black p-2 text-sm normal-case" required>
              <option value="">Select outcome…</option>
              {['selected','joined','completed','credential_awarded','project_delivered','placement_confirmed','engagement_completed'].map(value => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}
            </select>
          </label>
        )}

        <div>
          <label className="mb-2 block font-mono-ui text-[10px] font-black uppercase tracking-wide">
            {selectedStage === 'evidence_requested' ? 'Evidence request details' : selectedStage === 'offered' ? 'Offer summary' : 'Applicant-visible message (optional)'}
          </label>
          <textarea
            value={sharedMessage}
            onChange={e => setSharedMessage(e.target.value)}
            disabled={isProcessing}
            className="h-20 w-full resize-y border-2 border-black p-2 text-sm focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#e7ff57]"
            placeholder="Shared with the applicant in their append-only history."
          />
        </div>

        <div>
          <label className="mb-2 block font-mono-ui text-[10px] font-black uppercase tracking-wide">Recruiter-internal note (optional)</label>
          <textarea value={internalNote} onChange={e => setInternalNote(e.target.value)} disabled={isProcessing} className="h-20 w-full resize-y border-2 border-black p-2 text-sm" placeholder="Visible only to authorized recruiters for this organization." />
        </div>

        {error && (
          <p className="font-mono-ui text-[10px] font-bold text-[#d63c1d]">{error}</p>
        )}

        <button
          type="submit"
          disabled={!isValid || isProcessing}
          className="w-full min-h-11 border-2 border-black bg-black px-4 py-2 font-mono-ui text-[11px] font-black uppercase tracking-wide text-white shadow-[3px_3px_0_#d63c1d] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#ff5c35] disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {isProcessing ? 'Processing...' : 'Record Transition'}
        </button>
      </form>
      </div>

      <form className="border-t-2 border-black pt-5" onSubmit={async event => {
        event.preventDefault(); setError(null);
        if (standaloneKind === 'feedback' && !standaloneMessage.trim()) { setError('Feedback text is required.'); return; }
        try {
          await onRecordAction({ kind: standaloneKind, sharedMessage: standaloneMessage.trim() || undefined, internalNote: undefined });
          setStandaloneMessage('');
        } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to record recruitment detail.'); }
      }}>
        <h4 className="font-mono-ui text-[10px] font-black uppercase">Record detail without changing stage</h4>
        <select value={standaloneKind} onChange={event => setStandaloneKind(event.target.value as typeof standaloneKind)} className="mt-3 min-h-11 w-full border-2 border-black p-2 text-sm">
          {currentStage === 'interview' && <option value="interview_completed">Interview completed</option>}
          <option value="feedback">Shared feedback</option>
        </select>
        <textarea value={standaloneMessage} onChange={event => setStandaloneMessage(event.target.value)} className="mt-3 min-h-20 w-full border-2 border-black p-2 text-sm" placeholder={standaloneKind === 'feedback' ? 'Applicant-visible feedback' : 'Applicant-visible interview follow-up (optional)'} />
        <button disabled={isProcessing || (standaloneKind === 'feedback' && !standaloneMessage.trim())} className="mt-3 min-h-11 w-full border-2 border-black bg-white px-4 text-xs font-black uppercase disabled:opacity-40">Record detail</button>
      </form>
    </div>
  );
}
