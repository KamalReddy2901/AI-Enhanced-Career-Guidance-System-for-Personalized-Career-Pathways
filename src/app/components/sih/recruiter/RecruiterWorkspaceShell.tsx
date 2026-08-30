import type { ApplicationReadModel, ApplicationEventReadModel } from '../../../services/sih/types';
import type { ProductionRecruiterProjection } from '../../../services/sih/productionRecruiterProjection';
import type { OrganizationId } from '../../../domain';
import type { TransitionApplicationStageInput } from '../../../services/sih/browserDal';
import type { ApplicationStage } from '../../../domain/application';

import ApplicationListTable from './ApplicationListTable';
import ApplicationDetailView from './ApplicationDetailView';
import RecruiterAccessState, { type AccessState } from './RecruiterAccessState';
import HumanStageActionPanel from './HumanStageActionPanel';
import ApplicationEventTimeline from './ApplicationEventTimeline';

interface Props {
  readonly applications: readonly ApplicationReadModel[];
  readonly selectedApplication?: ApplicationReadModel;
  readonly projection?: ProductionRecruiterProjection;
  readonly projectionAccessState: AccessState;
  readonly events: readonly ApplicationEventReadModel[];
  
  readonly recruiterOrganizationId: OrganizationId;
  
  readonly onSelectApplication: (applicationId: string) => void;
  readonly onTransitionApplicationStage: (input: Omit<TransitionApplicationStageInput, 'applicationId'>) => Promise<void>;
  readonly isProcessingTransition: boolean;
  readonly allowedNextStages: readonly ApplicationStage[];
}

export default function RecruiterWorkspaceShell({
  applications,
  selectedApplication,
  projection,
  projectionAccessState,
  events,
  recruiterOrganizationId,
  onSelectApplication,
  onTransitionApplicationStage,
  isProcessingTransition,
  allowedNextStages
}: Props) {
  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase tracking-tighter sm:text-4xl">
          Applicant Workspace
        </h1>
        <p className="mt-2 font-mono-ui text-sm text-black/70">
          Organization ID: {recruiterOrganizationId}
        </p>
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
                  <ApplicationDetailView projection={projection} />

                  <HumanStageActionPanel
                    currentStage={selectedApplication.currentStage}
                    allowedNextStages={allowedNextStages}
                    onTransition={onTransitionApplicationStage}
                    isProcessing={isProcessingTransition}
                  />

                  <ApplicationEventTimeline events={events} />
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