import type { DemoTraceEvent } from '../../demo/demoTypes';

export function EvidenceTimeline({ events }: { readonly events: readonly DemoTraceEvent[] }) {
  return (
    <section className="border-2 border-black bg-[#111] p-4 text-white" aria-labelledby="causal-trace-title">
      <p className="font-mono-ui text-[10px] font-bold uppercase tracking-[0.18em] text-[#e7ff57]">Why did this change?</p>
      <h2 id="causal-trace-title" className="mt-1 text-2xl font-black">Append-only controlled event trace</h2>
      <ol className="mt-5 grid gap-4">
        {events.map((event, index) => (
          <li key={event.id} className="grid grid-cols-[2rem_1fr] gap-3">
            <span className="grid h-8 w-8 place-items-center border border-[#e7ff57] font-mono-ui text-xs font-black" aria-hidden="true">{index + 1}</span>
            <div className="border-b border-white/20 pb-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="font-bold">{event.kind.replaceAll('_', ' ')}</h3>
                <time className="font-mono-ui text-[10px] text-white/55">{event.occurredAt}</time>
              </div>
              <p className="mt-1 text-sm text-white/70">{event.summary}</p>
              <p className="mt-2 font-mono-ui text-[10px] uppercase text-[#e7ff57]">Actor: {event.actorLabel}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
