import type { ApplicationRecruitmentRecordReadModel } from '../../../services/sih/types';

export function ApplicationRecruitmentTimeline({
  records,
  title = 'Recruitment details and feedback',
}: {
  readonly records: readonly ApplicationRecruitmentRecordReadModel[];
  readonly title?: string;
}) {
  return (
    <section className="border-2 border-black bg-white p-6 shadow-[4px_4px_0_#111]" aria-labelledby="recruitment-detail-title">
      <p className="font-mono-ui text-[10px] font-black uppercase tracking-[.16em] text-[#d63c1d]">Append-only detail</p>
      <h2 id="recruitment-detail-title" className="mt-2 text-xl font-black">{title}</h2>
      {records.length === 0 ? <p className="mt-4 text-sm text-black/60">No structured recruitment details have been recorded.</p> : (
        <ol className="mt-5 grid gap-3">
          {records.map(record => (
            <li key={record.id} className={`border p-4 ${record.visibility === 'recruiter_internal' ? 'border-[#d63c1d] bg-[#fff1ec]' : 'border-black/20 bg-[#f7f4ed]'}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-mono-ui text-[10px] font-black uppercase">{record.kind.replaceAll('_', ' ')}</p>
                <time className="font-mono-ui text-[10px] text-black/50" dateTime={record.occurredAt}>{new Date(record.occurredAt).toLocaleString()}</time>
              </div>
              {record.visibility === 'recruiter_internal' && <p className="mt-2 text-[10px] font-black uppercase text-[#d63c1d]">Recruiter internal · not shared with applicant</p>}
              {record.message && <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{record.message}</p>}
              <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                {record.scheduledAt && <div><dt className="font-mono-ui text-[9px] uppercase text-black/50">Scheduled</dt><dd>{new Date(record.scheduledAt).toLocaleString()} {record.scheduleTimezone ? `(${record.scheduleTimezone})` : ''}</dd></div>}
                {record.interactionMode && <div><dt className="font-mono-ui text-[9px] uppercase text-black/50">Mode</dt><dd>{record.interactionMode.replaceAll('_', ' ')}</dd></div>}
                {record.locationReference && <div><dt className="font-mono-ui text-[9px] uppercase text-black/50">Location / joining reference</dt><dd className="break-all">{record.locationReference}</dd></div>}
                {record.expiresAt && <div><dt className="font-mono-ui text-[9px] uppercase text-black/50">Expires</dt><dd>{new Date(record.expiresAt).toLocaleString()}</dd></div>}
                {record.outcomeKind && <div><dt className="font-mono-ui text-[9px] uppercase text-black/50">Recorded outcome</dt><dd>{record.outcomeKind.replaceAll('_', ' ')}</dd></div>}
                <div><dt className="font-mono-ui text-[9px] uppercase text-black/50">Recorded by actor</dt><dd className="break-all font-mono-ui">{record.actorId}</dd></div>
              </dl>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
