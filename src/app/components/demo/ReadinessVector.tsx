import type { OpportunityReadinessResult } from '../../domain';

export function ReadinessVector({ result }: { readonly result: OpportunityReadinessResult }) {
  const cells = [
    ['Eligibility', result.eligibilityStatus],
    ['Required coverage', `${result.requiredCoverage.met} / ${result.requiredCoverage.total}`],
    ['Verification coverage', `${result.verificationCoverage.supported} / ${result.verificationCoverage.total}`],
    ['Strong evidence', String(result.evidenceCoverage.strong)],
    ['Weak evidence', String(result.evidenceCoverage.weak)],
    ['Unknown', String(result.evidenceCoverage.unknown)],
    ['Partial', String(result.partialCount)],
    ['Gap', String(result.gapCount)],
    ['Work samples', String(result.relevantWorkSamples)],
    ['Learning distance', result.learningDistance],
  ] as const;
  return (
    <section className="border-2 border-black bg-white p-4 shadow-[5px_5px_0_#111]" aria-labelledby="readiness-vector-title">
      <div className="flex flex-col gap-2 border-b-2 border-black pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono-ui text-[10px] font-bold uppercase tracking-[0.18em]">Deterministic readiness vector</p>
          <h2 id="readiness-vector-title" className="mt-1 text-2xl font-black">{result.readinessBand.replaceAll('_', ' ')}</h2>
        </div>
        <p className="font-mono-ui text-[10px] text-black/60">Result {result.resultId}</p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-px border border-black bg-black sm:grid-cols-3 lg:grid-cols-5">
        {cells.map(([label, value]) => (
          <div key={label} className="min-h-24 bg-[#f7f4ed] p-3">
            <dt className="font-mono-ui text-[10px] font-bold uppercase tracking-wide text-black/55">{label}</dt>
            <dd className="mt-2 break-words text-sm font-black">{value.replaceAll('_', ' ')}</dd>
          </div>
        ))}
      </div>
      <p className="mt-4 border-l-4 border-[#ff5c35] pl-3 text-sm leading-relaxed">
        READY FOR REVIEW means the submitted evidence is ready for human review. It does not predict hiring, selection or success.
      </p>
    </section>
  );
}
