import type { OpportunityReadinessResult } from '../../../../domain';

type ReadinessCasefileProps = {
  readonly result: OpportunityReadinessResult;
};

function formatLabel(value: string): string {
  return value.replaceAll('_', ' ');
}

function stateDescription(state: string): string {
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
    default:
      return 'The current Engine B result provides the requirement state shown above.';
  }
}

function stateSymbol(state: string): string {
  switch (state) {
    case 'MET_STRONG':
      return '✓';
    case 'MET_WEAK_EVIDENCE':
      return '~';
    case 'PARTIAL':
      return '◐';
    case 'GAP':
      return '!';
    case 'UNKNOWN':
      return '?';
    case 'NOT_APPLICABLE':
      return '—';
    default:
      return '•';
  }
}

export default function ReadinessCasefile({
  result,
}: ReadinessCasefileProps) {
  const requirements = [
    ...result.requiredRequirementResults,
    ...result.preferredRequirementResults,
  ];

  return (
    <section
      className="border-2 border-black bg-white p-5 shadow-[6px_6px_0_#111]"
      aria-labelledby="readiness-casefile-title"
    >
      <header>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono-ui text-[10px] font-black uppercase tracking-[0.18em] text-[#d63c1d]">
              Canonical readiness casefile
            </p>

            <h2
              id="readiness-casefile-title"
              className="mt-2 text-3xl font-black"
            >
              {formatLabel(result.readinessBand)}
            </h2>
          </div>

          <span className="border-2 border-black bg-[#e7ff57] px-3 py-2 font-mono-ui text-[10px] font-black uppercase">
            {formatLabel(result.eligibilityStatus)}
          </span>
        </div>

        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-black/70">
          This is the canonical Engine B readiness result. The interface
          displays the result and its supporting evidence references; it does
          not calculate a match percentage or independently determine
          readiness.
        </p>
      </header>

      <dl className="mt-6 grid gap-px border-2 border-black bg-black sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-[#f7f4ed] p-4">
          <dt className="font-mono-ui text-[10px] font-bold uppercase">
            Required coverage
          </dt>
          <dd className="mt-1 text-xl font-black">
            {result.requiredCoverage.met} / {result.requiredCoverage.total}
          </dd>
        </div>

        <div className="bg-[#f7f4ed] p-4">
          <dt className="font-mono-ui text-[10px] font-bold uppercase">
            Evidence
          </dt>
          <dd className="mt-1 text-xl font-black">
            {result.evidenceCoverage.strong} strong ·{' '}
            {result.evidenceCoverage.weak} weak
          </dd>
        </div>

        <div className="bg-[#f7f4ed] p-4">
          <dt className="font-mono-ui text-[10px] font-bold uppercase">
            Unknown
          </dt>
          <dd className="mt-1 text-xl font-black">
            {result.evidenceCoverage.unknown}
          </dd>
        </div>

        <div className="bg-[#f7f4ed] p-4">
          <dt className="font-mono-ui text-[10px] font-bold uppercase">
            Gaps
          </dt>
          <dd className="mt-1 text-xl font-black">{result.gapCount}</dd>
        </div>
      </dl>

      <section
        className="mt-8"
        aria-labelledby="eligibility-result-title"
      >
        <div>
          <p className="font-mono-ui text-[10px] font-black uppercase tracking-[0.18em]">
            Eligibility
          </p>

          <h3
            id="eligibility-result-title"
            className="mt-1 text-2xl font-black"
          >
            Eligibility rule results
          </h3>
        </div>

        {result.eligibilityRuleResults.length === 0 ? (
          <p className="mt-4 border-2 border-black bg-[#f7f4ed] p-4 text-sm text-black/70">
            No eligibility rule results are recorded.
          </p>
        ) : (
          <div className="mt-4 grid gap-3">
            {result.eligibilityRuleResults.map((rule) => (
              <article
                key={rule.ruleIndex}
                className="border-2 border-black bg-[#f7f4ed] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="font-mono-ui text-[10px] font-black uppercase text-[#d63c1d]">
                    Rule {rule.ruleIndex + 1} · {formatLabel(rule.ruleKind)}
                  </span>

                  <span className="border border-black px-2 py-1 font-mono-ui text-[10px] font-black uppercase">
                    {formatLabel(rule.state)}
                  </span>
                </div>

                <p className="mt-3 text-sm leading-relaxed">
                  {rule.reason}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section
        className="mt-8"
        aria-labelledby="requirement-results-title"
      >
        <div>
          <p className="font-mono-ui text-[10px] font-black uppercase tracking-[0.18em]">
            Requirement evaluation
          </p>

          <h3
            id="requirement-results-title"
            className="mt-1 text-2xl font-black"
          >
            Evidence and capability state
          </h3>
        </div>

        <div className="mt-4 grid gap-3">
          {requirements.map((requirement) => (
            <article
              key={requirement.requirementId}
              className="border-2 border-black bg-[#f7f4ed] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex gap-3">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-black bg-white font-black"
                    aria-hidden="true"
                  >
                    {stateSymbol(requirement.state)}
                  </span>

                  <div>
                    <p className="font-mono-ui text-[10px] font-black uppercase text-[#d63c1d]">
                      {formatLabel(requirement.category)} ·{' '}
                      {formatLabel(requirement.priority)}
                    </p>

                    <p className="mt-1 font-bold leading-relaxed">
                      {requirement.literalSourceWording}
                    </p>
                  </div>
                </div>

                <span className="border-2 border-black px-2 py-1 font-mono-ui text-[10px] font-black uppercase">
                  {formatLabel(requirement.state)}
                </span>
              </div>

              <p className="mt-4 border-l-4 border-black pl-3 text-sm leading-relaxed text-black/75">
                {stateDescription(requirement.state)}
              </p>

              <p className="mt-3 text-sm leading-relaxed">
                {requirement.explanation}
              </p>

              <div className="mt-4 border-t border-black/20 pt-3">
                <p className="font-mono-ui text-[10px] font-black uppercase">
                  Supporting evidence references
                </p>

                {requirement.supportingEvidenceIds.length === 0 ? (
                  <p className="mt-2 text-sm text-black/60">
                    No evidence record is referenced by this readiness result.
                  </p>
                ) : (
                  <ul className="mt-2 grid gap-1">
                    {requirement.supportingEvidenceIds.map((evidenceId) => (
                      <li
                        key={evidenceId}
                        className="break-all font-mono-ui text-xs"
                      >
                        {evidenceId}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="border border-black px-2 py-1 font-mono-ui text-[10px] font-bold uppercase">
                  Verification:{' '}
                  {requirement.verificationSupported
                    ? 'supported'
                    : 'not supported'}
                </span>

                <span className="border border-black px-2 py-1 font-mono-ui text-[10px] font-bold uppercase">
                  Human confirmed:{' '}
                  {requirement.humanConfirmed ? 'yes' : 'no'}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="mt-8 border-2 border-black bg-[#111] p-4 text-white">
        <p className="font-mono-ui text-[10px] font-black uppercase tracking-[0.18em] text-[#e7ff57]">
          Result provenance
        </p>

        <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-white/50">Result ID</dt>
            <dd className="mt-1 break-all font-mono-ui">
              {result.resultId}
            </dd>
          </div>

          <div>
            <dt className="text-white/50">Engine version</dt>
            <dd className="mt-1 font-mono-ui">
              {result.engineVersion}
            </dd>
          </div>

          <div>
            <dt className="text-white/50">Policy version</dt>
            <dd className="mt-1 font-mono-ui">
              {result.policyVersion}
            </dd>
          </div>

          <div>
            <dt className="text-white/50">Generated at</dt>
            <dd className="mt-1 font-mono-ui">
              {result.generatedAt}
            </dd>
          </div>
        </dl>
      </footer>
    </section>
  );
}