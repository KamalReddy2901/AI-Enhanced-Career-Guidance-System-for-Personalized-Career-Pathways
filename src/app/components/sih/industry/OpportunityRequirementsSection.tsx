import { useState } from 'react';
import type {
  OpportunityRequirement,
  RequirementPriority,
  RequirementImportance,
  RequirementEvidenceExpectation,
  SkillOpportunityRequirement,
  ExperienceOpportunityRequirement,
  QualificationOpportunityRequirement,
  DocumentEvidenceOpportunityRequirement,
  QuestionnaireOpportunityRequirement,
  LogisticsOpportunityRequirement,
  LiteralOpportunityRequirement
} from '../../../domain/opportunity';
import type { ActorId, IsoTimestamp, OpportunityRequirementId } from '../../../domain/shared';
import type { SkillReviewSuggestion, CanonicalResolutionState } from '../../../domain/skillResolution';
import type { HumanConfirmationMethod } from '../../../domain/shared';
import SkillResolutionBadge from './SkillResolutionBadge';

interface Props {
  readonly requirements: readonly OpportunityRequirement[];
  readonly onChange: (requirements: OpportunityRequirement[]) => void;
  readonly currentActorId: ActorId;
}

const CATEGORIES = [
  { value: 'other_literal', label: 'Other Literal' },
  { value: 'skill', label: 'Skill' },
  { value: 'experience', label: 'Experience' },
  { value: 'qualification', label: 'Qualification' },
  { value: 'document_evidence', label: 'Document Evidence' },
  { value: 'questionnaire', label: 'Questionnaire' },
  { value: 'logistics', label: 'Logistics' }
];

type RequirementCategory = OpportunityRequirement['category'];

/** Resets the HumanConfirmationTrace to unconfirmed. */
function resetTrace(req: OpportunityRequirement): OpportunityRequirement {
  const next = { ...req, humanConfirmed: false as const } as any;
  delete next.confirmedByActorId;
  delete next.confirmedAt;
  delete next.confirmationMethod;
  return next;
}

function createBlankRequirement(index: number): LiteralOpportunityRequirement {
  return {
    id: `draft-req-${Date.now()}-${index}` as OpportunityRequirementId,
    category: 'other_literal',
    priority: 'required',
    importance: 3,
    evidenceExpectation: 'any_recorded',
    hardGate: false,
    literalSourceWording: '',
    humanConfirmed: false
  };
}

/** Per-requirement manual resolution editing state (not persisted in domain). */
interface ManualResolutionDraft {
  readonly skillId: string;
  readonly label: string;
}

export default function OpportunityRequirementsSection({ requirements, onChange, currentActorId }: Props) {
  // Track which requirement indices are in "manual resolve" mode, and their draft values
  const [manualDrafts, setManualDrafts] = useState<Record<number, ManualResolutionDraft>>({});

  const addRequirement = () => {
    onChange([...requirements, createBlankRequirement(requirements.length)]);
  };

  const updateRequirement = (index: number, updates: Partial<OpportunityRequirement>) => {
    const next = [...requirements];
    next[index] = { ...next[index], ...updates } as OpportunityRequirement;
    const highImpactKeys = ['literalSourceWording', 'priority', 'importance', 'evidenceExpectation', 'hardGate', 'category'];
    if (Object.keys(updates).some(k => highImpactKeys.includes(k))) {
      next[index] = resetTrace(next[index]);

      if (next[index].category === 'skill') {
        const skillReq = next[index] as SkillOpportunityRequirement;
        if ('literalSourceWording' in updates || !skillReq.canonicalResolution) {
          const resolution: CanonicalResolutionState = {
            state: 'unresolved',
            literalText: skillReq.literalSourceWording
          };
          (next[index] as any).canonicalResolution = resolution;
        }
      }
    }
    onChange(next);
  };

  const removeRequirement = (index: number) => {
    const next = [...requirements];
    next.splice(index, 1);
    onChange(next);
    // Clean up any manual draft for this index
    setManualDrafts(prev => {
      const copy = { ...prev };
      delete copy[index];
      return copy;
    });
  };

  const handleConfirmRequirement = (index: number, method: HumanConfirmationMethod) => {
    const next = [...requirements];
    const confirmed: OpportunityRequirement = {
      ...next[index],
      humanConfirmed: true,
      confirmedByActorId: currentActorId,
      confirmedAt: new Date().toISOString() as IsoTimestamp,
      confirmationMethod: method
    } as OpportunityRequirement;
    next[index] = confirmed;
    onChange(next);
  };

  /** Accept a supplied suggestion — single atomic state update. */
  const handleAcceptSuggestion = (index: number, suggestion: SkillReviewSuggestion) => {
    const next = [...requirements];
    const resolution: CanonicalResolutionState = {
      state: 'resolved',
      skillId: suggestion.skillId,
      matchKind: 'alias'
    };
    const accepted: SkillOpportunityRequirement = {
      ...next[index] as SkillOpportunityRequirement,
      canonicalResolution: resolution,
      humanConfirmed: true,
      confirmedByActorId: currentActorId,
      confirmedAt: new Date().toISOString() as IsoTimestamp,
      confirmationMethod: 'controlled_fixture' as HumanConfirmationMethod
    };
    next[index] = accepted;
    onChange(next);
  };

  /** Reject all suggestions — revert to unresolved preserving literal wording. */
  const handleRejectSuggestions = (index: number) => {
    const next = [...requirements];
    const req = next[index] as SkillOpportunityRequirement;
    const resolution: CanonicalResolutionState = {
      state: 'unresolved',
      literalText: req.literalSourceWording
    };
    const rejected: SkillOpportunityRequirement = {
      ...req,
      canonicalResolution: resolution
    };
    next[index] = rejected;
    onChange(next);
    // Close manual resolve panel if open
    setManualDrafts(prev => {
      const copy = { ...prev };
      delete copy[index];
      return copy;
    });
  };

  /** Open manual resolution panel. */
  const openManualResolve = (index: number) => {
    setManualDrafts(prev => ({
      ...prev,
      [index]: { skillId: '', label: '' }
    }));
  };

  /** Cancel manual resolution — close the panel without changing state. */
  const cancelManualResolve = (index: number) => {
    setManualDrafts(prev => {
      const copy = { ...prev };
      delete copy[index];
      return copy;
    });
  };

  /** Confirm a manually entered canonical skill ID/label. */
  const confirmManualResolve = (index: number) => {
    const draft = manualDrafts[index];
    if (!draft) return;

    const next = [...requirements];
    const req = next[index] as SkillOpportunityRequirement;

    if (draft.skillId.trim() === '') {
      // No trustworthy canonical skill ID — keep unresolved
      const resolution: CanonicalResolutionState = {
        state: 'unresolved',
        literalText: req.literalSourceWording
      };
      const updated: SkillOpportunityRequirement = {
        ...req,
        canonicalResolution: resolution,
        humanConfirmed: true,
        confirmedByActorId: currentActorId,
        confirmedAt: new Date().toISOString() as IsoTimestamp,
        confirmationMethod: 'structured_human_entry' as HumanConfirmationMethod
      };
      next[index] = updated;
    } else {
      // Human-supplied canonical skill ID
      const resolution: CanonicalResolutionState = {
        state: 'resolved',
        skillId: draft.skillId.trim(),
        matchKind: 'alias'
      };
      const updated: SkillOpportunityRequirement = {
        ...req,
        canonicalResolution: resolution,
        humanConfirmed: true,
        confirmedByActorId: currentActorId,
        confirmedAt: new Date().toISOString() as IsoTimestamp,
        confirmationMethod: 'structured_human_entry' as HumanConfirmationMethod
      };
      next[index] = updated;
    }

    onChange(next);
    cancelManualResolve(index);
  };

  const renderSkillReview = (req: SkillOpportunityRequirement, index: number) => {
    if (!req.canonicalResolution || req.canonicalResolution.state !== 'review_required') return null;

    const draft = manualDrafts[index];
    const isManualMode = draft !== undefined;

    return (
      <div className="mt-4 border-2 border-dashed border-[#ff5c35] bg-[#fffaf5] p-4">
        <p className="font-mono-ui text-[10px] font-black uppercase text-[#ff5c35]">Review Required</p>
        <p className="mt-1 text-sm text-black/80">
          The system found potential skill matches for: <span className="font-bold">"{req.canonicalResolution.literalText}"</span>
        </p>
        <p className="mt-1 font-mono-ui text-[10px] text-black/50">Controlled prototype — not live AI</p>

        <div className="mt-3 grid gap-2">
          {req.canonicalResolution.suggestions.map((suggestion, sIdx) => (
            <div key={sIdx} className="flex items-center justify-between border border-black/10 bg-white p-2">
              <div>
                <p className="text-sm font-bold">{suggestion.label}</p>
                <p className="font-mono-ui text-[10px] text-black/50">Score: {suggestion.score.toFixed(2)} — Suggestion only</p>
              </div>
              <button
                type="button"
                onClick={() => handleAcceptSuggestion(index, suggestion)}
                className="border-2 border-black bg-[#e7ff57] px-3 py-1 font-mono-ui text-[10px] font-black uppercase tracking-wide transition-colors hover:bg-black hover:text-[#e7ff57]"
              >
                Accept
              </button>
            </div>
          ))}
        </div>

        {isManualMode ? (
          <div className="mt-4 border-2 border-black bg-white p-4">
            <p className="mb-2 font-mono-ui text-[10px] font-black uppercase text-black">Manual Resolution</p>
            <p className="mb-3 text-xs text-black/60">
              Original wording: <span className="font-bold">"{req.literalSourceWording}"</span>
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block font-mono-ui text-[10px] font-black uppercase text-[#d63c1d]">
                  Canonical Skill ID
                </label>
                <input
                  type="text"
                  className="w-full border-2 border-black p-2 text-sm focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#e7ff57]"
                  value={draft.skillId}
                  onChange={e => setManualDrafts(prev => ({
                    ...prev,
                    [index]: { ...prev[index], skillId: e.target.value }
                  }))}
                  placeholder="e.g. skill:react-js"
                />
              </div>
              <div>
                <label className="mb-1 block font-mono-ui text-[10px] font-black uppercase text-[#d63c1d]">
                  Canonical Label
                </label>
                <input
                  type="text"
                  className="w-full border-2 border-black p-2 text-sm focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#e7ff57]"
                  value={draft.label}
                  onChange={e => setManualDrafts(prev => ({
                    ...prev,
                    [index]: { ...prev[index], label: e.target.value }
                  }))}
                  placeholder="e.g. React.js"
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-black/50">
              Leave Canonical Skill ID blank to confirm as unresolved (no fabricated ID).
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => confirmManualResolve(index)}
                className="border-2 border-black bg-black px-3 py-1 font-mono-ui text-[10px] font-black uppercase tracking-wide text-white transition-colors hover:bg-transparent hover:text-black"
              >
                Confirm Manual Resolution
              </button>
              <button
                type="button"
                onClick={() => cancelManualResolve(index)}
                className="border-2 border-black bg-white px-3 py-1 font-mono-ui text-[10px] font-black uppercase tracking-wide text-black transition-colors hover:bg-black hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => openManualResolve(index)}
              className="border-2 border-black bg-white px-3 py-1 font-mono-ui text-[10px] font-black uppercase tracking-wide text-black transition-colors hover:bg-black hover:text-white"
            >
              Edit / resolve manually
            </button>
            <button
              type="button"
              onClick={() => handleRejectSuggestions(index)}
              className="border-2 border-black bg-white px-3 py-1 font-mono-ui text-[10px] font-black uppercase tracking-wide text-black transition-colors hover:bg-black hover:text-white"
            >
              Reject suggestion(s) / keep unresolved
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="border-2 border-black bg-white p-6 shadow-[4px_4px_0_#111]">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-black uppercase tracking-wide">Requirements</h2>
        <button
          type="button"
          onClick={addRequirement}
          className="border-2 border-black bg-[#e7ff57] px-3 py-1 font-mono-ui text-[10px] font-black uppercase tracking-wide shadow-[2px_2px_0_#111] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#ff5c35]"
        >
          + Add Requirement
        </button>
      </div>

      {requirements.length === 0 ? (
        <p className="font-mono-ui text-sm text-black/60">No requirements added yet.</p>
      ) : (
        <div className="grid gap-4">
          {requirements.map((req, i) => (
            <div key={req.id} className="border-2 border-black bg-[#f7f4ed] p-4">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex gap-2">
                  <span className="bg-black px-2 py-1 font-mono-ui text-[10px] font-black uppercase text-white">
                    {req.category.replace('_', ' ')}
                  </span>
                  {req.category === 'skill' && (req as SkillOpportunityRequirement).canonicalResolution && (
                    <SkillResolutionBadge resolution={(req as SkillOpportunityRequirement).canonicalResolution} />
                  )}
                  {req.humanConfirmed ? (
                    <span className="bg-[#16a34a] px-2 py-1 font-mono-ui text-[10px] font-black uppercase text-white">
                      Confirmed
                    </span>
                  ) : (
                    <span className="bg-amber-500 px-2 py-1 font-mono-ui text-[10px] font-black uppercase text-white">
                      Unconfirmed
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeRequirement(i)}
                  className="font-mono-ui text-[10px] font-black uppercase text-[#d63c1d] hover:underline"
                >
                  Remove
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-2 block font-mono-ui text-[10px] font-black uppercase text-[#d63c1d]">
                    Category
                  </label>
                  <select
                    className="w-full border-2 border-black p-2 text-sm focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#e7ff57]"
                    value={req.category}
                    onChange={e => updateRequirement(i, { category: e.target.value as RequirementCategory })}
                  >
                    {CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block font-mono-ui text-[10px] font-black uppercase text-[#d63c1d]">
                    Literal Source Wording
                  </label>
                  <input
                    type="text"
                    className="w-full border-2 border-black p-2 text-sm focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#e7ff57]"
                    value={req.literalSourceWording}
                    onChange={e => updateRequirement(i, { literalSourceWording: e.target.value })}
                    placeholder="e.g. 2+ years of React experience"
                  />
                </div>

                <div>
                  <label className="mb-2 block font-mono-ui text-[10px] font-black uppercase text-[#d63c1d]">
                    Priority
                  </label>
                  <select
                    className="w-full border-2 border-black p-2 text-sm focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#e7ff57]"
                    value={req.priority}
                    onChange={e => updateRequirement(i, { priority: e.target.value as RequirementPriority })}
                  >
                    <option value="required">Required</option>
                    <option value="preferred">Preferred</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block font-mono-ui text-[10px] font-black uppercase text-[#d63c1d]">
                    Importance (1-3)
                  </label>
                  <select
                    className="w-full border-2 border-black p-2 text-sm focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#e7ff57]"
                    value={req.importance}
                    onChange={e => updateRequirement(i, { importance: parseInt(e.target.value, 10) as RequirementImportance })}
                  >
                    <option value="1">1 - Low</option>
                    <option value="2">2 - Medium</option>
                    <option value="3">3 - High</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block font-mono-ui text-[10px] font-black uppercase text-[#d63c1d]">
                    Evidence Expectation
                  </label>
                  <select
                    className="w-full border-2 border-black p-2 text-sm focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#e7ff57]"
                    value={req.evidenceExpectation}
                    onChange={e => updateRequirement(i, { evidenceExpectation: e.target.value as RequirementEvidenceExpectation })}
                  >
                    <option value="any_recorded">Any Recorded</option>
                    <option value="artifact_expected">Artifact Expected</option>
                    <option value="human_or_issuer_expected">Human/Issuer Expected</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`hardGate-${req.id}`}
                      className="h-4 w-4 border-2 border-black accent-black"
                      checked={req.hardGate}
                      onChange={e => updateRequirement(i, { hardGate: e.target.checked })}
                    />
                    <label htmlFor={`hardGate-${req.id}`} className="font-mono-ui text-[11px] font-black uppercase">
                      Hard readiness / eligibility gate
                    </label>
                  </div>
                  <p className="text-xs text-black/60 pl-6">
                    A hard gate can affect deterministic opportunity eligibility/readiness. It does not automatically reject an application or make a recruitment decision.
                  </p>
                </div>
              </div>

              {req.category === 'skill' && renderSkillReview(req as SkillOpportunityRequirement, i)}

              {!req.humanConfirmed && (
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleConfirmRequirement(i, 'structured_human_entry')}
                    className="border-2 border-black bg-black px-4 py-2 font-mono-ui text-[10px] font-black uppercase tracking-wide text-white transition-colors hover:bg-transparent hover:text-black focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#e7ff57]"
                  >
                    Confirm Requirement Structure
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}