import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ActorId, OpportunityVersion, OrganizationId } from '../../../../domain';
import { SihBrowserDal } from '../../../../services/sih/browserDal';
import { SihTrustedApiClient } from '../../../../services/sih/SihTrustedApiClient';
import { SihTrustedApiError, type ApplicationReadModel, type ConsentGrantReadModel, type CreateApplicationSnapshotResponse } from '../../../../services/sih/types';

type Props = {
  readonly browserDal: SihBrowserDal;
  readonly trustedApi: SihTrustedApiClient;
  readonly applicantActorId: ActorId;
  readonly opportunityVersion: OpportunityVersion;
  readonly ownerOrganizationId: OrganizationId;
  readonly selectedEvidenceRecordIds: readonly string[];
  readonly availability?: 'loading' | 'unauthorized' | 'error';
};

type Status = 'idle' | 'working' | 'error' | 'success';

export function ApplicationFinalizationPanel({ browserDal, trustedApi, applicantActorId, opportunityVersion, ownerOrganizationId, selectedEvidenceRecordIds, availability }: Props) {
  const [applications, setApplications] = useState<readonly ApplicationReadModel[]>([]);
  const [consents, setConsents] = useState<readonly ConsentGrantReadModel[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string>();
  const [finalized, setFinalized] = useState<CreateApplicationSnapshotResponse>();

  const refresh = useCallback(async () => {
    const [nextApplications, nextConsents] = await Promise.all([
      browserDal.listApplicationsForApplicant(applicantActorId, { opportunityId: opportunityVersion.opportunityId, opportunityVersionId: opportunityVersion.id }),
      browserDal.listApplicationReviewConsentsForSubject(applicantActorId, ownerOrganizationId),
    ]);
    setApplications(nextApplications);
    setConsents(nextConsents);
  }, [applicantActorId, browserDal, opportunityVersion.id, opportunityVersion.opportunityId, ownerOrganizationId]);

  useEffect(() => { if (!availability) void refresh().catch(error => { setStatus('error'); setMessage(error instanceof Error ? error.message : 'Unable to load application preparation state.'); }); }, [availability, refresh]);

  const application = applications.find(item => item.currentStage === 'saved' || item.currentStage === 'preparing');
  const activeConsent = useMemo(() => consents.find(consent => consent.status === 'granted' && selectedEvidenceRecordIds.every(id => consent.evidenceRecordIds.includes(id))), [consents, selectedEvidenceRecordIds]);

  async function prepareApplication(): Promise<ApplicationReadModel> {
    if (application) return application;
    await browserDal.createApplication(applicantActorId, { opportunityId: opportunityVersion.opportunityId, opportunityVersionId: opportunityVersion.id, ownerOrganizationId, initialStage: 'preparing' });
    await refresh();
    const current = (await browserDal.listApplicationsForApplicant(applicantActorId, { opportunityId: opportunityVersion.opportunityId, opportunityVersionId: opportunityVersion.id })).find(item => item.currentStage === 'saved' || item.currentStage === 'preparing');
    if (!current) throw new Error('Application preparation could not be confirmed.');
    return current;
  }

  async function grantConsent() {
    setStatus('working'); setMessage(undefined);
    try {
      await prepareApplication();
      await browserDal.grantConsent(applicantActorId, { granteeOrganizationId: ownerOrganizationId, purpose: 'application_review', evidenceRecordIds: selectedEvidenceRecordIds });
      await refresh(); setStatus('idle'); setMessage('Application-review consent is active for the selected evidence.');
    } catch (error) { setStatus('error'); setMessage(error instanceof Error ? error.message : 'Consent could not be granted.'); }
  }

  async function withdrawConsent() {
    if (!activeConsent) return;
    setStatus('working'); setMessage(undefined);
    try {
      await browserDal.withdrawConsent(applicantActorId, activeConsent.id);
      await refresh(); setStatus('idle'); setMessage('Consent was withdrawn. Ongoing recruiter access is no longer represented as active.');
    } catch (error) { setStatus('error'); setMessage(error instanceof Error ? error.message : 'Consent could not be withdrawn.'); }
  }

  async function finalize() {
    setStatus('working'); setMessage(undefined); setFinalized(undefined);
    try {
      const prepared = await prepareApplication();
      const consent = activeConsent ?? (await browserDal.listApplicationReviewConsentsForSubject(applicantActorId, ownerOrganizationId)).find(item => item.status === 'granted' && selectedEvidenceRecordIds.every(id => item.evidenceRecordIds.includes(id)));
      if (!consent) throw new Error('Active application-review consent covering every selected evidence record is required before finalization.');
      const response = await trustedApi.createAndFinalizeApplicationSnapshot({ applicationId: prepared.id, opportunityVersionId: opportunityVersion.id, selectedEvidenceRecordIds: [...selectedEvidenceRecordIds], consentGrantId: consent.id });
      setFinalized(response); await refresh(); setStatus('success'); setMessage('The trusted service finalized the application snapshot.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof SihTrustedApiError && error.code === 'SNAPSHOT_CONFLICT' ? 'The immutable snapshot conflicts with current material. Refresh the application state and retry.' : error instanceof Error ? error.message : 'Trusted finalization failed.');
    }
  }

  if (availability) return <section className="border-2 border-black bg-white p-5" aria-live="polite"><h2 className="text-xl font-black">Application preparation unavailable</h2><p className="mt-2 text-sm text-black/70">{availability === 'loading' ? 'Application data is loading.' : availability === 'unauthorized' ? 'Sign in with the authorized applicant account to prepare this application.' : 'Application preparation data could not be loaded.'}</p></section>;
  const disabled = status === 'working';
  return <section className="border-2 border-black bg-white p-5 shadow-[5px_5px_0_#111]" aria-labelledby="application-finalization-title"><p className="font-mono-ui text-[10px] font-black uppercase tracking-[0.18em] text-[#d63c1d]">Consent and submission</p><h2 id="application-finalization-title" className="mt-2 text-2xl font-black">Finalize through trusted authority</h2><p className="mt-3 text-sm leading-relaxed text-black/70">Finalization rechecks consent, selected evidence, current opportunity version, and canonical readiness. The browser does not create snapshots directly.</p><p className="mt-3 font-mono-ui text-xs font-bold uppercase">{selectedEvidenceRecordIds.length} selected evidence record{selectedEvidenceRecordIds.length === 1 ? '' : 's'}</p><div className="mt-5 flex flex-wrap gap-3">{activeConsent ? <button type="button" disabled={disabled} onClick={() => void withdrawConsent()} className="min-h-11 border-2 border-black bg-white px-4 font-mono-ui text-xs font-black uppercase disabled:opacity-50">Withdraw application-review consent</button> : <button type="button" disabled={disabled} onClick={() => void grantConsent()} className="min-h-11 border-2 border-black bg-[#e7ff57] px-4 font-mono-ui text-xs font-black uppercase disabled:opacity-50">Grant application-review consent</button>}<button type="button" disabled={disabled || !activeConsent || selectedEvidenceRecordIds.length === 0} onClick={() => void finalize()} className="min-h-11 border-2 border-black bg-black px-4 font-mono-ui text-xs font-black uppercase text-white disabled:opacity-40">Finalize application snapshot</button></div>{message && <p className={`mt-4 border-l-4 p-3 text-sm ${status === 'error' ? 'border-[#d63c1d] bg-[#fff1ec]' : 'border-black bg-[#f7f4ed]'}`} role={status === 'error' ? 'alert' : 'status'}>{message}</p>}{finalized && <section className="mt-5 border-2 border-black bg-[#f7f4ed] p-4"><h3 className="font-black">Trusted finalization record</h3><dl className="mt-3 grid gap-3 text-xs sm:grid-cols-3"><div><dt className="font-mono-ui uppercase">Snapshot ID</dt><dd className="mt-1 break-all font-mono-ui">{finalized.snapshotId}</dd></div><div><dt className="font-mono-ui uppercase">Integrity fingerprint</dt><dd className="mt-1 break-all font-mono-ui">{finalized.integrityFingerprint}</dd></div><div><dt className="font-mono-ui uppercase">Finalized at</dt><dd className="mt-1 font-mono-ui">{finalized.finalizedAt}</dd></div></dl></section>}</section>;
}

export default ApplicationFinalizationPanel;
