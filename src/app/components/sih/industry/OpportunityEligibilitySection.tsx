import type {
  EligibilityRule,
  EligibilityRuleDefinition,
  EligibilityEducationLevel
} from '../../../domain/opportunity';
import type { ActorId, IsoTimestamp, OrganizationId } from '../../../domain/shared';
import type { HumanConfirmationMethod } from '../../../domain/shared';

interface Props {
  readonly rules: readonly EligibilityRule[];
  readonly onChange: (rules: EligibilityRule[]) => void;
  readonly currentActorId: ActorId;
}

const KINDS: readonly EligibilityRuleDefinition['kind'][] = [
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
];

// ─── Typed rule constructors ──────────────────────────────────────────────────
// Each returns a complete EligibilityRule for that kind, so no `as any` needed.

function makeUnconfirmedTrace(): {
  readonly humanConfirmed: false;
  readonly confirmedByActorId: undefined;
  readonly confirmedAt: undefined;
  readonly confirmationMethod: undefined;
} {
  return {
    humanConfirmed: false,
    confirmedByActorId: undefined,
    confirmedAt: undefined,
    confirmationMethod: undefined
  };
}

function resetTrace(rule: EligibilityRule): EligibilityRule {
  switch (rule.kind) {
    case 'custom':
      return { kind: 'custom', machineEnforced: false, literalSourceWording: rule.literalSourceWording, ...makeUnconfirmedTrace() };
    case 'education_level':
      return { kind: 'education_level', operator: rule.operator, value: rule.value, literalSourceWording: rule.literalSourceWording, ...makeUnconfirmedTrace() };
    case 'graduation_year':
      if (rule.operator === 'between') {
        return { kind: 'graduation_year', operator: 'between', value: rule.value, literalSourceWording: rule.literalSourceWording, ...makeUnconfirmedTrace() };
      }
      return { kind: 'graduation_year', operator: rule.operator, value: rule.value, literalSourceWording: rule.literalSourceWording, ...makeUnconfirmedTrace() };
    case 'location':
      return { kind: 'location', operator: rule.operator, values: rule.values, requiresPhysicalPresence: true, literalSourceWording: rule.literalSourceWording, ...makeUnconfirmedTrace() };
    case 'organization_membership':
      return { kind: 'organization_membership', organizationIds: rule.organizationIds, literalSourceWording: rule.literalSourceWording, ...makeUnconfirmedTrace() };
    case 'availability':
      return { kind: 'availability', factKey: rule.factKey, expectedValue: rule.expectedValue, literalSourceWording: rule.literalSourceWording, ...makeUnconfirmedTrace() };
    case 'licence_registration':
      return { kind: 'licence_registration', licenceCode: rule.licenceCode, expectedValue: rule.expectedValue, literalSourceWording: rule.literalSourceWording, ...makeUnconfirmedTrace() };
    case 'work_authorization':
      return { kind: 'work_authorization', jurisdiction: rule.jurisdiction, literalSourceWording: rule.literalSourceWording, ...makeUnconfirmedTrace() };
    case 'language':
      return { kind: 'language', language: rule.language, literalSourceWording: rule.literalSourceWording, ...makeUnconfirmedTrace() };
    case 'explicit_prerequisite':
      return { kind: 'explicit_prerequisite', factKey: rule.factKey, expectedValue: rule.expectedValue, literalSourceWording: rule.literalSourceWording, ...makeUnconfirmedTrace() };
  }
}

function makeConfirmedTrace(actorId: ActorId): {
  readonly humanConfirmed: true;
  readonly confirmedByActorId: ActorId;
  readonly confirmedAt: IsoTimestamp;
  readonly confirmationMethod: HumanConfirmationMethod;
} {
  return {
    humanConfirmed: true,
    confirmedByActorId: actorId,
    confirmedAt: new Date().toISOString() as IsoTimestamp,
    confirmationMethod: 'structured_human_entry'
  };
}

function makeCustomRule(wording: string): EligibilityRule {
  return { kind: 'custom', machineEnforced: false, literalSourceWording: wording, ...makeUnconfirmedTrace() };
}

function makeEducationLevelRule(wording: string): EligibilityRule {
  return { kind: 'education_level', operator: 'at_least', value: 'undergraduate', literalSourceWording: wording, ...makeUnconfirmedTrace() };
}

function makeGraduationYearRule(wording: string): EligibilityRule {
  return { kind: 'graduation_year', operator: 'after', value: new Date().getFullYear(), literalSourceWording: wording, ...makeUnconfirmedTrace() };
}

function makeLocationRule(wording: string): EligibilityRule {
  return { kind: 'location', operator: 'in', values: [], requiresPhysicalPresence: true, literalSourceWording: wording, ...makeUnconfirmedTrace() };
}

function makeOrgMembershipRule(wording: string): EligibilityRule {
  return { kind: 'organization_membership', organizationIds: [], literalSourceWording: wording, ...makeUnconfirmedTrace() };
}

function makeAvailabilityRule(wording: string): EligibilityRule {
  return { kind: 'availability', factKey: '', expectedValue: true, literalSourceWording: wording, ...makeUnconfirmedTrace() };
}

function makeLicenceRule(wording: string): EligibilityRule {
  return { kind: 'licence_registration', licenceCode: '', expectedValue: true, literalSourceWording: wording, ...makeUnconfirmedTrace() };
}

function makeWorkAuthRule(wording: string): EligibilityRule {
  return { kind: 'work_authorization', jurisdiction: 'IN', literalSourceWording: wording, ...makeUnconfirmedTrace() };
}

function makeLanguageRule(wording: string): EligibilityRule {
  return { kind: 'language', language: 'en', literalSourceWording: wording, ...makeUnconfirmedTrace() };
}

function makeExplicitPrereqRule(wording: string): EligibilityRule {
  return { kind: 'explicit_prerequisite', factKey: '', expectedValue: true, literalSourceWording: wording, ...makeUnconfirmedTrace() };
}

function makeRuleForKind(kind: EligibilityRuleDefinition['kind'], wording: string): EligibilityRule {
  switch (kind) {
    case 'custom': return makeCustomRule(wording);
    case 'education_level': return makeEducationLevelRule(wording);
    case 'graduation_year': return makeGraduationYearRule(wording);
    case 'location': return makeLocationRule(wording);
    case 'organization_membership': return makeOrgMembershipRule(wording);
    case 'availability': return makeAvailabilityRule(wording);
    case 'licence_registration': return makeLicenceRule(wording);
    case 'work_authorization': return makeWorkAuthRule(wording);
    case 'language': return makeLanguageRule(wording);
    case 'explicit_prerequisite': return makeExplicitPrereqRule(wording);
  }
}

// ─── Typed field updaters ─────────────────────────────────────────────────────

function updateEducationLevel(
  rule: Extract<EligibilityRule, { kind: 'education_level' }>,
  field: 'operator' | 'value',
  val: string
): EligibilityRule {
  if (field === 'operator') {
    return { kind: 'education_level', operator: val as 'at_least' | 'equals', value: rule.value, literalSourceWording: rule.literalSourceWording, ...makeUnconfirmedTrace() };
  }
  return { kind: 'education_level', operator: rule.operator, value: val as EligibilityEducationLevel, literalSourceWording: rule.literalSourceWording, ...makeUnconfirmedTrace() };
}

function updateGraduationYearOperator(
  rule: Extract<EligibilityRule, { kind: 'graduation_year' }>,
  op: 'before' | 'after' | 'between'
): EligibilityRule {
  if (op === 'between') {
    const yr = new Date().getFullYear();
    return { kind: 'graduation_year', operator: 'between', value: [yr, yr + 2], literalSourceWording: rule.literalSourceWording, ...makeUnconfirmedTrace() };
  }
  return { kind: 'graduation_year', operator: op, value: new Date().getFullYear(), literalSourceWording: rule.literalSourceWording, ...makeUnconfirmedTrace() };
}

function updateGraduationYearValue(
  rule: Extract<EligibilityRule, { kind: 'graduation_year' }>,
  val: number,
  rangeIndex?: 0 | 1
): EligibilityRule {
  if (rule.operator === 'between' && rangeIndex !== undefined) {
    const prev = rule.value as readonly [number, number];
    const next: readonly [number, number] = rangeIndex === 0 ? [val, prev[1]] : [prev[0], val];
    return { kind: 'graduation_year', operator: 'between', value: next, literalSourceWording: rule.literalSourceWording, ...makeUnconfirmedTrace() };
  }
  return { kind: 'graduation_year', operator: rule.operator as 'before' | 'after', value: val, literalSourceWording: rule.literalSourceWording, ...makeUnconfirmedTrace() };
}

function updateLocationOperator(
  rule: Extract<EligibilityRule, { kind: 'location' }>,
  op: 'in' | 'not_in'
): EligibilityRule {
  return { kind: 'location', operator: op, values: rule.values, requiresPhysicalPresence: true, literalSourceWording: rule.literalSourceWording, ...makeUnconfirmedTrace() };
}

function updateLocationValues(
  rule: Extract<EligibilityRule, { kind: 'location' }>,
  vals: readonly string[]
): EligibilityRule {
  return { kind: 'location', operator: rule.operator, values: vals, requiresPhysicalPresence: true, literalSourceWording: rule.literalSourceWording, ...makeUnconfirmedTrace() };
}

function parseExpectedValue(raw: string): string | boolean {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return raw;
}

export default function OpportunityEligibilitySection({ rules, onChange, currentActorId }: Props) {
  const addRule = () => {
    onChange([...rules, makeCustomRule('')]);
  };

  const replaceRule = (index: number, newRule: EligibilityRule) => {
    const next = [...rules];
    next[index] = newRule;
    onChange(next);
  };

  const updateLiteralWording = (index: number, wording: string) => {
    const rule = rules[index];
    // resetTrace strips confirmation and rebuilds
    const updated = resetTrace(rule);
    // Replace the literal wording
    const withNewWording = { ...updated, literalSourceWording: wording } as EligibilityRule;
    replaceRule(index, withNewWording);
  };

  const removeRule = (index: number) => {
    const next = [...rules];
    next.splice(index, 1);
    onChange(next);
  };

  const handleConfirmRule = (index: number) => {
    const rule = rules[index];
    const confirmed = { ...rule, ...makeConfirmedTrace(currentActorId) } as EligibilityRule;
    replaceRule(index, confirmed);
  };

  const handleKindChange = (index: number, newKind: EligibilityRuleDefinition['kind']) => {
    const wording = rules[index].literalSourceWording;
    replaceRule(index, makeRuleForKind(newKind, wording));
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
                onChange={e => replaceRule(index, updateEducationLevel(rule, 'operator', e.target.value))}
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
                onChange={e => replaceRule(index, updateEducationLevel(rule, 'value', e.target.value))}
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
                onChange={e => replaceRule(index, updateGraduationYearOperator(rule, e.target.value as 'before' | 'after' | 'between'))}
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
                    value={(rule.value as readonly [number, number])[0]}
                    onChange={e => replaceRule(index, updateGraduationYearValue(rule, parseInt(e.target.value, 10), 0))}
                  />
                  <input
                    type="number"
                    className="w-full border-2 border-black p-2 text-sm focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#e7ff57]"
                    value={(rule.value as readonly [number, number])[1]}
                    onChange={e => replaceRule(index, updateGraduationYearValue(rule, parseInt(e.target.value, 10), 1))}
                  />
                </div>
              ) : (
                <input
                  type="number"
                  className="w-full border-2 border-black p-2 text-sm focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#e7ff57]"
                  value={rule.value as number}
                  onChange={e => replaceRule(index, updateGraduationYearValue(rule, parseInt(e.target.value, 10)))}
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
                onChange={e => replaceRule(index, updateLocationOperator(rule, e.target.value as 'in' | 'not_in'))}
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
                value={[...rule.values].join(', ')}
                onChange={e => replaceRule(index, updateLocationValues(rule, e.target.value.split(',').map(v => v.trim()).filter(Boolean)))}
              />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <span className="font-mono-ui text-[11px] font-black uppercase">
                Requires Physical Presence: <span className="text-[#16a34a]">Yes (Fixed)</span>
              </span>
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
              value={[...rule.organizationIds].join(', ')}
              onChange={e => {
                const ids = e.target.value.split(',').map(v => v.trim()).filter(Boolean) as OrganizationId[];
                replaceRule(index, { kind: 'organization_membership', organizationIds: ids, literalSourceWording: rule.literalSourceWording, ...makeUnconfirmedTrace() });
              }}
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
                onChange={e => replaceRule(index, { kind: rule.kind, factKey: e.target.value, expectedValue: rule.expectedValue, literalSourceWording: rule.literalSourceWording, ...makeUnconfirmedTrace() })}
              />
            </div>
            <div>
              <label className="mb-2 block font-mono-ui text-[10px] font-black uppercase text-[#d63c1d]">Expected Value</label>
              <input
                type="text"
                className="w-full border-2 border-black p-2 text-sm focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#e7ff57]"
                value={rule.expectedValue.toString()}
                onChange={e => replaceRule(index, { kind: rule.kind, factKey: rule.factKey, expectedValue: parseExpectedValue(e.target.value), literalSourceWording: rule.literalSourceWording, ...makeUnconfirmedTrace() })}
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
                onChange={e => replaceRule(index, { kind: 'licence_registration', licenceCode: e.target.value, expectedValue: rule.expectedValue, literalSourceWording: rule.literalSourceWording, ...makeUnconfirmedTrace() })}
              />
            </div>
            <div>
              <label className="mb-2 block font-mono-ui text-[10px] font-black uppercase text-[#d63c1d]">Expected Value</label>
              <input
                type="text"
                className="w-full border-2 border-black p-2 text-sm focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#e7ff57]"
                value={rule.expectedValue.toString()}
                onChange={e => replaceRule(index, { kind: 'licence_registration', licenceCode: rule.licenceCode, expectedValue: parseExpectedValue(e.target.value), literalSourceWording: rule.literalSourceWording, ...makeUnconfirmedTrace() })}
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
              onChange={e => replaceRule(index, { kind: 'work_authorization', jurisdiction: e.target.value, literalSourceWording: rule.literalSourceWording, ...makeUnconfirmedTrace() })}
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
              onChange={e => replaceRule(index, { kind: 'language', language: e.target.value, literalSourceWording: rule.literalSourceWording, ...makeUnconfirmedTrace() })}
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
                    onChange={e => handleKindChange(i, e.target.value as EligibilityRuleDefinition['kind'])}
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
                    onChange={e => updateLiteralWording(i, e.target.value)}
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