import { Link } from 'react-router';
import type { Actor, CollaborationEngagement, Organization } from '../../../domain';
import {
  collaborationGroup,
  collaborationGroupLabel,
  collaborationKindLabel,
  collaborationStatusLabel,
  formatDate,
  organizationName,
} from './facultyPresentation';

interface FacultyCollaborationCardProps {
  readonly engagement: CollaborationEngagement;
  readonly organizations: readonly Organization[];
  readonly personas: readonly Actor[];
  readonly detailBasePath?: string;
}

export function FacultyCollaborationCard({
  engagement,
  organizations,
  detailBasePath = '/demo/faculty',
}: FacultyCollaborationCardProps) {
  const group = collaborationGroup(engagement.kind);
  const base = detailBasePath.replace(/\/$/, '');
  return (
    <article className="flex min-h-80 flex-col border-2 border-black bg-white p-5 shadow-[4px_4px_0_#111]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono-ui text-[10px] font-black uppercase tracking-wide text-[#d63c1d]">{collaborationGroupLabel(group)}</p>
          <p className="mt-1 font-mono-ui text-[10px] uppercase text-black/55">{collaborationKindLabel(engagement.kind)}</p>
        </div>
        <span className="border border-black bg-[#e7ff57] px-2 py-1 font-mono-ui text-[9px] font-bold uppercase">{collaborationStatusLabel(engagement.status)}</span>
      </div>
      <h2 className="mt-6 text-2xl font-black">{engagement.objectives[0] ?? 'Collaboration engagement'}</h2>
      <p className="mt-3 text-sm leading-relaxed text-black/65">Hosted by {organizationName(engagement.hostOrganizationId, organizations)}.</p>
      <dl className="mt-auto grid gap-2 border-t border-black/20 pt-4 font-mono-ui text-[10px]">
        <div><dt className="uppercase text-black/65">Starts</dt><dd>{formatDate(engagement.startsAt)}</dd></div>
        <div><dt className="uppercase text-black/65">Partners</dt><dd>{engagement.partnerOrganizationIds.length}</dd></div>
        <div><dt className="uppercase text-black/65">Participants</dt><dd>{engagement.participantActorIds.length}</dd></div>
      </dl>
      <Link to={`${base}/${engagement.id}`} className="mt-5 inline-flex min-h-11 items-center justify-center border-2 border-black bg-[#111] px-4 py-3 text-center font-mono-ui text-[10px] font-black uppercase tracking-wide text-white hover:bg-[#d63c1d] focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#ff5c35]">
        Review collaboration details
      </Link>
    </article>
  );
}
