import { Link } from 'react-router';
import type { Actor, CollaborationEngagement, Organization } from '../../../domain';
import { FacultyEngagementWorkspace } from './FacultyEngagementWorkspace';
import {
  collaborationGroup,
  collaborationGroupLabel,
  collaborationKindLabel,
  collaborationStatusLabel,
  collaborationDuration,
  formatDate,
  organizationName,
  participantNames,
  unsupportedFacultyField,
} from './facultyPresentation';

interface FacultyCollaborationDetailProps {
  readonly engagement?: CollaborationEngagement;
  readonly organizations: readonly Organization[];
  readonly personas: readonly Actor[];
}

function DetailField({ label, value }: { readonly label: string; readonly value: string }) {
  return <div className="border border-black/25 bg-[#f7f4ed] p-4"><dt className="font-mono-ui text-[10px] font-bold uppercase text-black/55">{label}</dt><dd className="mt-2 text-sm leading-relaxed">{value}</dd></div>;
}

export function FacultyCollaborationDetail({ engagement, organizations, personas }: FacultyCollaborationDetailProps) {
  if (!engagement) {
    return (
      <section className="border-2 border-dashed border-black bg-white p-8 text-center">
        <p className="font-mono-ui text-xs font-black uppercase tracking-wide text-[#d63c1d]">404 · Controlled record not found</p>
        <h1 className="mt-3 text-3xl font-black">That collaboration is not available</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-black/65">The requested ID does not match one of the controlled collaboration fixtures.</p>
        <Link to="/demo/faculty" className="mt-6 inline-flex min-h-11 items-center border-2 border-black bg-[#e7ff57] px-4 py-3 font-mono-ui text-xs font-black uppercase focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#ff5c35]">Back to faculty explorer</Link>
      </section>
    );
  }

  const group = collaborationGroup(engagement.kind);
  const participants = participantNames(engagement.participantActorIds, personas);
  return (
    <div>
      <Link to="/demo/faculty" className="font-mono-ui text-xs font-black uppercase text-[#d63c1d] hover:underline focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#ff5c35]">← Back to faculty explorer</Link>
      <header className="mt-6 max-w-4xl">
        <p className="font-mono-ui text-xs font-black uppercase tracking-[0.2em] text-[#d63c1d]">{collaborationGroupLabel(group)}</p>
        <h1 className="mt-2 text-4xl font-black leading-[0.95] sm:text-6xl">{engagement.objectives[0] ?? 'Controlled collaboration'}</h1>
        <p className="mt-4 text-base leading-relaxed text-black/70">Read-only detail for a synthetic {collaborationKindLabel(engagement.kind)} engagement. No application or expression-of-interest action is represented in N2.</p>
      </header>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <section className="border-2 border-black bg-white p-5 shadow-[5px_5px_0_#111]">
          <p className="font-mono-ui text-[10px] font-black uppercase tracking-wide">Engagement record</p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <DetailField label="Collaboration type" value={collaborationKindLabel(engagement.kind)} />
            <DetailField label="Status" value={collaborationStatusLabel(engagement.status)} />
            <DetailField label="Host organization" value={organizationName(engagement.hostOrganizationId, organizations)} />
            <DetailField label="Partner organizations" value={engagement.partnerOrganizationIds.map(id => organizationName(id, organizations)).join(', ')} />
            <DetailField label="Starts" value={formatDate(engagement.startsAt)} />
            <DetailField label="Ends" value={formatDate(engagement.endsAt)} />
            <DetailField label="Duration" value={collaborationDuration(engagement)} />
            <DetailField label="Eligibility" value={unsupportedFacultyField} />
          </dl>
          <h2 className="mt-7 text-xl font-black">Collaboration objectives</h2>
          <ul className="mt-3 grid gap-2 text-sm leading-relaxed">{engagement.objectives.map(objective => <li key={objective} className="border-l-4 border-[#ff5c35] pl-3">{objective}</li>)}</ul>
        </section>
        <aside className="grid content-start gap-4">
          <section className="border-2 border-black bg-[#fff4c7] p-5">
            <h2 className="text-xl font-black">Participation context</h2>
            <p className="mt-2 text-sm leading-relaxed text-black/70">The current fixture identifies controlled participants but does not assign participant roles.</p>
            <ul className="mt-4 grid gap-2 text-sm">{participants.map(participant => <li key={participant} className="border border-black/20 bg-white p-3">{participant}</li>)}</ul>
          </section>
          <section className="border-2 border-black bg-[#111] p-5 text-white">
            <h2 className="text-xl font-black">Fields not represented</h2>
            <dl className="mt-4 grid gap-3 text-sm text-white/75">
              <DetailField label="Expected outputs" value={unsupportedFacultyField} />
              <DetailField label="IP terms" value={unsupportedFacultyField} />
              <DetailField label="Confidentiality" value={unsupportedFacultyField} />
            </dl>
          </section>
        </aside>
      </div>
      <FacultyEngagementWorkspace engagement={engagement} organizations={organizations} personas={personas} />
    </div>
  );
}