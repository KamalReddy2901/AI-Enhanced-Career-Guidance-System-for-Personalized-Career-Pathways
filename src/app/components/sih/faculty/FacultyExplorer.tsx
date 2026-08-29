import { useState } from 'react';
import type { Actor, CollaborationEngagement, Organization } from '../../../domain';
import { FacultyCollaborationCard } from './FacultyCollaborationCard';
import { collaborationGroup, collaborationGroupLabel, type FacultyCollaborationGroup } from './facultyPresentation';

interface FacultyExplorerProps {
  readonly collaborations: readonly CollaborationEngagement[];
  readonly organizations: readonly Organization[];
  readonly personas: readonly Actor[];
}

const groupOptions = ['all', 'training_fdp', 'consultancy_research', 'mentoring_workshop_guest_lecture', 'other'] as const;
const statusOptions = ['all', 'proposed', 'approved', 'active', 'completed', 'cancelled'] as const;

export function FacultyExplorer({ collaborations, organizations, personas }: FacultyExplorerProps) {
  const [selectedGroup, setSelectedGroup] = useState<(typeof groupOptions)[number]>('all');
  const [selectedStatus, setSelectedStatus] = useState<(typeof statusOptions)[number]>('all');
  const visibleCollaborations = collaborations.filter(engagement => (
    (selectedGroup === 'all' || collaborationGroup(engagement.kind) === selectedGroup)
    && (selectedStatus === 'all' || engagement.status === selectedStatus)
  ));
  const grouped = visibleCollaborations.reduce<Map<FacultyCollaborationGroup, CollaborationEngagement[]>>((groups, engagement) => {
    const group = collaborationGroup(engagement.kind);
    const existing = groups.get(group) ?? [];
    groups.set(group, [...existing, engagement]);
    return groups;
  }, new Map());

  return (
    <section aria-labelledby="faculty-explorer-title">
      <div className="border-2 border-black bg-[#fff4c7] p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono-ui text-[10px] font-black uppercase tracking-wide">Discovery controls</p>
            <h2 id="faculty-explorer-title" className="mt-1 text-xl font-black">Find a collaboration by type or status</h2>
          </div>
          <p className="font-mono-ui text-xs">{visibleCollaborations.length} of {collaborations.length} shown</p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 font-mono-ui text-[10px] font-bold uppercase">
            Collaboration type
            <select value={selectedGroup} onChange={event => setSelectedGroup(event.target.value as (typeof groupOptions)[number])} className="min-h-11 border-2 border-black bg-white px-3 py-2 text-xs normal-case focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#ff5c35]">
              {groupOptions.map(group => <option key={group} value={group}>{group === 'all' ? 'All types' : collaborationGroupLabel(group as FacultyCollaborationGroup)}</option>)}
            </select>
          </label>
          <label className="grid gap-1 font-mono-ui text-[10px] font-bold uppercase">
            Lifecycle status
            <select value={selectedStatus} onChange={event => setSelectedStatus(event.target.value as (typeof statusOptions)[number])} className="min-h-11 border-2 border-black bg-white px-3 py-2 text-xs normal-case focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#ff5c35]">
              {statusOptions.map(status => <option key={status} value={status}>{status === 'all' ? 'All statuses' : status.replaceAll('_', ' ')}</option>)}
            </select>
          </label>
        </div>
      </div>
      {visibleCollaborations.length === 0 ? (
        <div className="mt-6 border-2 border-dashed border-black bg-white p-8 text-center">
          <h3 className="text-xl font-black">No controlled collaborations match these filters</h3>
          <p className="mt-2 text-sm text-black/60">Change the type or status to inspect the available synthetic records.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-8">
          {[...grouped.entries()].map(([group, items]) => (
            <section key={group} aria-labelledby={`faculty-group-${group}`}>
              <div className="mb-3 border-t-2 border-black pt-3"><h3 id={`faculty-group-${group}`} className="font-mono-ui text-xs font-black uppercase tracking-wide">{collaborationGroupLabel(group)}</h3></div>
              <div className="grid gap-4 lg:grid-cols-3">
                {items.map(engagement => <FacultyCollaborationCard key={engagement.id} engagement={engagement} organizations={organizations} personas={personas} />)}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}