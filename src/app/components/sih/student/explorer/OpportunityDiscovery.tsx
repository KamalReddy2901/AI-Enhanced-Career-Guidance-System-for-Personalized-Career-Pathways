import type { Opportunity, OpportunityVersion } from '../../../../domain';
import OpportunityCard from './OpportunityCard';

interface OpportunityDiscoveryProps {
  readonly opportunities: readonly {
    opportunity: Opportunity;
    version: OpportunityVersion;
  }[];
  readonly onSelectOpportunity?: (opportunityId: Opportunity['id']) => void;
}

export default function OpportunityDiscovery({
  opportunities,
  onSelectOpportunity,
}: OpportunityDiscoveryProps) {
  return (
    <section
      className="border-2 border-black bg-white p-6 shadow-[5px_5px_0_#111]"
      aria-labelledby="opportunity-discovery-title"
    >
      <div>
        <p className="font-mono-ui text-xs font-black uppercase tracking-[0.18em] text-[#d63c1d]">
          Opportunities
        </p>

        <h2
          id="opportunity-discovery-title"
          className="mt-2 text-3xl font-black"
        >
          Discover Opportunities
        </h2>

        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-black/65">
          Explore available opportunities and review their requirements,
          eligibility, and source information before deciding what to pursue.
        </p>
      </div>

      {opportunities.length === 0 ? (
        <p className="mt-6 border-l-4 border-[#ff5c35] pl-3 text-sm text-black/60">
          No opportunities are currently available in this controlled view.
        </p>
      ) : (
        <div className="mt-6 grid gap-5">
          {opportunities.map(({ opportunity, version }) => (
            <OpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
              opportunityVersion={version}
              onViewDetails={() => onSelectOpportunity?.(opportunity.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}