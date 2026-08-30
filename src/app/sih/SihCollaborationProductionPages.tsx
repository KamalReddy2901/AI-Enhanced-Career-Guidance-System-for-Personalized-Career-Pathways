import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import type { CollaborationKind, OrganizationId } from '../domain';
import { supabase } from '../services/supabase';
import {
  ProductionCollaborationAuthoring,
  type CollaborationPartnerOrganization,
} from '../services/sih/productionCollaborationAuthoring';
import { ProductionFacultyReads, type ProductionFacultyCollaborationBundle } from '../services/sih/productionFacultyReads';
import { useSihProduction, type SihMembershipContext } from './SihProductionContext';

const AUTHOR_ROLES = new Set(['faculty', 'institution_admin', 'industry_partner']);

const KIND_OPTIONS: readonly { value: CollaborationKind; label: string }[] = [
  { value: 'faculty_internship', label: 'Faculty internship' },
  { value: 'industrial_training', label: 'Industrial training' },
  { value: 'faculty_development_program', label: 'Faculty development programme' },
  { value: 'consultancy', label: 'Consultancy' },
  { value: 'collaborative_research', label: 'Collaborative research' },
  { value: 'mentoring', label: 'Mentoring' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'guest_lecture', label: 'Guest lecture' },
  { value: 'live_project', label: 'Live project' },
];

function Notice({ children }: { readonly children: ReactNode }) {
  return <div className="border-2 border-black bg-white p-5 text-sm shadow-[4px_4px_0_#111]">{children}</div>;
}

function authorMemberships(memberships: readonly SihMembershipContext[]) {
  return memberships.filter((membership) => membership.roles.some((role) => AUTHOR_ROLES.has(role)));
}

function useCollaborationServices() {
  return useMemo(() => {
    if (!supabase) return null;
    return {
      reads: new ProductionFacultyReads(supabase),
      authoring: new ProductionCollaborationAuthoring(supabase),
    };
  }, []);
}

export function CollaborationHubPage() {
  const { actorId, memberships, loading: authorityLoading, error: authorityError } = useSihProduction();
  const services = useCollaborationServices();
  const authorizedHosts = useMemo(() => authorMemberships(memberships), [memberships]);
  const [bundle, setBundle] = useState<ProductionFacultyCollaborationBundle>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!services || !actorId) {
      setLoading(false);
      setBundle(undefined);
      return;
    }
    let active = true;
    setLoading(true);
    setError(undefined);
    void services.reads.listVisible()
      .then((next) => {
        if (active) setBundle(next);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load collaborations.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [actorId, services]);

  const organizationName = new Map(bundle?.organizations.map((organization) => [organization.id, organization.displayName]) ?? []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="font-mono-ui text-[10px] font-black uppercase tracking-[.2em] text-[#d63c1d]">Academia–industry ecosystem</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">Collaboration</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-black/65">
            Discover collaboration records visible through your authenticated organization or participant authority. Proposals preserve explicit partners and literal objectives; approval and later lifecycle actions remain separate human decisions.
          </p>
        </div>
        {authorizedHosts.length > 0 && (
          <Link to="/collaborations/new" className="min-h-11 border-2 border-black bg-black px-5 py-3 font-mono-ui text-xs font-black uppercase text-white">
            Propose collaboration
          </Link>
        )}
      </div>

      <div className="mt-8">
        {authorityLoading ? (
          <Notice>Loading authenticated collaboration authority…</Notice>
        ) : authorityError ? (
          <Notice>{authorityError}</Notice>
        ) : !actorId ? (
          <Notice>Sign in with a provisioned CareerCase SIH role to view production collaborations.</Notice>
        ) : loading ? (
          <Notice>Loading authorized collaborations…</Notice>
        ) : error ? (
          <Notice>{error}</Notice>
        ) : !bundle || bundle.engagements.length === 0 ? (
          <Notice>No collaboration engagements are visible to this account yet.</Notice>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {bundle.engagements.map((engagement) => (
              <article key={engagement.id} className="border-2 border-black bg-white p-5 shadow-[4px_4px_0_#111]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono-ui text-[10px] font-black uppercase text-[#d63c1d]">{engagement.kind.replaceAll('_', ' ')}</p>
                    <h2 className="mt-2 text-xl font-black">{engagement.objectives[0] ?? 'Collaboration engagement'}</h2>
                  </div>
                  <span className="border border-black bg-[#e7ff57] px-2 py-1 font-mono-ui text-[9px] font-black uppercase">{engagement.status}</span>
                </div>
                <dl className="mt-4 grid gap-3 text-xs">
                  <div>
                    <dt className="font-mono-ui uppercase text-black/45">Host</dt>
                    <dd className="mt-1">{organizationName.get(engagement.hostOrganizationId) ?? 'Authorized host organization'}</dd>
                  </div>
                  <div>
                    <dt className="font-mono-ui uppercase text-black/45">Explicit partners</dt>
                    <dd className="mt-1">{engagement.partnerOrganizationIds.length}</dd>
                  </div>
                  <div>
                    <dt className="font-mono-ui uppercase text-black/45">Objectives</dt>
                    <dd className="mt-1">{engagement.objectives.length}</dd>
                  </div>
                </dl>
                <Link to={`/collaborations/${engagement.id}`} className="mt-5 inline-flex min-h-10 items-center font-semibold underline">
                  Open lifecycle
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function localDateTimeToIso(value: string): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error('Enter a valid collaboration date and time.');
  return parsed.toISOString();
}

export function CollaborationProposalPage() {
  const navigate = useNavigate();
  const { actorId, memberships, loading: authorityLoading, error: authorityError } = useSihProduction();
  const services = useCollaborationServices();
  const hosts = useMemo(() => authorMemberships(memberships), [memberships]);
  const [hostOrganizationId, setHostOrganizationId] = useState<OrganizationId | undefined>(hosts[0]?.organizationId);
  const [kind, setKind] = useState<CollaborationKind>('collaborative_research');
  const [partners, setPartners] = useState<readonly CollaborationPartnerOrganization[]>([]);
  const [selectedPartners, setSelectedPartners] = useState<OrganizationId[]>([]);
  const [objectivesText, setObjectivesText] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [directoryError, setDirectoryError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();

  useEffect(() => {
    if (!hostOrganizationId && hosts[0]) setHostOrganizationId(hosts[0].organizationId);
  }, [hostOrganizationId, hosts]);

  useEffect(() => {
    if (!services || !hostOrganizationId) {
      setPartners([]);
      return;
    }
    let active = true;
    setDirectoryLoading(true);
    setDirectoryError(undefined);
    setSelectedPartners([]);
    void services.authoring.listPartnerOrganizations(hostOrganizationId)
      .then((rows) => {
        if (active) setPartners(rows);
      })
      .catch((reason) => {
        if (active) setDirectoryError(reason instanceof Error ? reason.message : 'Unable to load partner organizations.');
      })
      .finally(() => {
        if (active) setDirectoryLoading(false);
      });
    return () => { active = false; };
  }, [hostOrganizationId, services]);

  const togglePartner = (organizationId: OrganizationId) => {
    setSelectedPartners((current) => current.includes(organizationId)
      ? current.filter((id) => id !== organizationId)
      : [...current, organizationId]);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!services || !hostOrganizationId) return;
    const objectives = objectivesText.split('\n').map((item) => item.trim()).filter(Boolean);
    try {
      setSubmitting(true);
      setSubmitError(undefined);
      const collaborationId = await services.authoring.createProposal({
        hostOrganizationId,
        kind,
        partnerOrganizationIds: selectedPartners,
        objectives,
        ...(startsAt ? { startsAt: localDateTimeToIso(startsAt) } : {}),
        ...(endsAt ? { endsAt: localDateTimeToIso(endsAt) } : {}),
      });
      navigate(`/collaborations/${collaborationId}`);
    } catch (reason) {
      setSubmitError(reason instanceof Error ? reason.message : 'Unable to create collaboration proposal.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <p className="font-mono-ui text-[10px] font-black uppercase tracking-[.2em] text-[#d63c1d]">Human-authored · proposed status only</p>
      <h1 className="mt-2 text-4xl font-black tracking-tight">Propose Collaboration</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-black/65">
        Create an auditable proposed engagement with explicit organizations and literal objectives. This action does not approve participation, verify skills, create evidence, or imply endorsement.
      </p>

      <div className="mt-8">
        {authorityLoading ? (
          <Notice>Loading authenticated organization authority…</Notice>
        ) : authorityError ? (
          <Notice>{authorityError}</Notice>
        ) : !actorId || hosts.length === 0 ? (
          <Notice>An active faculty, institution-admin or industry-partner role is required to author a collaboration proposal.</Notice>
        ) : !services ? (
          <Notice>Supabase is not configured for production collaboration authoring.</Notice>
        ) : (
          <form onSubmit={(event) => void submit(event)} className="space-y-6">
            <section className="border-2 border-black bg-white p-5 shadow-[4px_4px_0_#111]">
              <label className="grid gap-2 font-mono-ui text-[10px] font-black uppercase">
                Host organization
                <select value={hostOrganizationId ?? ''} onChange={(event) => setHostOrganizationId(event.target.value as OrganizationId)} className="min-h-11 border-2 border-black bg-white px-3 text-sm normal-case">
                  {hosts.map((membership) => <option key={membership.organizationId} value={membership.organizationId}>{membership.organizationName}</option>)}
                </select>
              </label>

              <label className="mt-5 grid gap-2 font-mono-ui text-[10px] font-black uppercase">
                Collaboration type
                <select value={kind} onChange={(event) => setKind(event.target.value as CollaborationKind)} className="min-h-11 border-2 border-black bg-white px-3 text-sm normal-case">
                  {KIND_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            </section>

            <section className="border-2 border-black bg-white p-5 shadow-[4px_4px_0_#111]">
              <h2 className="font-mono-ui text-sm font-black uppercase">Explicit partner organizations</h2>
              <p className="mt-1 text-sm text-black/60">Selecting an organization records it as a proposed partner; it is not an acceptance or endorsement.</p>
              {directoryLoading ? (
                <p className="mt-4 text-sm">Loading registered organizations…</p>
              ) : directoryError ? (
                <p className="mt-4 text-sm text-[#d63c1d]">{directoryError}</p>
              ) : partners.length === 0 ? (
                <p className="mt-4 text-sm">No other active registered organization is currently available.</p>
              ) : (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {partners.map((partner) => (
                    <label key={partner.organizationId} className="flex min-h-12 items-start gap-3 border border-black p-3 text-sm">
                      <input type="checkbox" checked={selectedPartners.includes(partner.organizationId)} onChange={() => togglePartner(partner.organizationId)} className="mt-1" />
                      <span><strong>{partner.displayName}</strong><br /><span className="text-xs text-black/55">{partner.kind.replaceAll('_', ' ')}</span></span>
                    </label>
                  ))}
                </div>
              )}
            </section>

            <section className="border-2 border-black bg-white p-5 shadow-[4px_4px_0_#111]">
              <label className="grid gap-2 font-mono-ui text-[10px] font-black uppercase">
                Literal objectives · one per line
                <textarea value={objectivesText} onChange={(event) => setObjectivesText(event.target.value)} rows={6} maxLength={3000} placeholder={'Run a joint industry workshop\nDefine a supervised live-project brief'} className="border-2 border-black p-3 font-sans text-sm normal-case" />
              </label>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 font-mono-ui text-[10px] font-black uppercase">Proposed start<input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="min-h-11 border-2 border-black px-3 text-sm normal-case" /></label>
                <label className="grid gap-2 font-mono-ui text-[10px] font-black uppercase">Proposed end<input type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className="min-h-11 border-2 border-black px-3 text-sm normal-case" /></label>
              </div>
            </section>

            {submitError && <div className="border-l-4 border-[#d63c1d] bg-[#f7f4ed] p-4 text-sm text-[#d63c1d]">{submitError}</div>}

            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={submitting || selectedPartners.length === 0 || objectivesText.trim().length === 0} className="min-h-11 border-2 border-black bg-black px-5 py-3 font-mono-ui text-xs font-black uppercase text-white disabled:opacity-40">
                {submitting ? 'Creating proposal…' : 'Create proposed engagement'}
              </button>
              <Link to="/collaborations" className="min-h-11 border-2 border-black px-5 py-3 font-mono-ui text-xs font-black uppercase">Cancel</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
