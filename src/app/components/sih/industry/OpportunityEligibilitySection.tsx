import type { EligibilityRule } from '../../../domain/opportunity';

interface Props {
  readonly rules: readonly EligibilityRule[];
  readonly onChange: (rules: EligibilityRule[]) => void;
}

export default function OpportunityEligibilitySection({ rules, onChange }: Props) {
  const addRule = () => {
    onChange([
      ...rules,
      {
        kind: 'custom',
        machineEnforced: false,
        literalSourceWording: '',
        humanConfirmed: false
      }
    ]);
  };

  const updateRule = (index: number, updates: Partial<EligibilityRule>) => {
    const next = [...rules];
    next[index] = { ...next[index], ...updates } as EligibilityRule;
    if ('literalSourceWording' in updates) {
      (next[index] as any).humanConfirmed = false;
    }
    onChange(next);
  };

  const removeRule = (index: number) => {
    const next = [...rules];
    next.splice(index, 1);
    onChange(next);
  };

  return (
    <section className="border-2 border-black bg-white p-6 shadow-[4px_4px_0_#111]">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-black uppercase tracking-wide">Eligibility Rules</h2>
        <button
          type="button"
          onClick={addRule}
          className="border-2 border-black bg-[#e7ff57] px-3 py-1 font-mono-ui text-[10px] font-black uppercase tracking-wide shadow-[2px_2px_0_#111] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#ff5c35]"
        >
          + Add Rule
        </button>
      </div>

      {rules.length === 0 ? (
        <p className="font-mono-ui text-sm text-black/60">No eligibility rules added yet.</p>
      ) : (
        <div className="grid gap-4">
          {rules.map((rule, i) => (
            <div key={i} className="border-2 border-black bg-[#f7f4ed] p-4">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex gap-2">
                  <span className="bg-black px-2 py-1 font-mono-ui text-[10px] font-black uppercase text-white">
                    {rule.kind.replace('_', ' ')}
                  </span>
                  {rule.humanConfirmed && (
                    <span className="bg-[#16a34a] px-2 py-1 font-mono-ui text-[10px] font-black uppercase text-white">
                      Confirmed
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeRule(i)}
                  className="font-mono-ui text-[10px] font-black uppercase text-[#d63c1d] hover:underline"
                >
                  Remove
                </button>
              </div>

              <div>
                <label className="mb-2 block font-mono-ui text-[10px] font-black uppercase text-[#d63c1d]">
                  Literal Source Wording
                </label>
                <input
                  type="text"
                  className="w-full border-2 border-black p-2 text-sm focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#e7ff57]"
                  value={rule.literalSourceWording}
                  onChange={e => updateRule(i, { literalSourceWording: e.target.value })}
                  placeholder="e.g. Must be a current student"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
