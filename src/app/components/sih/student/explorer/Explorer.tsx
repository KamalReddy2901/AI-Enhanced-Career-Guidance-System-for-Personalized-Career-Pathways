import type { OpportunityVersion } from '../../../../domain/opportunity';

interface ExplorerProps {
  readonly opportunityVersion?: OpportunityVersion;
  readonly onSelectOpportunity?: () => void;
}

export default function Explorer({
  opportunityVersion,
  onSelectOpportunity,
}: ExplorerProps) {
  if (!opportunityVersion) {
    return (
      <section className="border-2 border-black bg-white p-6 shadow-[5px_5px_0_#111]">
        <p className="font-mono-ui text-xs font-black uppercase tracking-[0.18em] text-[#d63c1d]">
          Career Explorer
        </p>

        <h2 className="mt-2 text-3xl font-black">
          Explore Your Career Path
        </h2>

        <p className="mt-3 max-w-2xl text-black/65">
          Discover opportunities and understand what each path involves,
          including its requirements and eligibility conditions.
        </p>

        <p className="mt-6 border-l-4 border-[#ff5c35] pl-3 text-sm text-black/60">
          No opportunity is currently available in this controlled view.
        </p>
      </section>
    );
  }

  const requiredRequirements = opportunityVersion.requirements.filter(
    requirement => requirement.priority === 'required',
  );

  const preferredRequirements = opportunityVersion.requirements.filter(
    requirement => requirement.priority === 'preferred',
  );

  return (
    <section
      className="border-2 border-black bg-white p-6 shadow-[5px_5px_0_#111]"
      aria-labelledby="career-explorer-title"
    >
      <p className="font-mono-ui text-xs font-black uppercase tracking-[0.18em] text-[#d63c1d]">
        Career Explorer
      </p>

      <h2
        id="career-explorer-title"
        className="mt-2 text-3xl font-black"
      >
        Explore Your Career Path
      </h2>

      <p className="mt-3 max-w-2xl text-black/65">
        Discover opportunities and understand what each opportunity involves
        before deciding what to do next.
      </p>

      {/* Opportunity summary */}
      <div className="mt-6 border-2 border-black bg-[#111] p-5 text-white">
        <p className="font-mono-ui text-[10px] font-bold uppercase tracking-[0.18em] text-[#e7ff57]">
          Current opportunity
        </p>

        <h3 className="mt-2 text-2xl font-black">
          {opportunityVersion.title}
        </h3>

        <p className="mt-2 text-sm leading-relaxed text-white/70">
          {opportunityVersion.description}
        </p>

        <dl className="mt-5 grid gap-px border border-white/20 bg-white/20 sm:grid-cols-3">
          <div className="bg-[#111] p-3">
            <dt className="font-mono-ui text-[10px] uppercase text-white/50">
              Type
            </dt>
            <dd className="mt-1 text-sm font-bold capitalize">
              {opportunityVersion.type.replaceAll('_', ' ')}
            </dd>
          </div>

          <div className="bg-[#111] p-3">
            <dt className="font-mono-ui text-[10px] uppercase text-white/50">
              Requirements
            </dt>
            <dd className="mt-1 text-sm font-bold">
              {opportunityVersion.requirements.length}
            </dd>
          </div>

          <div className="bg-[#111] p-3">
            <dt className="font-mono-ui text-[10px] uppercase text-white/50">
              Version
            </dt>
            <dd className="mt-1 text-sm font-bold">
              {opportunityVersion.version}
            </dd>
          </div>
        </dl>

        {onSelectOpportunity && (
          <button
            type="button"
            onClick={onSelectOpportunity}
            className="mt-5 min-h-11 border-2 border-black bg-[#e7ff57] px-5 py-3 font-mono-ui text-xs font-black uppercase tracking-wide text-black shadow-[4px_4px_0_#000] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#ff5c35]"
          >
            View Opportunity Details
          </button>
        )}
      </div>

      {/* Requirements */}
      <div className="mt-8">
        <p className="font-mono-ui text-xs font-black uppercase tracking-[0.18em] text-[#d63c1d]">
          Opportunity detail
        </p>

        <h3 className="mt-2 text-2xl font-black">
          What this opportunity requires
        </h3>

        <p className="mt-2 text-sm text-black/60">
          Exact requirement wording is preserved from the controlled
          opportunity version.
        </p>
      </div>

      {requiredRequirements.length > 0 && (
        <div className="mt-5">
          <h4 className="font-mono-ui text-xs font-black uppercase tracking-[0.16em]">
            Required
          </h4>

          <div className="mt-3 grid gap-3">
            {requiredRequirements.map(requirement => (
              <article
                key={requirement.id}
                className="border-2 border-black bg-[#f7f4ed] p-4"
              >
                <div className="flex flex-wrap gap-2">
                  <span className="border border-black bg-white px-2 py-1 font-mono-ui text-[10px] font-bold uppercase">
                    {requirement.category.replaceAll('_', ' ')}
                  </span>

                  {requirement.hardGate && (
                    <span className="border border-[#d63c1d] bg-[#fff1ec] px-2 py-1 font-mono-ui text-[10px] font-bold uppercase text-[#d63c1d]">
                      Hard gate
                    </span>
                  )}
                </div>

                <p className="mt-3 text-sm font-bold leading-relaxed">
                  {requirement.literalSourceWording}
                </p>
              </article>
            ))}
          </div>
        </div>
      )}

      {preferredRequirements.length > 0 && (
        <div className="mt-7">
          <h4 className="font-mono-ui text-xs font-black uppercase tracking-[0.16em]">
            Preferred
          </h4>

          <div className="mt-3 grid gap-3">
            {preferredRequirements.map(requirement => (
              <article
                key={requirement.id}
                className="border-2 border-black bg-white p-4"
              >
                <div className="flex flex-wrap gap-2">
                  <span className="border border-black bg-[#e7ff57] px-2 py-1 font-mono-ui text-[10px] font-bold uppercase">
                    {requirement.category.replaceAll('_', ' ')}
                  </span>
                </div>

                <p className="mt-3 text-sm font-bold leading-relaxed">
                  {requirement.literalSourceWording}
                </p>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* Eligibility */}
      <div className="mt-8">
        <h3 className="text-2xl font-black">
          Eligibility
        </h3>

        {opportunityVersion.eligibilityRules.length === 0 ? (
          <p className="mt-3 text-sm text-black/60">
            No eligibility rules are recorded for this opportunity version.
          </p>
        ) : (
          <div className="mt-3 grid gap-3">
            {opportunityVersion.eligibilityRules.map((rule, index) => (
              <article
                key={`${rule.kind}-${index}`}
                className="border-2 border-black bg-white p-4"
              >
                <p className="font-mono-ui text-[10px] font-black uppercase tracking-[0.14em] text-black/50">
                  Eligibility rule {index + 1}
                </p>

                <p className="mt-2 text-sm font-bold leading-relaxed">
                  {rule.literalSourceWording}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Source and version */}
      <div className="mt-8 border-t-2 border-black pt-5">
        <h3 className="text-xl font-black">
          Opportunity source
        </h3>

        <p className="mt-2 text-sm text-black/65">
          This detail is tied to the canonical opportunity version and its
          recorded source.
        </p>

        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="border border-black p-3">
            <dt className="font-mono-ui text-[10px] font-bold uppercase text-black/50">
              Version
            </dt>
            <dd className="mt-1 font-bold">
              {opportunityVersion.version}
            </dd>
          </div>

          <div className="border border-black p-3">
            <dt className="font-mono-ui text-[10px] font-bold uppercase text-black/50">
              Source
            </dt>
            <dd className="mt-1 break-words text-sm font-bold">
              {opportunityVersion.source.sourceUrl ??
                opportunityVersion.source.sourceRecordId ??
                'Recorded source reference'}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}