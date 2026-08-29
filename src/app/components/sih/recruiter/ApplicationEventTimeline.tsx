import type { ApplicationEventReadModel } from '../../../services/sih/types';

interface Props {
  readonly events: readonly ApplicationEventReadModel[];
}

export default function ApplicationEventTimeline({ events }: Props) {
  if (events.length === 0) {
    return (
      <div className="border-2 border-black bg-white p-6 shadow-[4px_4px_0_#111]">
        <p className="font-mono-ui text-sm text-black/60">No timeline events recorded.</p>
      </div>
    );
  }

  return (
    <div className="border-2 border-black bg-white p-6 shadow-[4px_4px_0_#111]">
      <h3 className="mb-4 font-mono-ui text-[11px] font-black uppercase text-[#d63c1d]">
        Event Timeline
      </h3>

      <div className="space-y-4">
        {events.map((ev, i) => {
          const isHumanEvent = ev.eventKind === 'human_rejection' || (ev.eventKind === 'stage_transition' && ev.actorId !== 'system');
          
          return (
            <div key={ev.id} className="relative pl-4">
              {/* Timeline line connecting items */}
              {i < events.length - 1 && (
                <div className="absolute bottom-0 left-[7px] top-4 w-0.5 bg-black/20" />
              )}
              {/* Timeline dot */}
              <div className={`absolute left-1 top-1.5 h-2 w-2 rounded-full border-2 border-black ${isHumanEvent ? 'bg-[#d63c1d]' : 'bg-black'}`} />

              <div className="mb-1 flex items-center justify-between">
                <span className="font-mono-ui text-[10px] font-black uppercase">
                  {ev.eventKind.replace('_', ' ')}
                </span>
                <span className="font-mono-ui text-[9px] text-black/50">
                  {new Date(ev.occurredAt).toLocaleString()}
                </span>
              </div>
              
              <p className="text-sm">
                Stage changed from <strong className="font-mono-ui text-[10px] uppercase">{ev.fromStage.replace('_', ' ')}</strong> to <strong className="font-mono-ui text-[10px] uppercase">{ev.toStage.replace('_', ' ')}</strong>
              </p>

              <div className="mt-1 font-mono-ui text-[9px] text-black/60">
                Actor: {ev.actorId.substring(0, 8)}...
              </div>

              {ev.reason && (
                <div className="mt-2 bg-[#f7f4ed] p-2 text-sm text-[#d63c1d]">
                  <strong>Reason:</strong> {ev.reason}
                </div>
              )}
              {ev.note && (
                <div className="mt-2 bg-[#f7f4ed] p-2 text-sm italic">
                  <strong>Note:</strong> {ev.note}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
