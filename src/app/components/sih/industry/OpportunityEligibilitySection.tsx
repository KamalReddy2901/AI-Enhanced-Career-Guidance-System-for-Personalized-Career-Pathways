import type { EligibilityRule, EligibilityEducationLevel } from '../../../domain/opportunity';
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
      } as EligibilityRule
    ]);
  };

  const updateRule = (index: number, updates: Partial<EligibilityRule>) => {
    const next = [...rules];
    next[index] = { ...next[index], ...updates } as EligibilityRule;
    // Changing literal wording, kind, or any structured field resets confirmation
    if (Object.keys(updates).some(k => k !== 'humanConfirmed' && k !== 'confirmedByActorId' && k !== 'confirmedAt' && k !== 'confirmationMethod')) {
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
    const literalSourceWording = rules[index].literalSourceWording;
    let newRule: any = {
      literalSourceWording,
      humanConfirmed: false
    };

    switch (newKind) {
      case 'custom':
        newRule = { ...newRule, kind: 'custom', machineEnforced: false };
        break;
      case 'education_level':
        newRule = { ...newRule, kind: 'education_level', operator: 'at_least', value: 'undergraduate' };
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
      case 'explicit_prerequisite':
        newRule = { ...newRule, kind: newKind, factKey: '', expectedValue: true };
        break;
      case 'licence_registration':
        newRule = { ...newRule, kind: newKind, licenceCode: '', expectedValue: true };
        break;
      case 'work_authorization':
        newRule = { ...newRule, kind: 'work_authorization', jurisdiction: 'IN' };
        break;
      case 'language':
        newRule = { ...newRule, kind: 'language', language: 'en' };
        break;
    }
    const next = [...rules];
    next[index] = newRule;
    onChange(next);
  };

  const renderStructuredFields = (rule: EligibilityRule, index: number) => {
    switch (rule.kind) {
      case 'education_level':
        return (
          <>
            <div>
              <label className="mb-2 block font-mono-ui text-[10px] font-black uppercase text-[#d63c1d]">Operator</label>
              <select
                className="w-full border-2 border-black p-2 text-sm focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#e7ff57]"
                value={rule.operator}
                onChange={e => updateRule(index, { operator: e.target.value as 'at_least' | 'equals' })}
              >
                <option value="at_least">At Least</option>
                <option value="equals">Equals</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block font-mono-ui text-[10px] font-black uppercase text-[#d63c1d]">Education Level</label>
              <select
                className="w-full border-2 border-black p-2 text-sm focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#e7ff57]"
                value={rule.value}
                onChange={e => updateRule(index, { value: e.target.value as EligibilityEducationLevel })}
              >
                <option value="below_10">Below 10th</option>
                <option value="class_10">Class 10</option>
                <option value="class_12">Class 12</option>
                <option value="iti_diploma">ITI / Diploma</option>
                <option value="undergraduate">Undergraduate</option>
                <option value="postgraduate">Postgraduate</option>
              </select>
            </div>
          </>
        );
            case 'graduation_year':
        return (
          <>
            <div>
              <label className="mb-2 block font-mono-ui text-[10px] font-black uppercase text-[#d63c1d]">Operator</label>
              <select
                className="w-full border-2 border-black p-2 text-sm focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#e7ff57]"
                value={rule.operator}
                onChange={e => {
                  const op = e.target.value as 'before' | 'after' | 'between';
                  if (op === 'between') {
                    updateRule(index, { operator: op, value: [new Date().getFullYear(), new Date().getFullYear() + 2] } as any);
                  } else {
                    updateRule(index, { operator: op, value: new Date().getFullYear() } as any);
                  }
                }}
              >
                <option value="after">After</option>
                <option value="before">Before</option>
                <option value="between">Between</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block font-mono-ui text-[10px] font-black uppercase text-[#d63c1d]">Year(s)</label>
              {rule.operator === 'between' ? (
                <div className="flex gap-2">
                  <input
                    type="number"
                    className="w-full border-2 border-black p-2 text-sm focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#e7ff57]"
                    value={(rule.value as [number, number])[0]}
                    onChange={e => updateRule(index, { value: [parseInt(e.target.value, 10), (rule.value as [number, number])[1]] } as any)}
                  />
                  <input
                    type="number"
                    className="w-full border-2 border-black p-2 text-sm focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#e7ff57]"
                    value={(rule.value as [number, number])[1]}
                    onChange={e => updateRule(index, { value: [(rule.value as [number, number])[0], parseInt(e.target.value, 10)] } as any)}
                  />
                </div>
              ) : (
                <input
                  type="number"
                  className="w-full border-2 border-black p-2 text-sm focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#e7ff57]"
                  value={rule.value as number}
                  onChange={e => updateRule(index, { value: parseInt(e.target.value, 10) } as any)}
                />
              )}
            </div>
          </>
        );

      case 'location':
        return (
          <>
            <div>
              <label className="mb-2 block font-mono-ui text-[10px] font-black uppercase text-[#d63c1d]">Operator</label>
              <select
                className="w-full border-2 border-black p-2 text-sm focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#e7ff57]"
                value={rule.operator}
                onChange={e => updateRule(index, { operator: e.target.value as 'in' | 'not_in' } as any)}
              >
                <option value="in">In</option>
                <option value="not_in">Not In</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block font-mono-ui text-[10px] font-black uppercase text-[#d63c1d]">Values (comma separated)</label>
              <input
                type="text"
                className="w-full border-2 border-black p-2 text-sm focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#e7ff57]"
                value={rule.values.join(', ')}
                onChange={e => updateRule(index, { values: e.target.value.split(',').map(v => v.trim()).filter(Boolean) } as any)}
              />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                type="checkbox"
                id={`requiresPhysicalPresence-${index}`}
                className="h-4 w-4 border-2 border-black accent-black"
                checked={rule.requiresPhysicalPresence}
                onChange={e => updateRule(index, { requiresPhysicalPresence: e.target.checked } as any)}
              />
              <label htmlFor={`requiresPhysicalPresence-${index}`} className="font-mono-ui text-[11px] font-black uppercase">
                Requires Physical Presence
              </label>
            </div>
          </>
        );

      case 'organization_membership':
        return (
          <div className="sm:col-span-2">
            <label className="mb-2 block font-mono-ui text-[10px] font-black uppercase text-[#d63c1d]">Organization IDs (comma separated)</label>
            <input
              type="text"
              className="w-full border-2 border-black p-2 text-sm focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#e7ff57]"
              value={rule.organizationIds.join(', ')}
              onChange={e => updateRule(index, { organizationIds: e.target.value.split(',').map(v => v.trim()).filter(Boolean) as any } as any)}
            />
          </div>
        );

      case 'availability':
      case 'explicit_prerequisite':
        return (
          <>
            <div>
              <label className="mb-2 block font-mono-ui text-[10px] font-black uppercase text-[#d63c1d]">Fact Key</label>
              <input
                type="text"
                className="w-full border-2 border-black p-2 text-sm focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#e7ff57]"
                value={rule.factKey}
                onChange={e => updateRule(index, { factKey: e.target.value } as any)}
              />
            </div>
            <div>
              <label className="mb-2 block font-mono-ui text-[10px] font-black uppercase text-[#d63c1d]">Expected Value</label>
              <input
                type="text"
                className="w-full border-2 border-black p-2 text-sm focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#e7ff57]"
                value={rule.expectedValue.toString()}
                onChange={e => updateRule(index, { expectedValue: e.target.value === 'true' ? true : e.target.value === 'false' ? false : e.target.value } as any)}
              />
            </div>
          </>
        );

      case 'licence_registration':
        return (
          <>
            <div>
              <label className="mb-2 block font-mono-ui text-[10px] font-black uppercase text-[#d63c1d]">Licence Code</label>
              <input
                type="text"
                className="w-full border-2 border-black p-2 text-sm focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#e7ff57]"
                value={rule.licenceCode}
                onChange={e => updateRule(index, { licenceCode: e.target.value } as any)}
              />
            </div>
            <div>
              <label className="mb-2 block font-mono-ui text-[10px] font-black uppercase text-[#d63c1d]">Expected Value</label>
              <input
                type="text"
                className="w-full border-2 border-black p-2 text-sm focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#e7ff57]"
                value={rule.expectedValue.toString()}
                onChange={e => updateRule(index, { expectedValue: e.target.value === 'true' ? true : e.target.value === 'false' ? false : e.target.value } as any)}
              />
            </div>
          </>
        );

      case 'work_authorization':
        return (
          <div className="sm:col-span-2">
            <label className="mb-2 block font-mono-ui text-[10px] font-black uppercase text-[#d63c1d]">Jurisdiction</label>
            <input
              type="text"
              className="w-full border-2 border-black p-2 text-sm focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#e7ff57]"
              value={rule.jurisdiction}
              onChange={e => updateRule(index, { jurisdiction: e.target.value } as any)}
            />
          </div>
        );

      case 'language':
        return (
          <div className="sm:col-span-2">
            <label className="mb-2 block font-mono-ui text-[10px] font-black uppercase text-[#d63c1d]">Language Code</label>
            <input
              type="text"
              className="w-full border-2 border-black p-2 text-sm focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#e7ff57]"
              value={rule.language}
              onChange={e => updateRule(index, { language: e.target.value } as any)}
            />
          </div>
        );

      case 'custom':
        return (
          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              id={`machineEnforced-${index}`}
              className="h-4 w-4 border-2 border-black accent-black opacity-50"
              checked={false}
              readOnly
              disabled
            />
            <label htmlFor={`machineEnforced-${index}`} className="font-mono-ui text-[11px] font-black uppercase text-black/50">
              Machine Enforced (Disabled for custom)
            </label>
          </div>
        );
    }
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
                    {rule.kind.replace(/_/g, ' ')}
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

                {renderStructuredFields(rule, i)}
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