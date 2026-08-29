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

export interface CanonicalSkillOption {
  readonly id: string;
  readonly label: string;
}

interface Props {
  readonly requirements: readonly OpportunityRequirement[];
  readonly onChange: (requirements: OpportunityRequirement[]) => void;
  readonly currentActorId: ActorId;
  readonly canonicalSkillOptions?: readonly CanonicalSkillOption[];
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

/** * Returns a new requirement object with the human confirmation trace reset to false/undefined.
 * Fully type-safe reconstruction using discriminated union, without any type casting.
 */
function resetTrace(req: OpportunityRequirement): OpportunityRequirement {
  const base = {
    id: req.id,
    priority: req.priority,
    literalSourceWording: req.literalSourceWording,
    importance: req.importance,
    evidenceExpectation: req.evidenceExpectation,
    hardGate: req.hardGate,
    humanConfirmed: false as const,
    confirmedByActorId: undefined,
    confirmedAt: undefined,
    confirmationMethod: undefined
  };

  switch (req.category) {
    case 'skill':
      return { ...base, category: 'skill', canonicalResolution: req.canonicalResolution, minimumProficiency: req.minimumProficiency };
    case 'experience':
      return { ...base, category: 'experience', minimumYears: req.minimumYears };
    case 'qualification':
      return { ...base, category: 'qualification' };
    case 'document_evidence':
      return { ...base, category: 'document_evidence', requestedArtifactKind: req.requestedArtifactKind };
    case 'questionnaire':
      return { ...base, category: 'questionnaire', questionnaireReference: req.questionnaireReference };
    case 'logistics':
      return { ...base, category: 'logistics', logisticsKind: req.logisticsKind };
    case 'other_literal':
      return { ...base, category: 'other_literal' };
  }
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
    humanConfirmed: false,
    confirmedByActorId: undefined,
    confirmedAt: undefined,
    confirmationMethod: undefined
  };
}

/** Per-requirement manual resolution editing state */
interface ManualResolutionDraft {
  readonly skillId?: string;
}

export default function OpportunityRequirementsSection({ requirements, onChange, currentActorId, canonicalSkillOptions }: Props) {
  // Track which requirement indices are in "manual resolve" mode, and their selected canonical option
  const [manualDrafts, setManualDrafts] = useState<Record<number, ManualResolutionDraft>>({});

  const addRequirement = () => {
    onChange([...requirements, createBlankRequirement(requirements.length)]);
  };

  const replaceRequirement = (index: number, newReq: OpportunityRequirement) => {
    const next = [...requirements];
    next[index] = newReq;
    onChange(next);
  };

  const updateRequirementCategory = (index: number, newCategory: RequirementCategory) => {
    const req = requirements[index];
    const base = {
      id: req.id,
      priority: req.priority,
      literalSourceWording: req.literalSourceWording,
      importance: req.importance,
      evidenceExpectation: req.evidenceExpectation,
      hardGate: req.hardGate,
      humanConfirmed: false as const,
      confirmedByActorId: undefined,
      confirmedAt: undefined,
      confirmationMethod: undefined
    };

    let nextReq: OpportunityRequirement;
    switch (newCategory) {
      case 'skill':
        nextReq = { ...base, category: 'skill', canonicalResolution: { state: 'unresolved', literalText: req.literalSourceWording } };
        break;
      case 'experience':
        nextReq = { ...base, category: 'experience' };
        break;
      case 'qualification':
        nextReq = { ...base, category: 'qualification' };
        break;
      case 'document_evidence':
        nextReq = { ...base, category: 'document_evidence' };
        break;
      case 'questionnaire':
        nextReq = { ...base, category: 'questionnaire' };
        break;
      case 'logistics':
        nextReq = { ...base, category: 'logistics' };
        break;
      case 'other_literal':
        nextReq = { ...base, category: 'other_literal' };
        break;
    }
    replaceRequirement(index, nextReq);
  };

  const updateLiteralSourceWording = (index: number, wording: string) => {
    const req = resetTrace(requirements[index]);
    if (req.category === 'skill') {
      const resolution: CanonicalResolutionState = {
        state: 'unresolved',
        literalText: wording
      };
      replaceRequirement(index, { ...req, literalSourceWording: wording, canonicalResolution: resolution });
    } else {
      replaceRequirement(index, { ...req, literalSourceWording: wording });
    }
  };

  const updatePriority = (index: number, priority: RequirementPriority) => {
    const req = resetTrace(requirements[index]);
    replaceRequirement(index, { ...req, priority });
  };

  const updateImportance = (index: number, importance: RequirementImportance) => {
    const req = resetTrace(requirements[index]);
    replaceRequirement(index, { ...req, importance });
  };

  const updateEvidenceExpectation = (index: number, expectation: RequirementEvidenceExpectation) => {
    const req = resetTrace(requirements[index]);
    replaceRequirement(index, { ...req, evidenceExpectation: expectation });
  };

  const updateHardGate = (index: number, hardGate: boolean) => {
    const req = resetTrace(requirements[index]);
    replaceRequirement(index, { ...req, hardGate });
  };

  const removeRequirement = (index: number) => {
    const next = [...requirements];
    next.splice(index, 1);
    onChange(next);
    setManualDrafts(prev => {
      const copy = { ...prev };
      delete copy[index];
      return copy;
    });
  };

  const handleConfirmRequirement = (index: number, method: HumanConfirmationMethod) => {
    const req = requirements[index];
    const confirmed = {
      ...req,
      humanConfirmed: true,
      confirmedByActorId: currentActorId,
      confirmedAt: new Date().toISOString() as IsoTimestamp,
      confirmationMethod: method
    } as OpportunityRequirement; // Intersection safe due to discriminated union setup
    replaceRequirement(index, confirmed);
  };

  /** Accept a supplied suggestion — single atomic state update. */
  const handleAcceptSuggestion = (index: number, suggestion: SkillReviewSuggestion) => {
    const req = requirements[index];
    if (req.category !== 'skill') return;
    const resolution: CanonicalResolutionState = {
      state: 'resolved',
      skillId: suggestion.skillId,
      matchKind: 'alias'
    };
    const accepted: SkillOpportunityRequirement = {
      ...req,
      canonicalResolution: resolution,
      humanConfirmed: true,
      confirmedByActorId: currentActorId,
      confirmedAt: new Date().toISOString() as IsoTimestamp,
      confirmationMethod: 'controlled_fixture'
    };
    replaceRequirement(index, accepted);
  };

  /** Reject all suggestions — revert to unresolved preserving literal wording. */
  const handleRejectSuggestions = (index: number) => {
    const req = requirements[index];
    if (req.category !== 'skill') return;

    const resolution: CanonicalResolutionState = {
      state: 'unresolved',
      literalText: req.literalSourceWording
    };
    const rejected: SkillOpportunityRequirement = {
      ...req,
      canonicalResolution: resolution,
      humanConfirmed: false,
      confirmedByActorId: undefined,
      confirmedAt: undefined,
      confirmationMethod: undefined
    };
    replaceRequirement(index, rejected);
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
      [index]: { skillId: undefined }
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

  /** Confirm a manually selected canonical skill option. */
  const confirmManualResolve = (index: number) => {
    const draft = manualDrafts[index];
    if (!draft || !draft.skillId) return;

    const req = requirements[index];
    if (req.category !== 'skill') return;

    const opt = canonicalSkillOptions?.find(o => o.id === draft.skillId);
    if (!opt) return;

    const resolution: CanonicalResolutionState = {
      state: 'resolved',
      skillId: opt.id,
      matchKind: 'alias'
    };
    const updated: SkillOpportunityRequirement = {
      ...req,
      canonicalResolution: resolution,
      humanConfirmed: true,
      confirmedByActorId: currentActorId,
      confirmedAt: new Date().toISOString() as IsoTimestamp,
      confirmationMethod: 'structured_human_entry'
    };

    replaceRequirement(index, updated);
    cancelManualResolve(index);
  };

  /** Explicitly confirm that this requirement should remain unresolved. */
  const confirmKeepUnresolved = (index: number) => {
    const req = requirements[index];
    if (req.category !== 'skill') return;

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
      confirmationMethod: 'structured_human_entry'
    };

    replaceRequirement(index, updated);
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
            <div className="mb-4">
              <label className="mb-1 block font-mono-ui text-[10px] font-black uppercase text-[#d63c1d]">
                Select Trusted Canonical Option
              </label>
              <select
                className="w-full border-2 border-black p-2 text-sm focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#e7ff57]"
                value={draft.skillId ?? ''}
                onChange={e => setManualDrafts(prev => ({
                  ...prev,
                  [index]: { skillId: e.target.value }
                }))}
              >
                <option value="" disabled>-- Select an option --</option>
                {canonicalSkillOptions?.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label} ({opt.id})</option>
                ))}
              </select>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!draft.skillId}
                onClick={() => confirmManualResolve(index)}
                className="border-2 border-black bg-black px-3 py-1 font-mono-ui text-[10px] font-black uppercase tracking-wide text-white transition-colors hover:bg-transparent hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                Confirm Manual Resolution
              </button>
              <button
                type="button"
                onClick={() => confirmKeepUnresolved(index)}
                className="border-2 border-black bg-amber-200 px-3 py-1 font-mono-ui text-[10px] font-black uppercase tracking-wide text-black transition-colors hover:bg-amber-300"
              >
                Reviewed — keep unresolved
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
                    onChange={e => updateRequirementCategory(i, e.target.value as RequirementCategory)}
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
                    onChange={e => updateLiteralSourceWording(i, e.target.value)}
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
                    onChange={e => updatePriority(i, e.target.value as RequirementPriority)}
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
                    onChange={e => updateImportance(i, parseInt(e.target.value, 10) as RequirementImportance)}
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
                    onChange={e => updateEvidenceExpectation(i, e.target.value as RequirementEvidenceExpectation)}
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
                      onChange={e => updateHardGate(i, e.target.checked)}
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