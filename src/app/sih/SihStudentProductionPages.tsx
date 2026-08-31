import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import type {
  EvidenceRecordId,
  OpportunityReadinessResult,
} from '../domain';
import OpportunityExplorer from '../components/sih/student/explorer/OpportunityExplorer';
import OpportunityDetail from '../components/sih/student/explorer/OpportunityDetail';
import ReadinessCasefile from '../components/sih/student/readiness/ReadinessCasefile';
import GapClosurePlan from '../components/sih/student/gap-closure/GapClosurePlan';
import ApplicationPreparationWorkspace from '../components/sih/student/application/ApplicationPreparationWorkspace';
import ApplicationFinalizationPanel from '../components/sih/student/application/ApplicationFinalizationPanel';
import { EvidenceUploadModal } from '../components/sih/student/evidence/EvidenceUploadModal';
import type { ApplicationReadModel, EvidenceRecordReadModel } from '../services/sih/types';
import {
  ProductionOpportunityReads,
  type ProductionOpportunityBundle,
} from '../services/sih/productionOpportunityReads';
import { supabase } from '../services/supabase';
import { getOpportunityQuestionnaireAssignment } from '../services/questionnaireDb';
import type { OpportunityQuestionnaireAssignment, QuestionnaireVersion } from '../types/questionnaire';
import { useSihProduction } from './SihProductionContext';

function ProductionFrame({
  eyebrow,
  title,
  description,
  children,
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly children: ReactNode;
}) {
  const { loading, error, actorId } = useSihProduction();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="font-mono-ui text-[10px] font-black uppercase tracking-[.2em] text-[#d63c1d]">{eyebrow}</p>
      <h1 className="mt-2 text-4xl font-black tracking-tight">{title}</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-black/65">{description}</p>
      {loading ? (
        <Notice>Loading authenticated authority…</Notice>
      ) : error ? (
        <Notice>{error}</Notice>
      ) : !actorId ? (
        <Notice>Sign in with a provisioned CareerCase role to use this production workspace.</Notice>
      ) : (
        <div className="mt-8">{children}</div>
      )}
    </div>
  );
}

function Notice({ children }: { readonly children: ReactNode }) {
  return <div className="mt-6 border-2 border-black bg-white p-5 text-sm shadow-[4px_4px_0_#111]">{children}</div>;
}

function useProductionReads() {
  return useMemo(() => (supabase ? new ProductionOpportunityReads(supabase) : null), []);
}

function usePublishedBundle(opportunityVersionId?: string) {
  const reads = useProductionReads();
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
    void reads
      .getPublishedVersion(opportunityVersionId)
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
    return () => {
      active = false;
    };
  }, [opportunityVersionId, reads]);

  return { reads, bundle, loading, error };
}

export function OpportunitiesPage() {
  const reads = useProductionReads();
  const navigate = useNavigate();
  const [bundles, setBundles] = useState<readonly ProductionOpportunityBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!reads) {
      setLoading(false);
      setError('Supabase is not configured for production opportunity reads.');
      return;
    }
    let active = true;
    void reads
      .listCurrentPublished()
      .then((next) => {
        if (active) setBundles(next);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load opportunities.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reads]);

  return (
    <ProductionFrame
      eyebrow="Engine B · opportunity readiness"
      title="Opportunities"
      description="Explore current published opportunity versions. Discovery filters do not decide eligibility, readiness or hiring outcomes."
    >
      {loading ? <Notice>Loading published opportunities…</Notice> : error ? <Notice>{error}</Notice> : (
        <OpportunityExplorer
          opportunities={bundles.map((bundle) => bundle.opportunity)}
          versions={bundles.map((bundle) => bundle.version)}
          onSelectOpportunity={(opportunityId) => {
            const selected = bundles.find((bundle) => bundle.opportunity.id === opportunityId);
            if (selected) navigate(`/opportunities/${selected.version.id}`);
          }}
        />
      )}
    </ProductionFrame>
  );
}

export function OpportunityDetailPage() {
  const { opportunityVersionId } = useParams();
  const navigate = useNavigate();
  const { bundle, loading, error } = usePublishedBundle(opportunityVersionId);
  const isCurrent = Boolean(bundle && bundle.opportunity.currentVersionId === bundle.version.id);
  const [questionnaire, setQuestionnaire] = useState<(OpportunityQuestionnaireAssignment & { version: QuestionnaireVersion }) | null>();
  const [questionnaireError, setQuestionnaireError] = useState<string>();
  useEffect(() => {
    if (!opportunityVersionId) return;
    let active = true;
    void getOpportunityQuestionnaireAssignment(opportunityVersionId)
      .then((next) => { if (active) setQuestionnaire(next); })
      .catch((reason) => { if (active) setQuestionnaireError(reason instanceof Error ? reason.message : 'Unable to load questionnaire requirement.'); });
    return () => { active = false; };
  }, [opportunityVersionId]);

  return (
    <ProductionFrame
      eyebrow="Immutable opportunity version"
      title="Opportunity requirements"
      description="Literal source wording, canonical resolution and eligibility structure stay visible. Unresolved language remains literal rather than being guessed."
    >
      {loading ? <Notice>Loading canonical opportunity version…</Notice> : error || !bundle ? <Notice>{error ?? 'Opportunity unavailable.'}</Notice> : (
        <>
          <OpportunityDetail opportunity={bundle.opportunity} opportunityVersion={bundle.version} onBack={() => navigate('/opportunities')} />
          {questionnaire ? (
            <section className="mt-6 border-2 border-black bg-[#fff4c7] p-5" aria-labelledby="assigned-questionnaire-title">
              <p className="font-mono-ui text-[10px] font-black uppercase tracking-[.16em]">Contextual assessment · exact version {questionnaire.version.version_number}</p>
              <h2 id="assigned-questionnaire-title" className="mt-2 text-2xl font-black">{questionnaire.version.title}</h2>
              <p className="mt-2 text-sm text-black/65">{questionnaire.version.description}</p>
              <p className="mt-2 text-xs text-black/60">This is assessed evidence for this opportunity context—not psychometric certification, hiring probability, or automatic rejection.</p>
              <Link
                className="mt-4 inline-flex min-h-11 items-center border-2 border-black bg-black px-5 font-mono-ui text-xs font-black uppercase text-white"
                to={`/questionnaires/${questionnaire.questionnaire_version_id}?opportunityId=${bundle.opportunity.id}&opportunityVersionId=${bundle.version.id}`}
              >
                {questionnaire.required ? 'Complete required questionnaire' : 'Open questionnaire'}
              </Link>
            </section>
          ) : questionnaireError ? <Notice>{questionnaireError}</Notice> : null}
          {!isCurrent && <Notice>This is a historical published version. Readiness can be inspected, but new application preparation is limited to the current version.</Notice>}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to={`/opportunities/${bundle.version.id}/readiness`} className="min-h-11 bg-black px-5 py-3 font-mono-ui text-xs font-black uppercase text-white">
              Explain my readiness
            </Link>
            <Link to={`/evidence?opportunityVersionId=${bundle.version.id}`} className="min-h-11 border-2 border-black px-5 py-3 font-mono-ui text-xs font-black uppercase">
              Prove or clarify evidence
            </Link>
            {isCurrent && (
              <Link to={`/opportunities/${bundle.version.id}/apply`} className="min-h-11 border-2 border-black bg-[#e7ff57] px-5 py-3 font-mono-ui text-xs font-black uppercase">
                Prepare application
              </Link>
            )}
          </div>
        </>
      )}
    </ProductionFrame>
  );
}

export function ReadinessPage() {
  const { opportunityVersionId } = useParams();
  const navigate = useNavigate();
  const { actorId, trustedApi } = useSihProduction();
  const { reads, bundle, loading: bundleLoading, error: bundleError } = usePublishedBundle(opportunityVersionId);
  const [result, setResult] = useState<OpportunityReadinessResult>();
  const [loadingResult, setLoadingResult] = useState(true);
  const [error, setError] = useState<string>();
  const [recomputing, setRecomputing] = useState(false);

  useEffect(() => {
    if (!actorId || !reads || !bundle) {
      if (!bundleLoading) setLoadingResult(false);
      return;
    }
    let active = true;
    setLoadingResult(true);
    void reads
      .getLatestReadinessResult(actorId, bundle.version.id)
      .then((next) => {
        if (active) setResult(next ?? undefined);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load readiness.');
      })
      .finally(() => {
        if (active) setLoadingResult(false);
      });
    return () => {
      active = false;
    };
  }, [actorId, reads, bundle, bundleLoading]);

  async function recompute() {
    if (!trustedApi || !bundle) return;
    setRecomputing(true);
    setError(undefined);
    try {
      const next = await trustedApi.recomputeReadiness(bundle.version.id);
      setResult(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Trusted readiness recomputation failed.');
    } finally {
      setRecomputing(false);
      setLoadingResult(false);
    }
  }

  const availability = bundleLoading || loadingResult
    ? 'loading' as const
    : error || bundleError
      ? 'error' as const
      : !result
        ? 'unavailable' as const
        : undefined;

  return (
    <ProductionFrame
      eyebrow="Deterministic · explainable · versioned"
      title="Opportunity Readiness"
      description="Readiness is an auditable comparison between confirmed opportunity requirements and current evidence. UNKNOWN ≠ UNSKILLED, and the result is never hiring probability."
    >
      {bundleError && <Notice>{bundleError}</Notice>}
      {error && <Notice>{error}</Notice>}
      <div className="mb-5 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!trustedApi || !bundle || recomputing}
          onClick={() => void recompute()}
          className="min-h-11 border-2 border-black bg-[#e7ff57] px-4 font-mono-ui text-xs font-black uppercase disabled:opacity-40"
        >
          {recomputing ? 'Recomputing…' : result ? 'Recompute canonical readiness' : 'Compute canonical readiness'}
        </button>
        {bundle && <Link to={`/opportunities/${bundle.version.id}`} className="min-h-11 border-2 border-black px-4 py-3 font-mono-ui text-xs font-black uppercase">Opportunity details</Link>}
        {bundle && result && <Link to={`/gap-closure?opportunityVersionId=${bundle.version.id}`} className="min-h-11 border-2 border-black bg-white px-4 py-3 font-mono-ui text-xs font-black uppercase">Open gap-closure plan</Link>}
      </div>
      <ReadinessCasefile
        result={result}
        opportunityVersion={bundle?.version}
        availability={availability}
        errorMessage={error ?? bundleError}
        onEvidenceHandoff={(handoff) => navigate(`/evidence?opportunityVersionId=${handoff.opportunityVersionId}&requirementId=${handoff.requirementId}&source=readiness`)}
        onGapActionHandoff={(handoff) => navigate(`/gap-closure?opportunityVersionId=${handoff.opportunityVersionId}&requirementId=${handoff.requirementId}`)}
      />
      {bundle && result && bundle.opportunity.currentVersionId === bundle.version.id && (
        <div className="mt-6">
          <Link to={`/opportunities/${bundle.version.id}/apply`} className="inline-flex min-h-11 items-center bg-black px-5 font-mono-ui text-xs font-black uppercase text-white">Prepare consented application</Link>
        </div>
      )}
    </ProductionFrame>
  );
}

export function GapClosurePage() {
  const [searchParams] = useSearchParams();
  const opportunityVersionId = searchParams.get('opportunityVersionId') ?? undefined;
  const navigate = useNavigate();
  const { actorId } = useSihProduction();
  const { reads, bundle, loading, error: bundleError } = usePublishedBundle(opportunityVersionId);
  const [result, setResult] = useState<OpportunityReadinessResult>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!actorId || !reads || !bundle) return;
    let active = true;
    void reads
      .getLatestReadinessResult(actorId, bundle.version.id)
      .then((next) => {
        if (active) setResult(next ?? undefined);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load readiness for gap closure.');
      });
    return () => {
      active = false;
    };
  }, [actorId, reads, bundle]);

  return (
    <ProductionFrame
      eyebrow="UNKNOWN ≠ UNSKILLED"
      title="Gap Closure"
      description="Use the requirement state to choose the next action. UNKNOWN routes to proving or clarifying information first; genuine capability gaps may route to practice, learning or experience."
    >
      {!opportunityVersionId ? (
        <Notice>Select an opportunity and compute readiness before opening a gap-closure plan. <Link className="underline" to="/opportunities">Browse opportunities</Link>.</Notice>
      ) : loading ? <Notice>Loading gap-closure context…</Notice> : bundleError || error ? <Notice>{bundleError ?? error}</Notice> : !bundle || !result ? (
        <Notice>No current canonical readiness result is available. <Link className="underline" to={`/opportunities/${opportunityVersionId}/readiness`}>Compute readiness</Link>.</Notice>
      ) : (
        <GapClosurePlan
          result={result}
          opportunityVersion={bundle.version}
          onEvidenceHandoff={(handoff) => navigate(`/evidence?opportunityVersionId=${handoff.opportunityVersionId}&requirementId=${handoff.requirementId ?? ''}&source=gap-closure`)}
        />
      )}
    </ProductionFrame>
  );
}

export function EvidencePage() {
  const { actorId, dal, trustedApi } = useSihProduction();
  const [searchParams] = useSearchParams();
  const [evidence, setEvidence] = useState<readonly EvidenceRecordReadModel[]>([]);
  const [error, setError] = useState<string>();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedEvidenceForUpload, setSelectedEvidenceForUpload] = useState<EvidenceRecordId | undefined>();
  const opportunityVersionId = searchParams.get('opportunityVersionId');
  const requirementId = searchParams.get('requirementId');
  const source = searchParams.get('source');

  useEffect(() => {
    if (!actorId || !dal) return;
    let active = true;
    void dal.listEvidenceForSubject(actorId)
      .then((next) => {
        if (active) setEvidence(next);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load evidence.');
      });
    return () => {
      active = false;
    };
  }, [actorId, dal]);

  function refreshEvidence() {
    if (!actorId || !dal) return;
    void dal.listEvidenceForSubject(actorId)
      .then((next) => setEvidence(next))
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to reload evidence.'));
  }

  function handleProveEvidence(evidenceId: EvidenceRecordId) {
    setSelectedEvidenceForUpload(evidenceId);
    setShowUploadModal(true);
  }

  return (
    <ProductionFrame
      eyebrow="Career Passport evidence"
      title="Evidence"
      description="Evidence retains literal claims, provenance, scope and verification state. Weak or self-reported records cannot mathematically become issuer-grade provenance."
    >
      {opportunityVersionId && (
        <div className="mb-5 border-2 border-black bg-[#fff4c7] p-4 text-sm">
          <p className="font-black">Opportunity-specific evidence handoff</p>
          <p className="mt-1 text-black/70">
            {requirementId 
              ? `Requirement ${requirementId} needs evidence or clarification.` 
              : 'Review evidence relevant to this opportunity.'}
          </p>
          {source === 'readiness' && (
            <p className="mt-2 text-sm">
              To strengthen weak evidence, upload a work sample artifact and optionally request verification from a mentor or issuer.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-3">
            <Link className="underline" to={`/opportunities/${opportunityVersionId}/readiness`}>Back to readiness</Link>
            <Link className="underline" to="/verification">Verification workspace</Link>
          </div>
        </div>
      )}

      <div className="mb-5 flex gap-3">
        <button
          type="button"
          onClick={() => setShowUploadModal(true)}
          disabled={!trustedApi || !actorId}
          className="border-2 border-black bg-[#e7ff57] px-4 py-2 font-mono-ui text-xs font-black uppercase disabled:opacity-40"
        >
          Upload new artifact
        </button>
      </div>

      {error && <Notice>{error}</Notice>}
      {evidence.length === 0 ? (
        <Notice>No production evidence records are currently visible to this subject.</Notice>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {evidence.map((record) => (
            <article key={record.id} className="border-2 border-black bg-white p-5 shadow-[4px_4px_0_#111]">
              <h2 className="font-black leading-relaxed">{record.literalClaim}</h2>
              <dl className="mt-4 grid gap-2 text-xs">
                <div><dt className="font-mono-ui uppercase text-black/45">Provenance</dt><dd className="mt-1 font-bold">{record.provenance.replaceAll('_', ' ')}</dd></div>
                <div><dt className="font-mono-ui uppercase text-black/45">Verification</dt><dd className="mt-1 font-bold">{record.initialVerificationState.replaceAll('_', ' ')}</dd></div>
                <div><dt className="font-mono-ui uppercase text-black/45">Visibility</dt><dd className="mt-1 font-bold">{record.visibility.replaceAll('_', ' ')}</dd></div>
                <div><dt className="font-mono-ui uppercase text-black/45">Source</dt><dd className="mt-1 font-bold">{record.source.system}</dd></div>
              </dl>
              {(record.provenance === 'self_declared' || record.provenance === 'self_reported') && 
               record.initialVerificationState === 'unverified' && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => handleProveEvidence(record.id)}
                    className="border-2 border-black bg-white px-3 py-1 font-mono-ui text-[10px] font-bold uppercase"
                  >
                    Upload artifact & request verification
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {showUploadModal && trustedApi && actorId && (
        <EvidenceUploadModal
          actorId={actorId}
          trustedApi={trustedApi}
          evidenceRecordId={selectedEvidenceForUpload}
          requirementContext={requirementId ? {
            opportunityVersionId: opportunityVersionId!,
            requirementId,
            skillLabel: 'Selected requirement',
          } : undefined}
          onClose={() => {
            setShowUploadModal(false);
            setSelectedEvidenceForUpload(undefined);
          }}
          onSuccess={() => {
            setShowUploadModal(false);
            setSelectedEvidenceForUpload(undefined);
            refreshEvidence();
          }}
        />
      )}
    </ProductionFrame>
  );
}

export function ApplicationPreparationPage() {
  const { opportunityVersionId } = useParams();
  const { actorId, dal, trustedApi } = useSihProduction();
  const { bundle, loading, error: bundleError } = usePublishedBundle(opportunityVersionId);
  const [evidence, setEvidence] = useState<readonly EvidenceRecordReadModel[]>([]);
  const [selectedEvidenceRecordIds, setSelectedEvidenceRecordIds] = useState<readonly EvidenceRecordId[]>([]);
  const [error, setError] = useState<string>();

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
    return () => {
      active = false;
    };
  }, [actorId, dal]);

  const questionnaireReference = bundle?.version.requirements.find(
    (requirement) => requirement.category === 'questionnaire' && requirement.questionnaireReference,
  );
  const isCurrent = Boolean(bundle && bundle.opportunity.currentVersionId === bundle.version.id);

  return (
    <ProductionFrame
      eyebrow="Purpose-specific consent · immutable submission"
      title="Prepare application"
      description="Choose the evidence to disclose, grant application-review consent to the opportunity owner, then finalize and submit the exact immutable snapshot through trusted authority."
    >
      {loading ? <Notice>Loading application context…</Notice> : bundleError || error ? <Notice>{bundleError ?? error}</Notice> : !bundle || !actorId || !dal ? (
        <Notice>Application preparation is unavailable.</Notice>
      ) : !isCurrent ? (
        <Notice>This opportunity version is no longer current. New application preparation is blocked for historical versions.</Notice>
      ) : (
        <div className="grid gap-6">
          <ApplicationPreparationWorkspace
            evidence={evidence}
            selectedEvidenceRecordIds={selectedEvidenceRecordIds}
            onSelectedEvidenceRecordIdsChange={setSelectedEvidenceRecordIds}
            questionnaireReference={questionnaireReference?.category === 'questionnaire' ? questionnaireReference.questionnaireReference : undefined}
          />
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
      )}
    </ProductionFrame>
  );
}

export function ApplicationsPage() {
  const { actorId, dal } = useSihProduction();
  const [rows, setRows] = useState<readonly ApplicationReadModel[]>([]);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!actorId || !dal) return;
    let active = true;
    void dal.listApplicationsForApplicant(actorId)
      .then((next) => {
        if (active) setRows(next);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load applications.');
      });
    return () => {
      active = false;
    };
  }, [actorId, dal]);

  return (
    <ProductionFrame
      eyebrow="Append-only application lifecycle"
      title="Applications"
      description="Track the human recruitment lifecycle for applications submitted through explicit consent and an exact immutable snapshot."
    >
      {error && <Notice>{error}</Notice>}
      {rows.length === 0 ? <Notice>No production applications yet. Start from a current opportunity.</Notice> : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((application) => (
            <article key={application.id} className="border-2 border-black bg-white p-5 shadow-[4px_4px_0_#111]">
              <p className="font-mono-ui text-[10px] font-black uppercase text-[#d63c1d]">{application.currentStage.replaceAll('_', ' ')}</p>
              <h2 className="mt-2 break-all text-lg font-black">{application.id}</h2>
              <dl className="mt-4 grid gap-2 text-xs">
                <div><dt className="font-mono-ui uppercase text-black/45">Opportunity version</dt><dd className="mt-1 break-all">{application.opportunityVersionId}</dd></div>
                <div><dt className="font-mono-ui uppercase text-black/45">Created</dt><dd className="mt-1">{application.createdAt}</dd></div>
              </dl>
              <Link className="mt-4 inline-block underline" to={`/opportunities/${application.opportunityVersionId}`}>Open opportunity version</Link>
            </article>
          ))}
        </div>
      )}
    </ProductionFrame>
  );
}
