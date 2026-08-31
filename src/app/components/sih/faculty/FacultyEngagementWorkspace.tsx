import { useMemo, useState } from 'react';
import type { CollaborationEngagement, Organization, Actor } from '../../../domain';
import { collaborationKindLabel, organizationName, participantNames } from './facultyPresentation';

interface FacultyEngagementWorkspaceProps {
  readonly engagement: CollaborationEngagement;
  readonly organizations: readonly Organization[];
  readonly personas: readonly Actor[];
}

const milestoneTemplates = [
  { id: 'scope', label: 'Scope and participant alignment', owner: 'Faculty lead', due: 'Week 1', status: 'in_progress' as const },
  { id: 'delivery', label: 'Delivery check-in', owner: 'Host organization', due: 'Week 2', status: 'planned' as const },
  { id: 'outcome', label: 'Outcome and reflection review', owner: 'Faculty coordinator', due: 'Week 4', status: 'planned' as const },
];

const interestStateLabels = {
  draft: 'Draft intent',
  submitted: 'Submitted expression of interest',
  coordinated: 'Coordinated with host',
} as const;

export function FacultyEngagementWorkspace({ engagement, organizations, personas }: FacultyEngagementWorkspaceProps) {
  const [interestState, setInterestState] = useState<keyof typeof interestStateLabels>('draft');
  const [milestones, setMilestones] = useState<typeof milestoneTemplates>(milestoneTemplates);

  const people = useMemo(() => participantNames(engagement.participantActorIds, personas), [engagement.participantActorIds, personas]);

  const toggleMilestone = (id: string) => {
    setMilestones(current => current.map(milestone => {
      if (milestone.id !== id) return milestone;
      const nextStatus = milestone.status === 'planned' ? 'in_progress' : 'planned';
      return { ...milestone, status: nextStatus };
    }));
  };

  return (
    <section className="mt-8 border-2 border-black bg-white p-5 shadow-[5px_5px_0_#111]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono-ui text-[10px] font-black uppercase tracking-wide text-[#d63c1d]">Faculty workspace</p>
          <h2 className="mt-1 text-2xl font-black">Engagement lifecycle and milestone tracking</h2>
        </div>
        <span className="w-fit border border-black bg-[#e7ff57] px-2 py-1 font-mono-ui text-[9px] font-black uppercase">
          {engagement.status.replaceAll('_', ' ')}
        </span>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="space-y-5">
          <div className="border border-black bg-[#f7f4ed] p-4">
            <p className="font-mono-ui text-[10px] font-black uppercase tracking-wide">Expression of interest</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.entries(interestStateLabels).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setInterestState(value as keyof typeof interestStateLabels)}
                  className={[
                    'min-h-10 border-2 px-3 py-2 font-mono-ui text-[10px] font-black uppercase transition-colors',
                    interestState === value ? 'border-black bg-[#111] text-white' : 'border-black bg-white text-black',
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-4 text-sm leading-relaxed text-black/65">
              This controlled workspace records a faculty-led interest and coordination step only. It does not create new persistence, eligibility logic or institutional authority.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-black">Milestone notes</h3>
            <div className="mt-3 grid gap-3">
              {milestones.map(milestone => (
                <div key={milestone.id} className="border border-black bg-white p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold">{milestone.label}</p>
                      <p className="mt-1 font-mono-ui text-[10px] text-black/55">Owner: {milestone.owner} · Due: {milestone.due}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleMilestone(milestone.id)}
                      className="min-h-10 border-2 border-black bg-[#e7ff57] px-3 py-2 font-mono-ui text-[9px] font-black uppercase"
                    >
                      {milestone.status === 'in_progress' ? 'Mark planned' : 'Start milestone'}
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-mono-ui text-[10px] uppercase text-black/55">State</span>
                    <span className="border border-black px-2 py-1 font-mono-ui text-[9px] font-bold uppercase">
                      {milestone.status.replaceAll('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="grid content-start gap-4">
          <section className="border-2 border-black bg-[#111] p-4 text-white">
            <h3 className="text-lg font-black">Participant and host context</h3>
            <dl className="mt-4 grid gap-3 text-sm text-white/75">
              <div>
                <dt className="font-mono-ui text-[10px] uppercase text-white/50">Host</dt>
                <dd className="mt-1">{organizationName(engagement.hostOrganizationId, organizations)}</dd>
              </div>
              <div>
                <dt className="font-mono-ui text-[10px] uppercase text-white/50">Type</dt>
                <dd className="mt-1">{collaborationKindLabel(engagement.kind)}</dd>
              </div>
              <div>
                <dt className="font-mono-ui text-[10px] uppercase text-white/50">Participants</dt>
                <dd className="mt-1">{people.join(', ') || 'No participant list in fixture'}</dd>
              </div>
            </dl>
          </section>

          <section className="border-2 border-black bg-[#fff4c7] p-4">
            <h3 className="text-lg font-black">Explicit human events</h3>
            <ul className="mt-3 grid gap-2 text-sm leading-relaxed text-black/70">
              <li className="border border-black/25 bg-white p-2">Interest state: {interestStateLabels[interestState]}</li>
              <li className="border border-black/25 bg-white p-2">Milestone review is a local rendered state and not persisted to a backend.</li>
              <li className="border border-black/25 bg-white p-2">Verification tasks remain isolated to the approved Mentor route for scoped attestation.</li>
            </ul>
          </section>
        </aside>
      </div>
    </section>
  );
}
