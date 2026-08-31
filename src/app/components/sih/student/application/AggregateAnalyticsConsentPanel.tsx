import { useCallback, useEffect, useState } from 'react';
import type { ActorId, OrganizationId } from '../../../../domain';
import { ProductionAnalyticsConsent, type AggregateAnalyticsConsentState } from '../../../../services/sih/productionAnalyticsConsent';

type Props = {
  readonly service: ProductionAnalyticsConsent;
  readonly subjectActorId: ActorId;
  readonly organizationId: OrganizationId;
};

export function AggregateAnalyticsConsentPanel({ service, subjectActorId, organizationId }: Props) {
  const [consent, setConsent] = useState<AggregateAnalyticsConsentState | null>(null);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    const next = await service.getLatestForOrganization(subjectActorId, organizationId);
    setConsent(next);
  }, [organizationId, service, subjectActorId]);

  useEffect(() => {
    void refresh().catch((reason) => {
      setError(reason instanceof Error ? reason.message : 'Unable to load optional analytics consent.');
    });
  }, [refresh]);

  async function grant() {
    setWorking(true);
    setError(undefined);
    setMessage(undefined);
    try {
      await service.grant(subjectActorId, organizationId);
      await refresh();
      setMessage('Optional aggregate analytics consent is active.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to grant aggregate analytics consent.');
    } finally {
      setWorking(false);
    }
  }

  async function withdraw() {
    if (!consent?.active) return;
    setWorking(true);
    setError(undefined);
    setMessage(undefined);
    try {
      await service.withdraw(subjectActorId, consent.consentId);
      await refresh();
      setMessage('Aggregate analytics consent was withdrawn. Future employer aggregate queries exclude this application subject while consent is inactive.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to withdraw aggregate analytics consent.');
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="border-2 border-black bg-[#f7f4ed] p-5 shadow-[4px_4px_0_#111]" aria-labelledby="aggregate-analytics-consent-title">
      <p className="font-mono-ui text-[10px] font-black uppercase tracking-[.16em] text-[#d63c1d]">Optional · separate purpose</p>
      <h2 id="aggregate-analytics-consent-title" className="mt-2 text-xl font-black">Employer aggregate analytics consent</h2>
      <p className="mt-3 text-sm leading-6 text-black/70">
        This consent is not required to apply and does not affect recruiter review, readiness, shortlisting, or hiring decisions. When active, your submitted application may contribute only to privacy-protected employer aggregate statistics with minimum-cell suppression and no individual drill-down.
      </p>
      <p className="mt-3 text-xs leading-5 text-black/60">
        The employer does not receive extra evidence or private Career Guidance inputs through this consent. You can withdraw this analytics purpose independently of application-review consent.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {consent?.active ? (
          <button
            type="button"
            disabled={working}
            onClick={() => void withdraw()}
            className="min-h-11 border-2 border-black bg-white px-4 font-mono-ui text-xs font-black uppercase disabled:opacity-50"
          >
            Withdraw aggregate analytics consent
          </button>
        ) : (
          <button
            type="button"
            disabled={working}
            onClick={() => void grant()}
            className="min-h-11 border-2 border-black bg-[#e7ff57] px-4 font-mono-ui text-xs font-black uppercase disabled:opacity-50"
          >
            Opt in to aggregate analytics
          </button>
        )}
        <span className="font-mono-ui text-[10px] font-black uppercase text-black/55">
          {consent?.active ? 'Active' : 'Not active'}
        </span>
      </div>
      {message && <p className="mt-4 border-l-4 border-black bg-white p-3 text-sm" role="status">{message}</p>}
      {error && <p className="mt-4 border-l-4 border-[#d63c1d] bg-[#fff1ec] p-3 text-sm" role="alert">{error}</p>}
    </section>
  );
}

export default AggregateAnalyticsConsentPanel;
