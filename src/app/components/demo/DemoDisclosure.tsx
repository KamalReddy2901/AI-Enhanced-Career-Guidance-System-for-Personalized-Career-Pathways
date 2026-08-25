const capabilityStates = ['implemented', 'controlled_prototype', 'integration_ready', 'target_architecture'] as const;

export function DemoDisclosure() {
  return (
    <aside className="border-b-2 border-black bg-[#e7ff57] px-4 py-3 text-black" aria-label="Controlled demo disclosure">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-mono-ui text-xs font-black uppercase tracking-[0.18em]">Controlled synthetic demo</p>
          <p className="mt-1 max-w-4xl text-sm leading-relaxed">
            Every organization, persona and opportunity here is synthetic. No live employer posting, AIIA endorsement,
            government integration, live verification service or AI/model call is represented.
          </p>
        </div>
        <div className="flex max-w-xl flex-wrap gap-1.5" aria-label="Truthful capability vocabulary">
          {capabilityStates.map(state => (
            <span key={state} className="border border-black bg-white/70 px-2 py-1 font-mono-ui text-[10px] font-bold uppercase tracking-wide">
              {state.replaceAll('_', ' ')}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}
