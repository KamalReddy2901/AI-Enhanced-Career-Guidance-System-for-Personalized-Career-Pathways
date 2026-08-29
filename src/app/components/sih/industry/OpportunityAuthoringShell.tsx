import { useState } from 'react';
import type { OpportunityVersion, OpportunityRequirement, EligibilityRule } from '../../../domain/opportunity';
import type { SihBrowserDal } from '../../../services/sih/browserDal';
import OpportunityBasicsSection, { type OpportunityBasicsDraft } from './OpportunityBasicsSection';
import OpportunityRequirementsSection from './OpportunityRequirementsSection';
import OpportunityEligibilitySection from './OpportunityEligibilitySection';
import OpportunityReviewPanel from './OpportunityReviewPanel';

interface Props {
  readonly dal: SihBrowserDal;
  // If editing an existing draft, it would be passed here.
  readonly initialDraft?: Partial<OpportunityVersion>;
}

export default function OpportunityAuthoringShell({ dal, initialDraft }: Props) {
  const [basics, setBasics] = useState<OpportunityBasicsDraft>({
    title: initialDraft?.title ?? '',
    description: initialDraft?.description ?? '',
    type: initialDraft?.type ?? '',
    audiences: initialDraft?.audiences ? [...initialDraft.audiences] : [],
    closesAt: initialDraft?.closesAt,
  });

  const [requirements, setRequirements] = useState<OpportunityRequirement[]>(
    initialDraft?.requirements ? [...initialDraft.requirements] : []
  );

  const [rules, setRules] = useState<EligibilityRule[]>(
    initialDraft?.eligibilityRules ? [...initialDraft.eligibilityRules] : []
  );

  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const handlePublish = async () => {
    if (!initialDraft?.id) {
      setPublishError('Draft persistence is blocked. Cannot publish a brand new draft from UI alone.');
      return;
    }

    try {
      setIsPublishing(true);
      setPublishError(null);
      await dal.publishOpportunityVersion(initialDraft.id);
      alert('Opportunity published successfully!');
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : 'Unknown publish error');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase tracking-tighter sm:text-4xl">
          Opportunity Authoring
        </h1>
        <p className="mt-2 font-mono-ui text-sm text-black/70">
          Controlled prototype — not live AI
        </p>
      </div>

      <OpportunityBasicsSection draft={basics} onChange={setBasics} />
      
      <OpportunityRequirementsSection requirements={requirements} onChange={setRequirements} />
      
      <OpportunityEligibilitySection rules={rules} onChange={setRules} />

      {publishError && (
        <div className="border-l-4 border-[#d63c1d] bg-[#f7f4ed] p-4 text-[#d63c1d]">
          <p className="font-mono-ui text-sm font-bold">Publishing Failed</p>
          <p className="text-sm">{publishError}</p>
        </div>
      )}

      <OpportunityReviewPanel
        requirements={requirements}
        eligibilityRules={rules}
        onPublish={handlePublish}
        isPublishing={isPublishing}
        opportunityVersionId={initialDraft?.id}
      />
    </div>
  );
}
