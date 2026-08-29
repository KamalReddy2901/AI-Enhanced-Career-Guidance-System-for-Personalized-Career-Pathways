import { useState } from 'react';
import type { OpportunityVersion, OpportunityRequirement, EligibilityRule } from '../../../domain/opportunity';
import type { ActorId, OpportunityVersionId } from '../../../domain';
import OpportunityBasicsSection, { type OpportunityBasicsDraft } from './OpportunityBasicsSection';
import OpportunityRequirementsSection from './OpportunityRequirementsSection';
import OpportunityEligibilitySection from './OpportunityEligibilitySection';
import OpportunityReviewPanel from './OpportunityReviewPanel';

interface Props {
  readonly initialDraft?: Partial<OpportunityVersion>;
  readonly persistedOpportunityVersionId?: OpportunityVersionId;
  readonly onPublishPersistedVersion?: (opportunityVersionId: OpportunityVersionId) => Promise<void>;
  readonly currentActorId: ActorId;
}

export default function OpportunityAuthoringShell({
  initialDraft,
  persistedOpportunityVersionId,
  onPublishPersistedVersion,
  currentActorId
}: Props) {
  const [isDirty, setIsDirty] = useState(false);
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
  const [publishStatus, setPublishStatus] = useState<{ type: 'error' | 'success', message: string } | null>(null);

  const handleBasicsChange = (newBasics: OpportunityBasicsDraft) => {
    setBasics(newBasics);
    setIsDirty(true);
  };

  const handleRequirementsChange = (newReqs: OpportunityRequirement[]) => {
    setRequirements(newReqs);
    setIsDirty(true);
  };

  const handleRulesChange = (newRules: EligibilityRule[]) => {
    setRules(newRules);
    setIsDirty(true);
  };

  const handlePublish = async () => {
    if (isDirty) {
      setPublishStatus({ type: 'error', message: 'Local authoring changes are not yet persisted. Production draft-save integration is pending.' });
      return;
    }
    if (!persistedOpportunityVersionId || !onPublishPersistedVersion) {
      setPublishStatus({ type: 'error', message: 'Publishing requires a persisted draft and integration callback.' });
      return;
    }

    try {
      setIsPublishing(true);
      setPublishStatus(null);
      await onPublishPersistedVersion(persistedOpportunityVersionId);
      setPublishStatus({ type: 'success', message: 'Opportunity published successfully!' });
    } catch (err) {
      setPublishStatus({ type: 'error', message: err instanceof Error ? err.message : 'Unknown publish error' });
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

      <OpportunityBasicsSection draft={basics} onChange={handleBasicsChange} />
      
      <OpportunityRequirementsSection requirements={requirements} onChange={handleRequirementsChange} currentActorId={currentActorId} />
      
      <OpportunityEligibilitySection rules={rules} onChange={handleRulesChange} currentActorId={currentActorId} />

      {isDirty && (
        <div className="border-l-4 border-amber-500 bg-amber-50 p-4 text-amber-900">
          <p className="font-mono-ui text-sm font-bold">Unsaved Changes</p>
          <p className="text-sm">Local authoring changes are not yet persisted. Production draft-save integration is pending.</p>
        </div>
      )}

      {publishStatus && (
        <div className={`border-l-4 p-4 ${publishStatus.type === 'error' ? 'border-[#d63c1d] bg-[#f7f4ed] text-[#d63c1d]' : 'border-green-600 bg-green-50 text-green-900'}`}>
          <p className="font-mono-ui text-sm font-bold">{publishStatus.type === 'error' ? 'Publishing Failed' : 'Success'}</p>
          <p className="text-sm">{publishStatus.message}</p>
        </div>
      )}

      <OpportunityReviewPanel
        requirements={requirements}
        eligibilityRules={rules}
        onPublish={handlePublish}
        isPublishing={isPublishing}
        opportunityVersionId={persistedOpportunityVersionId}
        publishDisabled={isDirty || !persistedOpportunityVersionId || !onPublishPersistedVersion}
      />
    </div>
  );
}
