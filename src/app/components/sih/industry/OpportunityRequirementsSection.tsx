import type {
  OpportunityRequirement,
  RequirementPriority,
  RequirementImportance,
  RequirementEvidenceExpectation
} from '../../../domain/opportunity';
import SkillResolutionBadge from './SkillResolutionBadge';

interface Props {
  readonly requirements: readonly OpportunityRequirement[];
  readonly onChange: (requirements: OpportunityRequirement[]) => void;
}

// Minimal stub for new requirements before they are saved/confirmed
function createBlankRequirement(index: number): OpportunityRequirement {
  return {
    id: `draft-req-${Date.now()}-${index}` as any,
    category: 'other_literal',
    priority: 'required',
    importance: 3,
    evidenceExpectation: 'any_recorded',
    hardGate: false,
    literalSourceWording: '',
    humanConfirmed: false
  };
}

export default function OpportunityRequirementsSection({ requirements, onChange }: Props) {
  const addRequirement = () => {
    onChange([...requirements, createBlankRequirement(requirements.length)]);
  };

  const updateRequirement = (index: number, updates: Partial<OpportunityRequirement>) => {
    const next = [...requirements];
    next[index] = { ...next[index], ...updates } as OpportunityRequirement;
    // Any edit resets human confirmation
    if ('literalSourceWording' in updates) {
      (next[index] as any).humanConfirmed = false;
    }
    onChange(next);
  };

  const removeRequirement = (index: number) => {
    const next = [...requirements];
    next.splice(index, 1);
    onChange(next);
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
                  {req.category === 'skill' && req.canonicalResolution && (
                    <SkillResolutionBadge resolution={req.canonicalResolution} />
                  )}
                  {req.humanConfirmed && (
                    <span className="bg-[#16a34a] px-2 py-1 font-mono-ui text-[10px] font-black uppercase text-white">
                      Confirmed
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
                
                <div className="flex items-center gap-2 sm:col-span-2">
                  <input
                    type="checkbox"
                    id={`hardGate-${req.id}`}
                    className="h-4 w-4 border-2 border-black accent-black"
                    checked={req.hardGate}
                    onChange={e => updateRequirement(i, { hardGate: e.target.checked })}
                  />
                  <label htmlFor={`hardGate-${req.id}`} className="font-mono-ui text-[11px] font-black uppercase">
                    Is Hard Gate (Auto-disqualify if missing)
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
