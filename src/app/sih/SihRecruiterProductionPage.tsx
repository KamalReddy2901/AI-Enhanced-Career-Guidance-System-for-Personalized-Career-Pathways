import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import type { ApplicationStage, OrganizationId } from '../domain';
import RecruiterWorkspaceShell from '../components/sih/recruiter/RecruiterWorkspaceShell';
import type { AccessState } from '../components/sih/recruiter/RecruiterAccessState';
import type {
  ApplicationEventReadModel,
  ApplicationReadModel,
} from '../services/sih/types';
import type { ProductionRecruiterProjection } from '../services/sih/productionRecruiterProjection';
import { ProductionRecruiterReads } from '../services/sih/productionRecruiterReads';
import { supabase } from '../services/supabase';
import { useSihProduction } from './SihProductionContext';

const RECRUITER_TRANSITIONS: Partial<Record<ApplicationStage, readonly ApplicationStage[]>> = {
  applied: ['screening', 'evidence_requested', 'under_review', 'cancelled'],
  screening: ['evidence_requested', 'under_review', 'interview', 'shortlisted', 'rejected_by_human'],
  evidence_requested: ['under_review', 'cancelled', 'rejected_by_human'],
  under_review: ['evidence_requested', 'interview', 'shortlisted', 'offered', 'rejected_by_human'],
  interview: ['shortlisted', 'offered', 'rejected_by_human'],
  shortlisted: ['interview', 'offered', 'rejected_by_human'],
  offered: ['cancelled'],
  accepted: ['active', 'cancelled'],
  active: ['completed', 'cancelled'],
};

export function ApplicantsPage() {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const { actorId, memberships, dal, loading: authorityLoading, error: authorityError } = useSihProduction();
  const recruiterReads = useMemo(() => (supabase ? new ProductionRecruiterReads(supabase) : null), []);
  const recruiterMemberships = useMemo(
    () => memberships.filter((membership) => membership.roles.some((role) => role === 'recruiter' || role === 'industry_partner')),
    [memberships],
  );
  const [organizationId, setOrganizationId] = useState<OrganizationId>();
  const [applications, setApplications] = useState<readonly ApplicationReadModel[]>([]);
  const [events, setEvents] = useState<readonly ApplicationEventReadModel[]>([]);
  const [projection, setProjection] = useState<ProductionRecruiterProjection>();
  const [accessState, setAccessState] = useState<AccessState>('unavailable');
  const [loadError, setLoadError] = useState<string>();
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    if (!organizationId && recruiterMemberships[0]) {
      setOrganizationId(recruiterMemberships[0].organizationId);
    } else if (organizationId && !recruiterMemberships.some((membership) => membership.organizationId === organizationId)) {
      setOrganizationId(recruiterMemberships[0]?.organizationId);
    }
  }, [organizationId, recruiterMemberships]);

  const refreshApplications = useCallback(async () => {
    if (!dal || !organizationId) {
      setApplications([]);
      return;
    }
    const next = await dal.listApplicationsForRecruiterOrganization(organizationId);
    setApplications(next);
  }, [dal, organizationId]);

  useEffect(() => {
    if (!dal || !organizationId) return;
    let active = true;
    setLoadError(undefined);
    void dal.listApplicationsForRecruiterOrganization(organizationId)
      .then((next) => {
        if (active) setApplications(next);
      })
      .catch((reason) => {
        if (active) setLoadError(reason instanceof Error ? reason.message : 'Unable to load consented applications.');
      });
    return () => {
      active = false;
    };
  }, [dal, organizationId]);

  const selectedApplication = applications.find((application) => application.id === applicationId);

  const refreshSelected = useCallback(async () => {
    if (!dal || !recruiterReads || !selectedApplication) {
      setEvents([]);
      setProjection(undefined);
      setAccessState(applicationId ? 'unavailable' : 'unavailable');
      return;
    }
    setAccessState('loading');
    setLoadError(undefined);
    try {
      const [nextEvents, exact] = await Promise.all([
        dal.listApplicationEvents(selectedApplication.id),
        recruiterReads.getExactSubmittedProjection(selectedApplication.id),
      ]);
      setEvents(nextEvents);
      if (!exact) {
        setProjection(undefined);
        setAccessState('unavailable');
        return;
      }
      setProjection(exact.projection);
      setAccessState('available');
    } catch (reason) {
      setProjection(undefined);
      setAccessState('error');
      setLoadError(reason instanceof Error ? reason.message : 'Unable to load the exact consented recruiter projection.');
    }
  }, [applicationId, dal, recruiterReads, selectedApplication]);

  useEffect(() => {
    void refreshSelected();
  }, [refreshSelected]);

  async function transition(input: {
    readonly fromStage: ApplicationStage;
    readonly toStage: ApplicationStage;
    readonly reason?: string;
    readonly note?: string;
    readonly applicationSnapshotId?: string;
  }) {
    if (!actorId || !dal || !selectedApplication) return;
    setTransitioning(true);
    setLoadError(undefined);
    try {
      await dal.transitionApplicationStage(actorId, {
        applicationId: selectedApplication.id,
        fromStage: input.fromStage,
        toStage: input.toStage,
        reason: input.reason,
        note: input.note,
      });
      await refreshApplications();
      await refreshSelected();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Human stage transition failed.';
      setLoadError(message);
      throw new Error(message);
    } finally {
      setTransitioning(false);
    }
  }

  if (authorityLoading) {
    return <div className="mx-auto max-w-6xl px-4 py-10"><p className="font-mono-ui text-sm font-black uppercase">Loading recruiter authority…</p></div>;
  }
  if (authorityError) {
    return <div className="mx-auto max-w-6xl px-4 py-10"><p className="border-2 border-black bg-white p-5">{authorityError}</p></div>;
  }
  if (!actorId || recruiterMemberships.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-black">Applicant Workspace</h1>
        <p className="mt-4 border-2 border-black bg-white p-5">An active recruiter or industry-partner organization role is required. Organization authority is never inferred from an email domain.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mx-auto max-w-6xl px-4 pt-8">
        <div className="border-2 border-black bg-[#fff4c7] p-4">
          <label className="grid gap-2 font-mono-ui text-[10px] font-black uppercase tracking-wide">
            Acting organization
            <select
              value={organizationId ?? ''}
              onChange={(event) => {
                setOrganizationId(event.target.value as OrganizationId);
                navigate('/industry/applicants');
              }}
              className="min-h-11 border-2 border-black bg-white px-3 text-sm normal-case"
            >
              {recruiterMemberships.map((membership) => (
                <option key={membership.organizationId} value={membership.organizationId}>{membership.organizationName}</option>
              ))}
            </select>
          </label>
          <p className="mt-3 text-xs text-black/65">Only submitted applications with an active purpose-specific application-review consent are visible through the recruiter RLS boundary.</p>
        </div>
        {loadError && <p className="mt-4 border-l-4 border-[#d63c1d] bg-[#fff1ec] p-3 text-sm" role="alert">{loadError}</p>}
      </div>
      {organizationId && (
        <RecruiterWorkspaceShell
          applications={applications}
          selectedApplication={selectedApplication}
          projection={projection}
          projectionAccessState={selectedApplication ? accessState : 'unavailable'}
          events={events}
          recruiterOrganizationId={organizationId}
          onSelectApplication={(id) => navigate(`/industry/applicants/${id}`)}
          onTransitionApplicationStage={transition}
          isProcessingTransition={transitioning}
          allowedNextStages={selectedApplication ? (RECRUITER_TRANSITIONS[selectedApplication.currentStage] ?? []) : []}
        />
      )}
    </div>
  );
}

export default ApplicantsPage;
