import type { OpportunityRequirement, EligibilityRule } from '../../../domain/opportunity';

interface Props {
  readonly requirements: readonly OpportunityRequirement[];
  readonly eligibilityRules: readonly EligibilityRule[];
  readonly onPublish: () => void;
  readonly isPublishing: boolean;
  readonly opportunityVersionId?: string;
}

export default function OpportunityReviewPanel({ requirements, eligibilityRules, onPublish, isPublishing, opportunityVersionId }: Props) {
  const reqsUnconfirmed = requirements.filter(r => !r.humanConfirmed).length;
  const rulesUnconfirmed = eligibilityRules.filter(r => !r.humanConfirmed).length;
  const totalUnconfirmed = reqsUnconfirmed + rulesUnconfirmed;

  const canPublish = totalUnconfirmed === 0 && !!opportunityVersionId && requirements.length > 0;

  return (
    <section className="border-2 border-black bg-[#111] p-6 text-white shadow-[4px_4px_0_#d63c1d]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black uppercase tracking-wide text-[#e7ff57]">
            Publication Review
          </h2>
          <p className="mt-1 font-mono-ui text-[11px] text-white/70">
            {totalUnconfirmed > 0
              ? `${totalUnconfirmed} item(s) require human confirmation before publishing.`
              : 'All items confirmed. Ready to publish.'}
          </p>
          {!opportunityVersionId && (
            <p className="mt-2 font-mono-ui text-[11px] font-black uppercase text-[#d63c1d]">
              Draft persistence is blocked — Cannot publish unpersisted draft.
            </p>
          )}
        </div>

        <button
          type="button"
          disabled={!canPublish || isPublishing}
          onClick={onPublish}
          className="min-h-11 border-2 border-[#e7ff57] bg-transparent px-6 py-2 font-mono-ui text-sm font-black uppercase tracking-wide text-[#e7ff57] transition-colors hover:bg-[#e7ff57] hover:text-black focus-visible:outline focus-visible:outline-4 focus-visible:outline-white disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-[#e7ff57]"
        >
          {isPublishing ? 'Publishing...' : 'Publish Opportunity'}
        </button>
      </div>

      {totalUnconfirmed > 0 && (
        <div className="mt-4 border-l-4 border-[#d63c1d] pl-4">
          <p className="font-mono-ui text-xs font-bold text-white">
            Explicit confirmation is required for:
          </p>
          <ul className="mt-2 list-inside list-disc font-mono-ui text-[11px] text-white/80">
            {reqsUnconfirmed > 0 && <li>{reqsUnconfirmed} requirement(s)</li>}
            {rulesUnconfirmed > 0 && <li>{rulesUnconfirmed} eligibility rule(s)</li>}
          </ul>
        </div>
      )}
    </section>
  );
}
