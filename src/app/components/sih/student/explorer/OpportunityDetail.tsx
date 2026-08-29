import type { Opportunity, OpportunityVersion } from '../../../../domain';

type OpportunityDetailProps = {
  readonly opportunity: Opportunity;
  readonly opportunityVersion: OpportunityVersion;
  readonly onBack: () => void;
};

function formatCategory(category: string): string {
  return category.replaceAll('_', ' ');
}

export default function OpportunityDetail({
  opportunity,
  opportunityVersion,
  onBack,
}: OpportunityDetailProps) {
  return (
    <section className="border-2 border-black bg-white p-5 shadow-[6px_6px_0_#111]">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 font-mono-ui text-xs font-black uppercase underline underline-offset-4 focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#ff5c35]"
      >
        ← Back to opportunities
      </button>

      <header>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono-ui text-[10px] font-black uppercase tracking-[0.18em] text-[#d63c1d]">
              Opportunity detail
            </p>

            <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              {opportunityVersion.title}
            </h2>
          </div>

          <span className="border-2 border-black px-3 py-1 font-mono-ui text-[10px] font-black uppercase">
            {opportunity.status}
          </span>
        </div>

        <p className="mt-5 max-w-3xl text-base leading-relaxed text-black/70">
          {opportunityVersion.description}
        </p>
      </header>

      <dl className="mt-7 grid gap-px border-2 border-black bg-black sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-[#f7f4ed] p-4">
          <dt className="font-mono-ui text-[10px] font-bold uppercase">
            Source
          </dt>
          <dd className="mt-1 text-sm font-bold">
            {opportunityVersion.source.sourceSystem}
          </dd>
        </div>

        <div className="bg-[#f7f4ed] p-4">
          <dt className="font-mono-ui text-[10px] font-bold uppercase">
            Source record
          </dt>
          <dd className="mt-1 break-all text-sm font-bold">
            {opportunityVersion.source.sourceRecordId ?? 'Not provided'}
          </dd>
        </div>

        <div className="bg-[#f7f4ed] p-4">
          <dt className="font-mono-ui text-[10px] font-bold uppercase">
            Version
          </dt>
          <dd className="mt-1 text-sm font-bold">
            {opportunityVersion.version}
          </dd>
        </div>

        <div className="bg-[#f7f4ed] p-4">
          <dt className="font-mono-ui text-[10px] font-bold uppercase">
            Opportunity ID
          </dt>
          <dd className="mt-1 break-all text-sm font-bold">
            {opportunity.id}
          </dd>
        </div>
      </dl>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="requirements-title">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="font-mono-ui text-[10px] font-black uppercase tracking-[0.18em]">
                Canonical requirements
              </p>
              <h3 id="requirements-title" className="mt-1 text-2xl font-black">
                What this opportunity asks for
              </h3>
            </div>

            <span className="font-mono-ui text-xs font-bold">
              {opportunityVersion.requirements.length} total
            </span>
          </div>

          <div className="mt-4 grid gap-3">
            {opportunityVersion.requirements.map((requirement) => (
              <article
                key={requirement.id}
                className="border-2 border-black bg-[#f7f4ed] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span className="font-mono-ui text-[10px] font-black uppercase text-[#d63c1d]">
                    {formatCategory(requirement.category)}
                  </span>

                  <span className="font-mono-ui text-[10px] font-bold uppercase">
                    {requirement.priority}
                  </span>
                </div>

                <p className="mt-3 font-bold leading-relaxed">
                  {requirement.literalSourceWording}
                </p>

                <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-mono-ui font-bold uppercase">
                  <span className="border border-black px-2 py-1">
                    {requirement.importance}
                  </span>

                  {requirement.hardGate && (
                    <span className="border border-black px-2 py-1">
                      Hard gate
                    </span>
                  )}

                  <span className="border border-black px-2 py-1">
                    Evidence: {formatCategory(requirement.evidenceExpectation)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="eligibility-title">
          <p className="font-mono-ui text-[10px] font-black uppercase tracking-[0.18em]">
            Canonical eligibility
          </p>

          <h3 id="eligibility-title" className="mt-1 text-2xl font-black">
            Eligibility rules
          </h3>

          {opportunityVersion.eligibilityRules.length === 0 ? (
            <p className="mt-4 border-2 border-black bg-[#f7f4ed] p-4 text-sm text-black/70">
              No eligibility rules are recorded for this opportunity version.
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {opportunityVersion.eligibilityRules.map((rule, index) => (
                <article
                  key={`${rule.kind}-${index}`}
                  className="border-2 border-black bg-[#f7f4ed] p-4"
                >
                  <span className="font-mono-ui text-[10px] font-black uppercase text-[#d63c1d]">
                    {formatCategory(rule.kind)}
                  </span>

                  <p className="mt-2 font-bold leading-relaxed">
                    {rule.literalSourceWording}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="mt-8 border-2 border-black bg-[#111] p-5 text-white">
        <p className="font-mono-ui text-[10px] font-black uppercase tracking-[0.18em] text-[#e7ff57]">
          Provenance
        </p>

        <p className="mt-2 text-sm leading-relaxed text-white/75">
          This detail view displays the canonical opportunity version and its
          recorded source information. It does not create or modify
          opportunity data.
        </p>

        <p className="mt-4 font-mono-ui text-xs font-bold">
          Captured: {opportunityVersion.source.capturedAt}
        </p>
      </section>
    </section>
  );
}