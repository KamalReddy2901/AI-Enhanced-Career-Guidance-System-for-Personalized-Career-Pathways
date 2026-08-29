import type { EligibilityRule } from '../../../domain/opportunity';
import type { ActorId } from '../../../domain';

interface Props {
  readonly rules: readonly EligibilityRule[];
  readonly onChange: (rules: EligibilityRule[]) => void;
  readonly currentActorId: ActorId;
}

const KINDS = [
  'custom',
  'education_level',
  'graduation_year',
  'location',
  'organization_membership',
  'availability',
  'licence_registration',
  'work_authorization',
  'language',
  'explicit_prerequisite'
] as const;

export default function OpportunityEligibilitySection({ rules, onChange, currentActorId }: Props) {
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

    // Changing literal wording or kind resets confirmation
    if ('literalSourceWording' in updates || 'kind' in updates) {
      const rule = next[index] as any;
      rule.humanConfirmed = false;
      delete rule.confirmedByActorId;
      delete rule.confirmedAt;
      delete rule.confirmationMethod;
    }

    onChange(next);
  };

  const removeRule = (index: number) => {
    const next = [...rules];
    next.splice(index, 1);
    onChange(next);
  };

  const handleConfirmRule = (index: number) => {
    const next = [...rules];
    const rule = { ...next[index] } as any;
    rule.humanConfirmed = true;
    rule.confirmedByActorId = currentActorId;
    rule.confirmedAt = new Date().toISOString();
    rule.confirmationMethod = 'structured_human_entry';
    next[index] = rule;
    onChange(next);
  };

  const handleKindChange = (index: number, newKind: typeof KINDS[number]) => {
    const next = [...rules];
    let newRule: any = {
      literalSourceWording: next[index].literalSourceWording,
      humanConfirmed: false
    };

    switch (newKind) {
      case 'custom':
        newRule = { ...newRule, kind: 'custom', machineEnforced: false };
        break;
      case 'education_level':
        newRule = { ...newRule, kind: 'education_level', operator: 'at_least', value: 'bachelors' };
        break;
      case 'graduation_year':
        newRule = { ...newRule, kind: 'graduation_year', operator: 'after', value: new Date().getFullYear() };
        break;
      case 'location':
        newRule = { ...newRule, kind: 'location', operator: 'in', values: [], requiresPhysicalPresence: true };
        break;
      case 'organization_membership':
        newRule = { ...newRule, kind: 'organization_membership', organizationIds: [] };
        break;
      case 'availability':
      case 'licence_registration':
      case 'explicit_prerequisite':
        newRule = { ...newRule, kind: newKind, factKey: '', expectedValue: true };
        if (newKind === 'licence_registration') {
          newRule.licenceCode = '';
          delete newRule.factKey;
        }
        break;
      case 'work_authorization':
        newRule = { ...newRule, kind: 'work_authorization', jurisdiction: 'IN' };
        break;
      case 'language':
        newRule = { ...newRule, kind: 'language', language: 'en' };
        break;
    }
    next[index] = newRule;
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
                  {rule.humanConfirmed ? (
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
                  onClick={() => removeRule(i)}
                  className="font-mono-ui text-[10px] font-black uppercase text-[#d63c1d] hover:underline"
                >
                  Remove
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-2 block font-mono-ui text-[10px] font-black uppercase text-[#d63c1d]">
                    Kind
                  </label>
                  <select
                    className="w-full border-2 border-black p-2 text-sm focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#e7ff57]"
                    value={rule.kind}
                    onChange={e => handleKindChange(i, e.target.value as any)}
                  >
                    {KINDS.map(k => (
                      <option key={k} value={k}>{k.replace(/_/g, ' ')}</option>
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
                    value={rule.literalSourceWording}
                    onChange={e => updateRule(i, { literalSourceWording: e.target.value })}
                    placeholder="e.g. Must have graduated after 2022"
                  />
                </div>
              </div>

              {!rule.humanConfirmed && (
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleConfirmRule(i)}
                    className="border-2 border-black bg-black px-4 py-2 font-mono-ui text-[10px] font-black uppercase tracking-wide text-white transition-colors hover:bg-transparent hover:text-black focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#e7ff57]"
                  >
                    Confirm Rule Structure
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