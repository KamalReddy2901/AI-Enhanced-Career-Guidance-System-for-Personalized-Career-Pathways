import type { OpportunityAudience, OpportunityType } from '../../../domain/opportunity';

export interface OpportunityBasicsDraft {
  title: string;
  description: string;
  type: OpportunityType | '';
  audiences: OpportunityAudience[];
  closesAt?: string;
}

interface Props {
  readonly draft: OpportunityBasicsDraft;
  readonly onChange: (draft: OpportunityBasicsDraft) => void;
}

const OPPORTUNITY_TYPES: OpportunityType[] = [
  'job', 'internship', 'apprenticeship', 'industrial_training',
  'faculty_internship', 'live_project', 'mentoring', 'workshop',
  'guest_lecture', 'fdp', 'consultancy', 'collaborative_research'
];

const AUDIENCES: OpportunityAudience[] = [
  'student', 'alumni', 'faculty', 'professional', 'institution'
];

export default function OpportunityBasicsSection({ draft, onChange }: Props) {
  const update = (updates: Partial<OpportunityBasicsDraft>) => {
    onChange({ ...draft, ...updates });
  };

  const toggleAudience = (audience: OpportunityAudience) => {
    if (draft.audiences.includes(audience)) {
      update({ audiences: draft.audiences.filter(a => a !== audience) });
    } else {
      update({ audiences: [...draft.audiences, audience] });
    }
  };

  return (
    <section className="border-2 border-black bg-white p-6 shadow-[4px_4px_0_#111]">
      <h2 className="mb-4 text-xl font-black uppercase tracking-wide">Basics</h2>
      
      <div className="grid gap-6">
        <div>
          <label className="mb-2 block font-mono-ui text-[11px] font-black uppercase text-[#d63c1d]">
            Title
          </label>
          <input
            type="text"
            className="w-full border-2 border-black p-3 text-sm focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#e7ff57]"
            value={draft.title}
            onChange={e => update({ title: e.target.value })}
            placeholder="e.g. Junior Frontend Developer"
          />
        </div>

        <div>
          <label className="mb-2 block font-mono-ui text-[11px] font-black uppercase text-[#d63c1d]">
            Description
          </label>
          <textarea
            className="h-32 w-full resize-y border-2 border-black p-3 text-sm focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#e7ff57]"
            value={draft.description}
            onChange={e => update({ description: e.target.value })}
            placeholder="Describe the opportunity..."
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="mb-2 block font-mono-ui text-[11px] font-black uppercase text-[#d63c1d]">
              Type
            </label>
            <select
              className="w-full border-2 border-black p-3 text-sm focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#e7ff57]"
              value={draft.type}
              onChange={e => update({ type: e.target.value as OpportunityType })}
            >
              <option value="" disabled>Select a type...</option>
              {OPPORTUNITY_TYPES.map(t => (
                <option key={t} value={t}>{t.replace('_', ' ').toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block font-mono-ui text-[11px] font-black uppercase text-[#d63c1d]">
              Closes At (Optional)
            </label>
            <input
              type="datetime-local"
              className="w-full border-2 border-black p-3 text-sm focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#e7ff57]"
              value={draft.closesAt ? draft.closesAt.slice(0, 16) : ''}
              onChange={e => update({ closesAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block font-mono-ui text-[11px] font-black uppercase text-[#d63c1d]">
            Target Audiences
          </label>
          <div className="flex flex-wrap gap-2">
            {AUDIENCES.map(aud => {
              const selected = draft.audiences.includes(aud);
              return (
                <button
                  key={aud}
                  type="button"
                  onClick={() => toggleAudience(aud)}
                  className={`border-2 border-black px-3 py-1 font-mono-ui text-[10px] font-black uppercase transition-colors ${selected ? 'bg-black text-[#e7ff57]' : 'bg-transparent text-black hover:bg-black/5'}`}
                >
                  {aud}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
