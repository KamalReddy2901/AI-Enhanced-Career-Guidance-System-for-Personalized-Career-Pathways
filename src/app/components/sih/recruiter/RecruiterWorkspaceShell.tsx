import { useState, useEffect } from 'react';
import type { SihBrowserDal, TransitionApplicationStageInput } from '../../../services/sih/browserDal';
import type { ApplicationReadModel, ApplicationEventReadModel } from '../../../services/sih/types';
import type { ProductionRecruiterProjection } from '../../../services/sih/productionRecruiterProjection';
import type { OrganizationId } from '../../../domain';

import ApplicationListTable from './ApplicationListTable';
import ApplicationDetailView from './ApplicationDetailView';
import RecruiterAccessState, { type AccessState } from './RecruiterAccessState';
import HumanStageActionPanel from './HumanStageActionPanel';
import ApplicationEventTimeline from './ApplicationEventTimeline';

interface Props {
  readonly dal: SihBrowserDal;
  readonly recruiterOrganizationId: OrganizationId;
  readonly recruiterActorId: string;
}

export default function RecruiterWorkspaceShell({ dal, recruiterOrganizationId, recruiterActorId }: Props) {
  const [applications, setApplications] = useState<ApplicationReadModel[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<ApplicationReadModel | null>(null);
  
  // Note: Since authoritative projection retrieval is blocked as per PR1 constraints, 
  // we simulate the availability/unavailability state here.
  // In reality, this would be fetched from dal.getProductionRecruiterProjection(snapshotId).
  const [projectionState, setProjectionState] = useState<AccessState>('loading');
  const [projection, setProjection] = useState<ProductionRecruiterProjection | 'unavailable'>('unavailable');
  
  const [events, setEvents] = useState<ApplicationEventReadModel[]>([]);
  const [isProcessingTransition, setIsProcessingTransition] = useState(false);

  // Load applications on mount
  useEffect(() => {
    dal.listApplicationsForRecruiterOrganization(recruiterOrganizationId)
      .then((apps: ApplicationReadModel[]) => setApplications(apps))
      .catch(console.error);
  }, [dal, recruiterOrganizationId]);

  // Load selected application details
  useEffect(() => {
    if (!selectedAppId) {
      setSelectedApp(null);
      setProjection('unavailable');
      setProjectionState('available');
      setEvents([]);
      return;
    }

    setProjectionState('loading');
    
    // Simulate fetching projection & events
    Promise.all([
      dal.getApplication(selectedAppId as any),
      dal.listApplicationEvents(selectedAppId as any)
    ])
    .then(([app, appEvents]) => {
      setSelectedApp(app);
      setEvents(appEvents);
      // Simulate missing projection due to blocked shared contract
      setProjection('unavailable'); 
      setProjectionState('available');
    })
    .catch(err => {
      console.error(err);
      setProjectionState('error');
    });
  }, [selectedAppId, dal]);

  const handleTransition = async (input: Omit<TransitionApplicationStageInput, 'applicationId'>) => {
    if (!selectedAppId) return;
    
    setIsProcessingTransition(true);
    try {
      await dal.transitionApplicationStage(recruiterActorId, {
        applicationId: selectedAppId as any,
        ...input
      });
      
      // Refresh events and app list
      const [updatedApps, updatedEvents] = await Promise.all([
        dal.listApplicationsForRecruiterOrganization(recruiterOrganizationId),
        dal.listApplicationEvents(selectedAppId as any)
      ]);
      setApplications(updatedApps);
      setEvents(updatedEvents);
      
      const app = updatedApps.find((a: ApplicationReadModel) => a.id === selectedAppId);
      if (app) setSelectedApp(app);
    } finally {
      setIsProcessingTransition(false);
    }
  };

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
            selectedApplicationId={selectedAppId || undefined}
            onSelect={setSelectedAppId}
          />
        </div>

        {/* Right Column: Detail View */}
        <div className="space-y-8 lg:col-span-2">
          {selectedApp ? (
            <RecruiterAccessState state={projectionState}>
              <ApplicationDetailView projection={projection} />
              
              <HumanStageActionPanel 
                currentStage={selectedApp.currentStage}
                onTransition={handleTransition}
                isProcessing={isProcessingTransition}
              />

              <ApplicationEventTimeline events={events} />
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
