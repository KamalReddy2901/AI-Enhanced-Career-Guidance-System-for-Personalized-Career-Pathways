import type { OpportunityVersion } from '../../../../domain/opportunity';
import type {
  OpportunityReadinessResult,
  ReadinessBand,
  RequirementReadinessResult,
} from '../../../../domain/readiness';
import type { OpportunityId, OpportunityRequirementId, OpportunityVersionId } from '../../../../domain/shared';

export type ReadinessAvailability =
  | 'loading'
  | 'unavailable'
  | 'error'
  | 'unauthorized'
  | 'stale'
  | 'current';

export type ReadinessEvidenceHandoff = {
  readonly opportunityId: OpportunityId;
  readonly opportunityVersionId: OpportunityVersionId;
  readonly readinessResultId: OpportunityReadinessResult['resultId'];
  readonly requirementId: OpportunityRequirementId;
  readonly supportingEvidenceIds: RequirementReadinessResult['supportingEvidenceIds'];
  readonly requirementState: RequirementReadinessResult['state'];
};

export type ReadinessGapActionHandoff = ReadinessEvidenceHandoff;

type ReadinessCasefileProps = {
  readonly result?: OpportunityReadinessResult;
  readonly opportunityVersion?: OpportunityVersion;
  readonly availability?: Exclude<ReadinessAvailability, 'stale' | 'current'>;
  readonly errorMessage?: string;
  readonly onEvidenceHandoff?: (handoff: ReadinessEvidenceHandoff) => void;
  readonly onGapActionHandoff?: (handoff: ReadinessGapActionHandoff) => void;
};

function formatLabel(value: string): string {
  return value.replaceAll('_', ' ');
}

function stateDescription(state: RequirementReadinessResult['state']): string {
  switch (state) {
    case 'UNKNOWN':
      return 'Not enough evidence is currently available to determine whether this requirement is satisfied.';
    case 'GAP':
      return 'The current readiness result identifies this requirement as not satisfied.';
    case 'PARTIAL':
      return 'The current readiness result shows partial satisfaction of this requirement.';
    case 'MET_STRONG':
      return 'The current evidence strongly supports this requirement.';
    case 'MET_WEAK_EVIDENCE':
      return 'The requirement is supported, but the available evidence is weak.';
    case 'NOT_APPLICABLE':
      return 'This requirement does not currently apply.';
  }
}

function stateSymbol(state: RequirementReadinessResult['state']): string {
  switch (state) {
    case 'MET_STRONG': return '✓';
    case 'MET_WEAK_EVIDENCE': return '~';
    case 'PARTIAL': return '◐';
    case 'GAP': return '!';
    case 'UNKNOWN': return '?';
    case 'NOT_APPLICABLE': return '—';
  }
}

function resolveAvailability(
  result: OpportunityReadinessResult | undefined,
  opportunityVersion: OpportunityVersion | undefined,
  requested: ReadinessCasefileProps['availability'],
): ReadinessAvailability {
  if (requested) return requested;
  if (!result || !opportunityVersion) return 'unavailable';
  if (
    result.opportunityId !== opportunityVersion.opportunityId ||
    result.opportunityVersionId !== opportunityVersion.id
  ) {
    return 'stale';
  }
  return 'current';
}

function handoffFor(
  result: OpportunityReadinessResult,
  requirement: RequirementReadinessResult,
): ReadinessEvidenceHandoff {
  return {
    opportunityId: result.opportunityId,
    opportunityVersionId: result.opportunityVersionId,
    readinessResultId: result.resultId,
    requirementId: requirement.requirementId,
    supportingEvidenceIds: requirement.supportingEvidenceIds,
    requirementState: requirement.state,
  };
}

function AvailabilityState({
  state,
  errorMessage,
}: {
  readonly state: Exclude<ReadinessAvailability, 'current' | 'stale'>;
  readonly errorMessage?: string;
}) {
  const copy = {
    loading: ['Readiness loading', 'The canonical readiness result is being loaded.'],
    unavailable: ['Readiness unavailable', 'No canonical readiness result is currently available for this opportunity.'],
    error: ['Readiness unavailable', errorMessage ?? 'The canonical readiness result could not be loaded.'],
    unauthorized: ['Readiness unavailable', 'The canonical readiness result is not available for this viewer.'],
  }[state];

  return (
    <section className="border-2 border-black bg-white p-5 shadow-[6px_6px_0_#111]" aria-live="polite">
      <p className="font-mono-ui text-[10px] font-black uppercase tracking-[0.18em] text-[#d63c1d]">Career readiness</p>
      <h2 className="mt-2 text-2xl font-black">{copy[0]}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-black/70">{copy[1]}</p>
    </section>
  );
}

function StaleState({ result, opportunityVersion }: { readonly result: OpportunityReadinessResult; readonly opportunityVersion: OpportunityVersion }) {
  return (
    <section className="border-2 border-[#d63c1d] bg-[#fff1ec] p-5" aria-live="polite">
      <p className="font-mono-ui text-[10px] font-black uppercase tracking-[0.18em] text-[#d63c1d]">Career readiness</p>
      <h2 className="mt-2 text-2xl font-black">Stale readiness result</h2>
      <p className="mt-3 text-sm leading-relaxed">
        This readiness result belongs to a different canonical opportunity version and is not presented as current.
      </p>
      <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
        <div><dt className="font-mono-ui uppercase text-black/50">Result opportunity</dt><dd className="mt-1 break-all font-mono-ui">{result.opportunityId}</dd></div>
        <div><dt className="font-mono-ui uppercase text-black/50">Selected opportunity</dt><dd className="mt-1 break-all font-mono-ui">{opportunityVersion.opportunityId}</dd></div>
        <div><dt className="font-mono-ui uppercase text-black/50">Result version</dt><dd className="mt-1 break-all font-mono-ui">{result.opportunityVersionId}</dd></div>
        <div><dt className="font-mono-ui uppercase text-black/50">Selected version</dt><dd className="mt-1 break-all font-mono-ui">{opportunityVersion.id}</dd></div>
      </dl>
    </section>
  );
}

export default function ReadinessCasefile({
  result,
  opportunityVersion,
  availability,
  errorMessage,
  onEvidenceHandoff,
  onGapActionHandoff,
}: ReadinessCasefileProps) {
  const state = resolveAvailability(result, opportunityVersion, availability);

  if (state !== 'current' && state !== 'stale') {
    return <AvailabilityState state={state} errorMessage={errorMessage} />;
  }

  if (!result || !opportunityVersion) {
    return <AvailabilityState state="unavailable" />;
  }

  if (state === 'stale') {
    return <StaleState result={result} opportunityVersion={opportunityVersion} />;
  }

  const requirements = [
    ...result.requiredRequirementResults,
    ...result.preferredRequirementResults,
  ];

  const readinessBand: ReadinessBand = result.readinessBand;

  return (
    <section className="border-2 border-black bg-white p-5 shadow-[6px_6px_0_#111]" aria-labelledby="readiness-casefile-title">
      <header>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono-ui text-[10px] font-black uppercase tracking-[0.18em] text-[#d63c1d]">Canonical readiness casefile · current</p>
            <h2 id="readiness-casefile-title" className="mt-2 text-3xl font-black">{formatLabel(readinessBand)}</h2>
          </div>
          <span className="border-2 border-black bg-[#e7ff57] px-3 py-2 font-mono-ui text-[10px] font-black uppercase">{formatLabel(result.eligibilityStatus)}</span>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-black/70">
          This is the canonical Engine B readiness result. The interface displays the result and its supporting evidence references; it does not calculate readiness or infer evidence.
        </p>
      </header>

      <dl className="mt-6 grid gap-px border-2 border-black bg-black sm:grid-cols-2 lg:grid-cols-5">
        <div className="bg-[#f7f4ed] p-4"><dt className="font-mono-ui text-[10px] font-bold uppercase">Required coverage</dt><dd className="mt-1 text-xl font-black">{result.requiredCoverage.met} / {result.requiredCoverage.total}</dd></div>
        <div className="bg-[#f7f4ed] p-4"><dt className="font-mono-ui text-[10px] font-bold uppercase">Verification</dt><dd className="mt-1 text-xl font-black">{result.verificationCoverage.supported} / {result.verificationCoverage.total}</dd></div>
        <div className="bg-[#f7f4ed] p-4"><dt className="font-mono-ui text-[10px] font-bold uppercase">Partial</dt><dd className="mt-1 text-xl font-black">{result.partialCount}</dd></div>
        <div className="bg-[#f7f4ed] p-4"><dt className="font-mono-ui text-[10px] font-bold uppercase">Gaps</dt><dd className="mt-1 text-xl font-black">{result.gapCount}</dd></div>
        <div className="bg-[#f7f4ed] p-4"><dt className="font-mono-ui text-[10px] font-bold uppercase">Work samples</dt><dd className="mt-1 text-xl font-black">{result.relevantWorkSamples}</dd></div>
      </dl>

      <section className="mt-8" aria-labelledby="eligibility-result-title">
        <p className="font-mono-ui text-[10px] font-black uppercase tracking-[0.18em]">Eligibility</p>
        <h3 id="eligibility-result-title" className="mt-1 text-2xl font-black">Eligibility rule results</h3>
        {result.eligibilityRuleResults.length === 0 ? (
          <p className="mt-4 border-2 border-black bg-[#f7f4ed] p-4 text-sm text-black/70">No eligibility rule results are recorded.</p>
        ) : (
          <div className="mt-4 grid gap-3">
            {result.eligibilityRuleResults.map(rule => (
              <article key={rule.ruleIndex} className="border-2 border-black bg-[#f7f4ed] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="font-mono-ui text-[10px] font-black uppercase text-[#d63c1d]">Rule {rule.ruleIndex + 1} · {formatLabel(rule.ruleKind)}</span>
                  <span className="border border-black px-2 py-1 font-mono-ui text-[10px] font-black uppercase">{formatLabel(rule.state)}</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed">{rule.reason}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8" aria-labelledby="requirement-results-title">
        <p className="font-mono-ui text-[10px] font-black uppercase tracking-[0.18em]">Requirement evaluation</p>
        <h3 id="requirement-results-title" className="mt-1 text-2xl font-black">Evidence and capability state</h3>
        <div className="mt-4 grid gap-3">
          {requirements.map(requirement => {
            const handoff = handoffFor(result, requirement);
            const canEvidenceHandoff = requirement.supportingEvidenceIds.length > 0;
            const canGapActionHandoff = requirement.state === 'GAP' || requirement.state === 'PARTIAL';
            return (
              <article key={requirement.requirementId} className="border-2 border-black bg-[#f7f4ed] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-black bg-white font-black" aria-hidden="true">{stateSymbol(requirement.state)}</span>
                    <div>
                      <p className="font-mono-ui text-[10px] font-black uppercase text-[#d63c1d]">{formatLabel(requirement.category)} · {formatLabel(requirement.priority)}</p>
                      <p className="mt-1 font-bold leading-relaxed">{requirement.literalSourceWording}</p>
                    </div>
                  </div>
                  <span className="border-2 border-black px-2 py-1 font-mono-ui text-[10px] font-black uppercase">{formatLabel(requirement.state)}</span>
                </div>

                <p className="mt-4 border-l-4 border-black pl-3 text-sm leading-relaxed text-black/75">{stateDescription(requirement.state)}</p>
                <p className="mt-3 text-sm leading-relaxed">{requirement.explanation}</p>

                <div className="mt-4 border-t border-black/20 pt-3">
                  <p className="font-mono-ui text-[10px] font-black uppercase">Supporting evidence references</p>
                  {requirement.supportingEvidenceIds.length === 0 ? (
                    <p className="mt-2 text-sm text-black/60">No evidence record is referenced by this readiness result.</p>
                  ) : (
                    <ul className="mt-2 grid gap-1">{requirement.supportingEvidenceIds.map(id => <li key={id} className="break-all font-mono-ui text-xs">{id}</li>)}</ul>
                  )}
                  {requirement.supportingProvenance.length > 0 && (
                    <p className="mt-3 font-mono-ui text-[10px] font-bold uppercase text-black/55">Provenance: {requirement.supportingProvenance.map(formatLabel).join(' · ')}</p>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="border border-black px-2 py-1 font-mono-ui text-[10px] font-bold uppercase">Verification: {requirement.verificationSupported ? 'supported' : 'not supported'}</span>
                  <span className="border border-black px-2 py-1 font-mono-ui text-[10px] font-bold uppercase">Human confirmed: {requirement.humanConfirmed ? 'yes' : 'no'}</span>
                  {onEvidenceHandoff && canEvidenceHandoff && (
                    <button type="button" onClick={() => onEvidenceHandoff(handoff)} className="border-2 border-black bg-white px-2 py-1 font-mono-ui text-[10px] font-bold uppercase focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#ff5c35]">Prove existing evidence</button>
                  )}
                  {onGapActionHandoff && canGapActionHandoff && (
                    <button type="button" onClick={() => onGapActionHandoff(handoff)} className="border-2 border-black bg-[#e7ff57] px-2 py-1 font-mono-ui text-[10px] font-bold uppercase focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#ff5c35]">Next action</button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <footer className="mt-8 border-2 border-black bg-[#111] p-4 text-white">
        <p className="font-mono-ui text-[10px] font-black uppercase tracking-[0.18em] text-[#e7ff57]">Result provenance</p>
        <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-6">
          <div><dt className="text-white/50">Result ID</dt><dd className="mt-1 break-all font-mono-ui">{result.resultId}</dd></div>
          <div><dt className="text-white/50">Opportunity ID</dt><dd className="mt-1 break-all font-mono-ui">{result.opportunityId}</dd></div>
          <div><dt className="text-white/50">Opportunity version ID</dt><dd className="mt-1 break-all font-mono-ui">{result.opportunityVersionId}</dd></div>
          <div><dt className="text-white/50">Engine version</dt><dd className="mt-1 font-mono-ui">{result.engineVersion}</dd></div>
          <div><dt className="text-white/50">Policy version</dt><dd className="mt-1 font-mono-ui">{result.policyVersion}</dd></div>
          <div><dt className="text-white/50">Generated at</dt><dd className="mt-1 font-mono-ui">{result.generatedAt}</dd></div>
        </dl>
      </footer>
    </section>
  );
}
