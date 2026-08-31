import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useParams } from 'react-router';
import type { EvidenceArtifactId, EvidenceRecordId } from '../domain';
import type { OpportunityReadinessResult } from '../domain/readiness';
import ApplicationPreparationWorkspace from '../components/sih/student/application/ApplicationPreparationWorkspace';
import ApplicationFinalizationPanel from '../components/sih/student/application/ApplicationFinalizationPanel';
import AggregateAnalyticsConsentPanel from '../components/sih/student/application/AggregateAnalyticsConsentPanel';
import type { ProspectiveRecruiterDisclosure } from '../components/sih/student/application/RecruiterDisclosurePreview';
import { ProductionAnalyticsConsent } from '../services/sih/productionAnalyticsConsent';
import {
  ProductionOpportunityReads,
  type ProductionOpportunityBundle,
} from '../services/sih/productionOpportunityReads';
import type { EvidenceArtifactReadModel, EvidenceRecordReadModel } from '../services/sih/types';
import { supabase } from '../services/supabase';
import { useSihProduction } from './SihProductionContext';

function Notice({ children }: { readonly children: ReactNode }) {
  return <div className="mt-6 border-2 border-black bg-white p-5 text-sm shadow-[4px_4px_0_#111]">{children}</div>;
}

function usePublishedBundle(opportunityVersionId?: string) {
  const reads = useMemo(() => (supabase ? new ProductionOpportunityReads(supabase) : null), []);
  const [bundle, setBundle] = useState<ProductionOpportunityBundle>();
  const [loading, setLoading] = useState(Boolean(opportunityVersionId));
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!opportunityVersionId || !reads) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(undefined);
    void reads.getPublishedVersion(opportunityVersionId)
      .then((next) => {
        if (!active) return;
        if (!next) setError('Published opportunity version was not found or is not visible to this account.');
        else setBundle(next);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load the opportunity.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [opportunityVersionId, reads]);

  return { reads, bundle, loading, error };
}

export function ApplicationPreparationPage() {
  const { opportunityVersionId } = useParams();
  const { actorId, dal, trustedApi, loading: authorityLoading, error: authorityError } = useSihProduction();
  const { reads, bundle, loading, error: bundleError } = usePublishedBundle(opportunityVersionId);
  const analyticsConsentService = useMemo(() => (supabase ? new ProductionAnalyticsConsent(supabase) : null), []);
  const [evidence, setEvidence] = useState<readonly EvidenceRecordReadModel[]>([]);
  const [selectedEvidenceRecordIds, setSelectedEvidenceRecordIds] = useState<readonly EvidenceRecordId[]>([]);
  const [error, setError] = useState<string>();
  const [disclosureProfile, setDisclosureProfile] = useState<{
    readonly displayName: string;
    readonly educationSummary: string;
  }>();
  const [readinessResult, setReadinessResult] = useState<OpportunityReadinessResult>();
  const [artifactsByEvidence, setArtifactsByEvidence] = useState<ReadonlyMap<string, readonly EvidenceArtifactReadModel[]>>(new Map());
  const [disclosureLoading, setDisclosureLoading] = useState(false);
  const [disclosureError, setDisclosureError] = useState<string>();

  useEffect(() => {
    if (!actorId || !dal) return;
    let active = true;
    void dal.listEvidenceForSubject(actorId)
      .then((next) => {
        if (active) setEvidence(next);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load applicant evidence.');
      });
    return () => { active = false; };
  }, [actorId, dal]);

  useEffect(() => {
    if (!actorId || !dal || !reads || !bundle) {
      setDisclosureProfile(undefined);
      setReadinessResult(undefined);
      setDisclosureLoading(false);
      return;
    }
    let active = true;
    setDisclosureLoading(true);
    setDisclosureError(undefined);
    void Promise.all([
      dal.getSubjectDisclosureProfile(actorId),
      reads.getLatestReadinessResult(actorId, bundle.version.id),
    ])
      .then(([profile, result]) => {
        if (!active) return;
        setDisclosureProfile(profile);
        setReadinessResult(result ?? undefined);
        if (!result) setDisclosureError('Compute canonical readiness before reviewing the recruiter disclosure preview.');
      })
      .catch((reason) => {
        if (active) setDisclosureError(reason instanceof Error ? reason.message : 'Unable to prepare the recruiter disclosure preview.');
      })
      .finally(() => {
        if (active) setDisclosureLoading(false);
      });
    return () => {
      active = false;
    };
  }, [actorId, dal, reads, bundle?.version.id]);

  useEffect(() => {
    if (!dal || selectedEvidenceRecordIds.length === 0) {
      setArtifactsByEvidence(new Map());
      return;
    }
    let active = true;
    void Promise.all(selectedEvidenceRecordIds.map(async (evidenceRecordId) => [
      evidenceRecordId,
      await dal.listArtifactsForEvidence(evidenceRecordId),
    ] as const))
      .then((entries) => {
        if (active) setArtifactsByEvidence(new Map(entries));
      })
      .catch((reason) => {
        if (active) setDisclosureError(reason instanceof Error ? reason.message : 'Unable to load artifact disclosure details.');
      });
    return () => {
      active = false;
    };
  }, [dal, selectedEvidenceRecordIds]);

  const disclosure = useMemo<ProspectiveRecruiterDisclosure | undefined>(() => {
    if (!bundle || !disclosureProfile || !readinessResult) return undefined;
    const selected = new Set(selectedEvidenceRecordIds);
    const selectedEvidence = evidence
      .filter((record) => selected.has(record.id))
      .map((record) => {
        const cleanArtifacts = (artifactsByEvidence.get(record.id) ?? [])
          .filter((artifact) => artifact.scanStatus === 'clean');
        return {
          evidenceRecordId: record.id,
          literalClaim: record.literalClaim,
          provenance: record.provenance,
          verificationState: record.initialVerificationState,
          verificationAssertions: [],
          artifactIds: cleanArtifacts.map((artifact) => artifact.id as EvidenceArtifactId),
          artifactDisplayNames: cleanArtifacts.map((artifact) => artifact.displayName),
        };
      });
    const requirements = [
      ...readinessResult.requiredRequirementResults,
      ...readinessResult.preferredRequirementResults,
    ].map((requirement) => ({
      requirementId: requirement.requirementId,
      literalSourceWording: requirement.literalSourceWording,
      priority: requirement.priority,
      state: requirement.state,
      supportingEvidenceIds: requirement.supportingEvidenceIds.filter((id) => selected.has(id)),
    }));
    return {
      applicant: { displayName: disclosureProfile.displayName },
      educationSummary: disclosureProfile.educationSummary,
      evidence: selectedEvidence,
      opportunityId: bundle.opportunity.id,
      opportunityVersionId: bundle.version.id,
      readinessBand: readinessResult.readinessBand,
      readinessResultId: readinessResult.resultId,
      requirements,
      sharedWorkSamples: selectedEvidence.flatMap((item) => item.artifactIds.map((artifactId, index) => ({
        artifactId,
        displayName: item.artifactDisplayNames[index] ?? 'Clean work sample',
      }))),
    };
  }, [artifactsByEvidence, bundle, disclosureProfile, evidence, readinessResult, selectedEvidenceRecordIds]);

  const questionnaireReference = bundle?.version.requirements.find(
    (requirement) => requirement.category === 'questionnaire' && requirement.questionnaireReference,
  );
  const isCurrent = Boolean(bundle && bundle.opportunity.currentVersionId === bundle.version.id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="font-mono-ui text-[10px] font-black uppercase tracking-[.2em] text-[var(--accent-news)]">Purpose-specific consent · immutable submission</p>
      <h1 className="mt-2 text-4xl font-black tracking-tight">Prepare application</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-black/65">
        Choose the evidence to disclose, grant application-review consent to the opportunity owner, then finalize and submit the exact immutable snapshot through trusted authority. Optional aggregate analytics consent is a separate purpose and is never required to apply.
      </p>

      <div className="mt-8">
        {authorityLoading ? <Notice>Loading authenticated applicant authority…</Notice> : null}
        {authorityError ? <Notice>{authorityError}</Notice> : null}
        {!authorityLoading && !actorId ? <Notice>Sign in with a provisioned learner account to prepare an application.</Notice> : null}
        {loading ? <Notice>Loading application context…</Notice> : null}
        {bundleError || error ? <Notice>{bundleError ?? error}</Notice> : null}

        {!loading && !bundleError && !error && actorId && dal && bundle ? (
          !isCurrent ? (
            <Notice>This opportunity version is no longer current. New application preparation is blocked for historical versions.</Notice>
          ) : (
            <div className="grid gap-6">
              {disclosureLoading && <Notice>Loading disclosure preview context…</Notice>}
              {disclosureError && <Notice>{disclosureError}</Notice>}
              <ApplicationPreparationWorkspace
                evidence={evidence}
                selectedEvidenceRecordIds={selectedEvidenceRecordIds}
                onSelectedEvidenceRecordIdsChange={setSelectedEvidenceRecordIds}
                disclosure={disclosure}
                questionnaireReference={questionnaireReference?.category === 'questionnaire' ? questionnaireReference.questionnaireReference : undefined}
              />

              {analyticsConsentService ? (
                <AggregateAnalyticsConsentPanel
                  service={analyticsConsentService}
                  subjectActorId={actorId}
                  organizationId={bundle.opportunity.ownerOrganizationId}
                />
              ) : (
                <Notice>Optional aggregate analytics consent controls are unavailable because Supabase is not configured.</Notice>
              )}

              {trustedApi ? (
                <ApplicationFinalizationPanel
                  browserDal={dal}
                  trustedApi={trustedApi}
                  applicantActorId={actorId}
                  opportunityVersion={bundle.version}
                  ownerOrganizationId={bundle.opportunity.ownerOrganizationId}
                  selectedEvidenceRecordIds={selectedEvidenceRecordIds}
                />
              ) : (
                <Notice>Trusted application finalization is not configured. Set the production Worker origin before submission.</Notice>
              )}
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}

export default ApplicationPreparationPage;
