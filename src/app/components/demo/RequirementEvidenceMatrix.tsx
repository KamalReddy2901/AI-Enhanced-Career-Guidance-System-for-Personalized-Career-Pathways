import type { OpportunityReadinessResult, VerificationEvent } from '../../domain';
import { projectDemoEvidenceSignals } from '../../demo/demoEvidenceProjection';
import type { DemoEvidenceLedgerEntry } from '../../demo/demoTypes';

export function EvidenceProvenanceBadge({ provenance, verification }: { readonly provenance: string; readonly verification: string }) {
  return (
    <span className="inline-flex flex-wrap gap-1 font-mono-ui text-[10px] font-bold uppercase">
      <span className="border border-black bg-[#fff4c7] px-2 py-1">{provenance.replaceAll('_', ' ')}</span>
      <span className="border border-black bg-[#e4f0ff] px-2 py-1">{verification.replaceAll('_', ' ')}</span>
    </span>
  );
}

export function RequirementEvidenceMatrix({
  readiness,
  ledger,
  verificationEvents,
}: {
  readonly readiness: OpportunityReadinessResult;
  readonly ledger: readonly DemoEvidenceLedgerEntry[];
  readonly verificationEvents: readonly VerificationEvent[];
}) {
  const signals = new Map(projectDemoEvidenceSignals(ledger, verificationEvents).map(signal => [signal.evidenceRecordId, signal]));
  const entries = new Map(ledger.map(entry => [entry.record.id, entry]));
  const rows = [...readiness.requiredRequirementResults, ...readiness.preferredRequirementResults];
  return (
    <section aria-labelledby="matrix-title">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono-ui text-[10px] font-bold uppercase tracking-[0.18em]">Requirement / evidence matrix</p>
          <h2 id="matrix-title" className="text-2xl font-black">What the result is grounded in</h2>
        </div>
        <p className="text-sm text-black/60">Exact wording is preserved from the controlled opportunity.</p>
      </div>
      <div className="grid gap-4">
        {rows.map(row => (
          <article key={row.requirementId} className="border-2 border-black bg-white p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap gap-2 font-mono-ui text-[10px] font-bold uppercase tracking-wide">
                  <span>{row.priority}</span><span aria-hidden="true">·</span><span>{row.category.replaceAll('_', ' ')}</span>
                </div>
                <h3 className="mt-2 text-lg font-black leading-snug">{row.literalSourceWording}</h3>
              </div>
              <span className="w-fit border-2 border-black bg-[#e7ff57] px-3 py-2 font-mono-ui text-xs font-black">
                {row.state.replaceAll('_', ' ')}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-black/75">{row.explanation}</p>
            <div className="mt-4 grid gap-2">
              {row.supportingEvidenceIds.length === 0 ? (
                <p className="border border-dashed border-black/40 p-3 text-sm text-black/55">No supporting evidence selected for this state.</p>
              ) : row.supportingEvidenceIds.map(evidenceId => {
                const entry = entries.get(evidenceId);
                const signal = signals.get(evidenceId);
                if (!entry || !signal) return null;
                return (
                  <div key={evidenceId} className="border border-black/30 bg-[#f7f4ed] p-3">
                    <p className="text-sm font-semibold">{entry.record.literalClaim}</p>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <EvidenceProvenanceBadge provenance={entry.record.provenance} verification={signal.verificationState} />
                      <span className="font-mono-ui text-[10px] text-black/55">Evidence {evidenceId}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
