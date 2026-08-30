import { useState } from 'react';
import type { OpportunityVersion, OpportunityRequirement, EligibilityRule } from '../../../domain/opportunity';
import type { ActorId, OpportunityVersionId } from '../../../domain';
import OpportunityBasicsSection, { type OpportunityBasicsDraft } from './OpportunityBasicsSection';
import OpportunityRequirementsSection, { type CanonicalSkillOption } from './OpportunityRequirementsSection';
import OpportunityEligibilitySection from './OpportunityEligibilitySection';
import OpportunityReviewPanel from './OpportunityReviewPanel';

export interface OpportunityAuthoringDraftState {
  readonly basics: OpportunityBasicsDraft;
  readonly requirements: readonly OpportunityRequirement[];
  readonly eligibilityRules: readonly EligibilityRule[];
}

interface Props {
  readonly initialDraft?: Partial<OpportunityVersion>;
  readonly persistedOpportunityVersionId?: OpportunityVersionId;
  readonly onSaveDraft?: (draft: OpportunityAuthoringDraftState) => Promise<void>;
  readonly onPublishPersistedVersion?: (opportunityVersionId: OpportunityVersionId) => Promise<void>;
  readonly currentActorId: ActorId;
  readonly canonicalSkillOptions?: readonly CanonicalSkillOption[];
  readonly modeLabel?: string;
}

export default function OpportunityAuthoringShell({
  initialDraft,
  persistedOpportunityVersionId,
  onSaveDraft,
  onPublishPersistedVersion,
  currentActorId,
  canonicalSkillOptions,
  modeLabel = 'Human-authored production draft',
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

  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [publishStatus, setPublishStatus] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const handleBasicsChange = (newBasics: OpportunityBasicsDraft) => {
    setBasics(newBasics);
    setIsDirty(true);
    setSaveStatus(null);
  };

  const handleRequirementsChange = (newReqs: OpportunityRequirement[]) => {
    setRequirements(newReqs);
    setIsDirty(true);
    setSaveStatus(null);
  };

  const handleRulesChange = (newRules: EligibilityRule[]) => {
    setRules(newRules);
    setIsDirty(true);
    setSaveStatus(null);
  };

  const handleSave = async () => {
    if (!onSaveDraft) {
      setSaveStatus({ type: 'error', message: 'Production draft persistence is not configured for this workspace.' });
      return;
    }
    try {
      setIsSaving(true);
      setSaveStatus(null);
      setPublishStatus(null);
      await onSaveDraft({ basics, requirements, eligibilityRules: rules });
      setIsDirty(false);
      setSaveStatus({ type: 'success', message: 'Draft saved through the authenticated atomic opportunity-authoring boundary.' });
    } catch (err) {
      setSaveStatus({ type: 'error', message: err instanceof Error ? err.message : 'Unknown draft-save error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (isDirty) {
      setPublishStatus({ type: 'error', message: 'Save the current human-authored changes before publishing.' });
      return;
    }
    if (!persistedOpportunityVersionId || !onPublishPersistedVersion) {
      setPublishStatus({ type: 'error', message: 'Publishing requires an authoritative persisted draft version.' });
      return;
    }

    try {
      setIsPublishing(true);
      setPublishStatus(null);
      await onPublishPersistedVersion(persistedOpportunityVersionId);
      setPublishStatus({ type: 'success', message: 'The exact persisted opportunity version was published through the audited human publication boundary.' });
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
        <p className="mt-2 font-mono-ui text-sm text-black/70">{modeLabel}</p>
        {persistedOpportunityVersionId && (
          <p className="mt-2 break-all font-mono-ui text-[10px] uppercase text-black/50">
            Persisted version: {persistedOpportunityVersionId}
          </p>
        )}
      </div>

      <OpportunityBasicsSection draft={basics} onChange={handleBasicsChange} />
      <OpportunityRequirementsSection
        requirements={requirements}
        onChange={handleRequirementsChange}
        currentActorId={currentActorId}
        canonicalSkillOptions={canonicalSkillOptions}
      />
      <OpportunityEligibilitySection rules={rules} onChange={handleRulesChange} currentActorId={currentActorId} />

      <section className="border-2 border-black bg-[#fff4c7] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-mono-ui text-sm font-black uppercase">Draft persistence</h2>
            <p className="mt-1 text-sm text-black/70">
              Saving persists the complete draft atomically. It does not publish or infer human confirmation.
            </p>
          </div>
          <button
            type="button"
            disabled={!onSaveDraft || isSaving || (!isDirty && Boolean(persistedOpportunityVersionId))}
            onClick={() => void handleSave()}
            className="min-h-11 border-2 border-black bg-black px-5 py-3 font-mono-ui text-xs font-black uppercase text-white disabled:opacity-40"
          >
            {isSaving ? 'Saving…' : persistedOpportunityVersionId ? 'Save draft' : 'Create draft'}
          </button>
        </div>
      </section>

      {isDirty && (
        <div className="border-l-4 border-amber-500 bg-amber-50 p-4 text-amber-900">
          <p className="font-mono-ui text-sm font-bold">Unsaved Changes</p>
          <p className="text-sm">Publishing remains blocked until these changes are saved to the authoritative draft.</p>
        </div>
      )}

      {saveStatus && (
        <div className={`border-l-4 p-4 ${saveStatus.type === 'error' ? 'border-[#d63c1d] bg-[#f7f4ed] text-[#d63c1d]' : 'border-green-600 bg-green-50 text-green-900'}`}>
          <p className="font-mono-ui text-sm font-bold">{saveStatus.type === 'error' ? 'Draft Save Failed' : 'Draft Saved'}</p>
          <p className="text-sm">{saveStatus.message}</p>
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
        onPublish={() => void handlePublish()}
        isPublishing={isPublishing}
        opportunityVersionId={persistedOpportunityVersionId}
        publishDisabled={isDirty || isSaving || !persistedOpportunityVersionId || !onPublishPersistedVersion}
      />
    </div>
  );
}
