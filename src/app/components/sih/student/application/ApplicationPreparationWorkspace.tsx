import { useMemo } from 'react';
import type { EvidenceRecordReadModel } from '../../../../services/sih/types';
import type { EvidenceRecordId } from '../../../../domain';
import type { ProspectiveRecruiterDisclosure } from './RecruiterDisclosurePreview';
import { RecruiterDisclosurePreview } from './RecruiterDisclosurePreview';

type Props = {
  readonly evidence: readonly EvidenceRecordReadModel[];
  readonly selectedEvidenceRecordIds: readonly EvidenceRecordId[];
  readonly onSelectedEvidenceRecordIdsChange: (ids: readonly EvidenceRecordId[]) => void;
  readonly disclosure?: ProspectiveRecruiterDisclosure;
  readonly questionnaireReference?: string;
};

/** Historical fixture imports can contain semantically identical evidence rows.
 * Keep the append-only ledger intact while presenting only the newest equivalent
 * choice to the applicant. IDs remain distinct everywhere outside this picker. */
export function dedupeEvidenceChoices(evidence: readonly EvidenceRecordReadModel[]): readonly EvidenceRecordReadModel[] {
  const seen = new Set<string>();
  return evidence.filter((record) => {
    const fingerprint = JSON.stringify({
      literalClaim: record.literalClaim.trim().replace(/\s+/g, ' ').toLocaleLowerCase(),
      provenance: record.provenance,
      scope: record.scope,
      sourceSystem: record.source.system,
      sourceRecordId: record.source.recordId ?? null,
    });
    if (seen.has(fingerprint)) return false;
    seen.add(fingerprint);
    return true;
  });
}

export function ApplicationPreparationWorkspace({ evidence, selectedEvidenceRecordIds, onSelectedEvidenceRecordIdsChange, disclosure, questionnaireReference }: Props) {
  const selected = useMemo(() => new Set(selectedEvidenceRecordIds), [selectedEvidenceRecordIds]);
  const evidenceChoices = useMemo(() => dedupeEvidenceChoices(evidence), [evidence]);
  function toggle(id: EvidenceRecordId) { onSelectedEvidenceRecordIdsChange(selected.has(id) ? selectedEvidenceRecordIds.filter(existing => existing !== id) : [...selectedEvidenceRecordIds, id]); }
  return <section className="grid gap-6" aria-labelledby="application-preparation-title">
    <header className="border-2 border-black bg-white p-5 shadow-[5px_5px_0_#111]"><p className="font-mono-ui text-[10px] font-bold uppercase tracking-[0.18em]">Application preparation</p><h1 id="application-preparation-title" className="mt-1 text-3xl font-black">Choose what to disclose</h1><p className="mt-3 text-sm leading-relaxed text-black/70">Evidence is selected deliberately for application review. Selection alone does not grant consent or submit an application.</p></header>
    <section className="border-2 border-black bg-[#f7f4ed] p-5" aria-labelledby="supporting-evidence-title"><h2 id="supporting-evidence-title" className="text-xl font-black">Supporting evidence</h2>{evidenceChoices.length === 0 ? <p className="mt-3 text-sm text-black/70">No authorized evidence records are available to select.</p> : <div className="mt-4 grid gap-3">{evidenceChoices.map(record => <label key={record.id} className="flex cursor-pointer gap-3 border-2 border-black bg-white p-4"><input type="checkbox" checked={selected.has(record.id)} onChange={() => toggle(record.id)} className="mt-1 h-5 w-5 accent-black" /><span><span className="block font-bold">{record.literalClaim}</span><span className="mt-1 block font-mono-ui text-[10px] uppercase text-black/60">{record.provenance.replaceAll('_', ' ')} · {record.visibility.replaceAll('_', ' ')}</span></span></label>)}</div>}</section>
    {questionnaireReference && <section className="border-2 border-black bg-white p-5"><h2 className="text-xl font-black">Additional questions</h2><p className="mt-2 text-sm leading-relaxed text-black/70">This opportunity references a questionnaire, but no typed field definition is available. No questions have been inferred or collected.</p></section>}
    <RecruiterDisclosurePreview disclosure={disclosure} />
  </section>;
}

export default ApplicationPreparationWorkspace;
