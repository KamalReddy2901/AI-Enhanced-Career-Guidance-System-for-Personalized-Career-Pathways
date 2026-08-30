import { useState } from 'react';
import type { ApplicationStage } from '../../../domain';
import type { TransitionApplicationStageInput } from '../../../services/sih/browserDal';

interface Props {
  readonly currentStage: ApplicationStage;
  readonly allowedNextStages: readonly ApplicationStage[];
  readonly onTransition: (input: Omit<TransitionApplicationStageInput, 'applicationId'>) => Promise<void>;
  readonly isProcessing: boolean;
}

export default function HumanStageActionPanel({ currentStage, allowedNextStages, onTransition, isProcessing }: Props) {
  const [selectedStage, setSelectedStage] = useState<ApplicationStage | ''>('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedStage) return;

    if (selectedStage === 'rejected_by_human' && !reason.trim()) {
      setError('A reason is required when rejecting an application.');
      return;
    }

    try {
      await onTransition({
        fromStage: currentStage,
        toStage: selectedStage,
        reason: selectedStage === 'rejected_by_human' ? reason : undefined,
        note: note.trim() || undefined,
      });
      setSelectedStage('');
      setReason('');
      setNote('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update stage');
    }
  };

  const isRejected = selectedStage === 'rejected_by_human';
  const isValid = selectedStage && (!isRejected || reason.trim().length > 0);

  return (
    <div className="border-2 border-black bg-white p-6 shadow-[4px_4px_0_#111]">
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

        <div>
          <label className="mb-2 block font-mono-ui text-[10px] font-black uppercase tracking-wide">
            Internal Note (Optional)
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            disabled={isProcessing}
            className="h-20 w-full resize-y border-2 border-black p-2 text-sm focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#e7ff57]"
            placeholder="Add any internal context for this transition..."
          />
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
  );
}
