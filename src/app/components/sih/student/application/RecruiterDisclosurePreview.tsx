import type { ProductionRecruiterProjection } from '../../../../services/sih/productionRecruiterProjection';

/** A prospective, student-visible allowlist. It deliberately excludes every
 * identifier that exists only after trusted snapshot finalization. */
export type ProspectiveRecruiterDisclosure = Pick<
  ProductionRecruiterProjection,
  'applicant' | 'educationSummary' | 'evidence' | 'opportunityId' | 'opportunityVersionId' | 'readinessBand' | 'readinessResultId' | 'requirements' | 'sharedWorkSamples'
>;

export function RecruiterDisclosurePreview({ disclosure }: { readonly disclosure?: ProspectiveRecruiterDisclosure }) {
  if (!disclosure) return <section className="border-2 border-dashed border-black bg-white p-5" aria-live="polite"><h2 className="text-xl font-black">Select evidence to preview disclosure</h2><p className="mt-2 text-sm text-black/70">Nothing has been shared with a recruiter.</p></section>;
  return <section className="border-2 border-black bg-white p-5 shadow-[4px_4px_0_#111]" aria-labelledby="prospective-disclosure-title">
    <p className="font-mono-ui text-[10px] font-black uppercase tracking-[0.18em] text-[#d63c1d]">Prospective disclosure preview</p>
    <h2 id="prospective-disclosure-title" className="mt-2 text-2xl font-black">What would be shared after consent and finalization</h2>
    <p className="mt-3 text-sm leading-relaxed text-black/70">Preview only — this information has not been shared and no immutable snapshot exists yet.</p>
    <dl className="mt-5 grid gap-px border border-black bg-black sm:grid-cols-3"><div className="bg-[#f7f4ed] p-3"><dt className="font-mono-ui text-[10px] uppercase">Applicant</dt><dd className="mt-1 font-bold">{disclosure.applicant.displayName}</dd></div><div className="bg-[#f7f4ed] p-3"><dt className="font-mono-ui text-[10px] uppercase">Education summary</dt><dd className="mt-1 font-bold">{disclosure.educationSummary}</dd></div><div className="bg-[#f7f4ed] p-3"><dt className="font-mono-ui text-[10px] uppercase">Readiness reference</dt><dd className="mt-1 break-all font-mono-ui text-xs">{disclosure.readinessResultId}</dd></div></dl>
    <h3 className="mt-6 font-mono-ui text-xs font-black uppercase">Selected evidence</h3>
    {disclosure.evidence.length === 0 ? <p className="mt-2 text-sm text-black/70">No evidence is selected for disclosure.</p> : <ul className="mt-3 grid gap-2">{disclosure.evidence.map(item => <li key={item.evidenceRecordId} className="border border-black p-3"><p className="font-bold">{item.literalClaim}</p><p className="mt-1 font-mono-ui text-[10px] uppercase text-black/60">{item.provenance.replaceAll('_', ' ')} · {item.verificationState.replaceAll('_', ' ')}</p></li>)}</ul>}
    <p className="mt-5 border-l-4 border-black pl-3 text-xs leading-relaxed text-black/70">Private guidance, personal values, aspirations, counseling information, family or financial constraints, unrelated accessibility information, rankings, probability, and percentage scores are not part of this disclosure.</p>
  </section>;
}

export default RecruiterDisclosurePreview;
