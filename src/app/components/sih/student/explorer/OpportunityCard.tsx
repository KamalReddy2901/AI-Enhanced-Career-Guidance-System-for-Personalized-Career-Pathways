import type { Opportunity, OpportunityVersion } from '../../../../domain';

type OpportunityCardProps = {
  readonly opportunity: Opportunity;
  readonly opportunityVersion: OpportunityVersion;
  readonly onViewDetails: () => void;
};

export default function OpportunityCard({
  opportunity,
  opportunityVersion,
  onViewDetails,
}: OpportunityCardProps) {
  return (
    <article className="border-2 border-black bg-white p-5 shadow-[4px_4px_0_#111]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono-ui text-[10px] font-black uppercase tracking-[0.18em] text-[#d63c1d]">
            Opportunity
          </p>

          <h3 className="mt-2 text-2xl font-black">
            {opportunityVersion.title}
          </h3>
        </div>

        <span className="border-2 border-black px-2 py-1 font-mono-ui text-[10px] font-black uppercase">
          {opportunity.status}
        </span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-black/70">
        {opportunityVersion.description}
      </p>

      <dl className="mt-5 grid gap-px border border-black bg-black sm:grid-cols-3">
        <div className="bg-[#f7f4ed] p-3">
          <dt className="font-mono-ui text-[10px] uppercase">Source</dt>
          <dd className="mt-1 text-sm font-bold">
            {opportunityVersion.source.sourceSystem}
          </dd>
        </div>

        <div className="bg-[#f7f4ed] p-3">
          <dt className="font-mono-ui text-[10px] uppercase">Version</dt>
          <dd className="mt-1 text-sm font-bold">
            {opportunityVersion.version}
          </dd>
        </div>

        <div className="bg-[#f7f4ed] p-3">
          <dt className="font-mono-ui text-[10px] uppercase">Requirements</dt>
          <dd className="mt-1 text-sm font-bold">
            {opportunityVersion.requirements.length}
          </dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={onViewDetails}
        className="mt-5 min-h-11 border-2 border-black bg-[#e7ff57] px-4 py-2 font-mono-ui text-xs font-black uppercase tracking-wide shadow-[3px_3px_0_#111] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#ff5c35]"
      >
        View opportunity details
      </button>
    </article>
  );
}