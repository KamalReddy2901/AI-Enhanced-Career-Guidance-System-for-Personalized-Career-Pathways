import type { ApplicationReadModel, ApplicationEventReadModel, ApplicationRecruitmentRecordReadModel } from '../../../services/sih/types';
import type { ProductionRecruiterProjection } from '../../../services/sih/productionRecruiterProjection';
import type { OrganizationId } from '../../../domain';
import type { RecordApplicationRecruitmentActionInput, TransitionApplicationStageInput } from '../../../services/sih/browserDal';
import type { ApplicationStage } from '../../../domain/application';

import ApplicationListTable from './ApplicationListTable';
import ApplicationDetailView from './ApplicationDetailView';
import RecruiterAccessState, { type AccessState } from './RecruiterAccessState';
import HumanStageActionPanel from './HumanStageActionPanel';
import ApplicationEventTimeline from './ApplicationEventTimeline';
import { ApplicationRecruitmentTimeline } from '../application/ApplicationRecruitmentTimeline';

interface Props {
  readonly applications: readonly ApplicationReadModel[];
  readonly selectedApplication?: ApplicationReadModel;
  readonly projection?: ProductionRecruiterProjection;
  readonly projectionAccessState: AccessState;
  readonly events: readonly ApplicationEventReadModel[];
  readonly recruitmentRecords: readonly ApplicationRecruitmentRecordReadModel[];
  readonly opportunityTitle?: string;
  
  readonly recruiterOrganizationId: OrganizationId;
  
  readonly onSelectApplication: (applicationId: string) => void;
  readonly onTransitionApplicationStage: (input: Omit<TransitionApplicationStageInput, 'applicationId'>) => Promise<void>;
  readonly isProcessingTransition: boolean;
  readonly allowedNextStages: readonly ApplicationStage[];
  readonly onRecordApplicationAction: (input: Omit<RecordApplicationRecruitmentActionInput, 'applicationId' | 'currentStage'>) => Promise<void>;
}

export default function RecruiterWorkspaceShell({
  applications,
  selectedApplication,
  projection,
  projectionAccessState,
  events,
  recruitmentRecords,
  opportunityTitle,
  recruiterOrganizationId,
  onSelectApplication,
  onTransitionApplicationStage,
  isProcessingTransition,
  allowedNextStages,
  onRecordApplicationAction,
}: Props) {
  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase tracking-tighter sm:text-4xl">
          Applications to Review
        </h1>
        <p className="mt-2 text-sm text-black/70">Review only consented application snapshots for the active organization. Technical records remain available inside application detail where needed.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column: Application List */}
        <div className="lg:col-span-1">
          <ApplicationListTable 
            applications={applications} 
            selectedApplicationId={selectedApplication?.id}
            onSelect={onSelectApplication}
          />
        </div>

        {/* Right Column: Detail View */}
        <div className="space-y-8 lg:col-span-2">
          {selectedApplication ? (
            <RecruiterAccessState state={projectionAccessState}>
              {projectionAccessState === 'available' && projection && (
                <>
                  <aside className="border-l-4 border-black bg-[#fff4c7] p-4" aria-label="Recruiter privacy boundary"><p className="font-mono-ui text-[10px] font-black uppercase tracking-wide">Private career guidance is not shared with recruiters</p><p className="mt-1 text-sm text-black/70">Recruiters see the application snapshot, opportunity-specific readiness, consented evidence, relevant artifacts and application history — never career interests, RIASEC, aptitude internals, values, aspirations, private constraints or counselor history.</p></aside>
                  <ApplicationDetailView projection={projection} opportunityTitle={opportunityTitle} presentationApplicantName={selectedApplication.id === 'a080bafe-ec71-4fd5-99b2-19ed8ac8cb87' ? 'Ananya Rao' : undefined} />

                  <HumanStageActionPanel
                    currentStage={selectedApplication.currentStage}
                    allowedNextStages={allowedNextStages}
                    onTransition={onTransitionApplicationStage}
                    isProcessing={isProcessingTransition}
                    onRecordAction={onRecordApplicationAction}
                  />

                  <ApplicationEventTimeline events={events} />
                  <ApplicationRecruitmentTimeline records={recruitmentRecords} />
                </>
              )}
            </RecruiterAccessState>
          ) : (
            <div className="flex h-64 items-center justify-center border-2 border-black bg-[#f7f4ed] shadow-[4px_4px_0_#111]">
              <p className="font-mono-ui text-sm font-black uppercase tracking-wide text-black/50">
                Select an application to view details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
