import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import type { OpportunityId, OpportunityVersionId, OrganizationId } from '../domain';
import OpportunityAuthoringShell, {
  type OpportunityAuthoringDraftState,
} from '../components/sih/industry/OpportunityAuthoringShell';
import { SKILLS } from '../data/knowledge/skills';
import {
  ProductionOpportunityAuthoring,
  type SavedProductionOpportunityDraft,
} from '../services/sih/productionOpportunityAuthoring';
import { supabase } from '../services/supabase';
import { useSihProduction, type SihMembershipContext } from './SihProductionContext';

const AUTHOR_ROLES = new Set(['recruiter', 'industry_partner', 'institution_admin', 'faculty']);
const canonicalSkillOptions = SKILLS.map((skill) => ({ id: skill.id, label: skill.name }));

type ManagedOpportunityRow = {
  readonly opportunityId: OpportunityId;
  readonly ownerOrganizationId: OrganizationId;
  readonly opportunityStatus: string;
  readonly versionId: OpportunityVersionId;
  readonly versionNumber: number;
  readonly versionStatus: 'draft' | 'published';
  readonly title: string;
  readonly opportunityType: string;
  readonly publishedAt?: string;
  readonly createdAt: string;
};

function IndustryFrame({
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
        <Notice>Loading authenticated organization authority…</Notice>
      ) : error ? (
        <Notice>{error}</Notice>
      ) : !actorId ? (
        <Notice>Sign in with a provisioned CareerCase organization role to use production opportunity authoring.</Notice>
      ) : (
        <div className="mt-8">{children}</div>
      )}
    </div>
  );
}

function Notice({ children }: { readonly children: ReactNode }) {
  return <div className="mt-6 border-2 border-black bg-white p-5 text-sm shadow-[4px_4px_0_#111]">{children}</div>;
}

function authorMemberships(memberships: readonly SihMembershipContext[]): readonly SihMembershipContext[] {
  return memberships.filter((membership) => membership.roles.some((role) => AUTHOR_ROLES.has(role)));
}

function useAuthoringService() {
  return useMemo(() => (supabase ? new ProductionOpportunityAuthoring(supabase) : null), []);
}

function useManagedOpportunities() {
  const { memberships } = useSihProduction();
  const authorizedMemberships = useMemo(() => authorMemberships(memberships), [memberships]);
  const [rows, setRows] = useState<readonly ManagedOpportunityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!supabase || authorizedMemberships.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }
    let active = true;
    const organizationIds = authorizedMemberships.map((membership) => membership.organizationId);
    const db = supabase.schema('sih26044');
    setLoading(true);
    setError(undefined);

    void (async () => {
      const { data: opportunities, error: opportunityError } = await db
        .from('opportunities')
        .select('id,owner_organization_id,current_version_id,status,updated_at')
        .in('owner_organization_id', organizationIds)
        .order('updated_at', { ascending: false });
      if (opportunityError) throw new Error(`Unable to load managed opportunities: ${opportunityError.message}`);
      if (!opportunities || opportunities.length === 0) return [];

      const opportunityIds = opportunities.map((item) => item.id as string);
      const { data: versions, error: versionError } = await db
        .from('opportunity_versions')
        .select('id,opportunity_id,version_number,status,title,opportunity_type,published_at,created_at')
        .in('opportunity_id', opportunityIds)
        .order('version_number', { ascending: false });
      if (versionError) throw new Error(`Unable to load managed opportunity versions: ${versionError.message}`);

      const opportunityById = new Map(opportunities.map((item) => [item.id as string, item]));
      return (versions ?? []).map((version) => {
        const opportunity = opportunityById.get(version.opportunity_id as string);
        if (!opportunity) throw new Error('Managed opportunity version is missing its parent opportunity.');
        return {
          opportunityId: opportunity.id as OpportunityId,
          ownerOrganizationId: opportunity.owner_organization_id as OrganizationId,
          opportunityStatus: opportunity.status as string,
          versionId: version.id as OpportunityVersionId,
          versionNumber: Number(version.version_number),
          versionStatus: version.status as 'draft' | 'published',
          title: version.title as string,
          opportunityType: version.opportunity_type as string,
          ...(version.published_at ? { publishedAt: version.published_at as string } : {}),
          createdAt: version.created_at as string,
        } satisfies ManagedOpportunityRow;
      });
    })()
      .then((next) => {
        if (active) setRows(next);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load managed opportunities.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [authorizedMemberships]);

  return { rows, loading, error, authorizedMemberships };
}

export function IndustryOpportunitiesPage() {
  const { rows, loading, error, authorizedMemberships } = useManagedOpportunities();
  const organizationNameById = new Map(authorizedMemberships.map((membership) => [membership.organizationId, membership.organizationName]));

  return (
    <IndustryFrame
      eyebrow="Industry · human-authored opportunity intelligence"
      title="Opportunity Management"
      description="Create and review versioned opportunities under authenticated organization authority. Draft save and publication are separate audited actions; review-only skill suggestions never become resolved automatically."
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-2 border-black bg-[#fff4c7] p-5">
        <div>
          <p className="font-mono-ui text-[10px] font-black uppercase">Authorized organizations</p>
          <p className="mt-1 text-sm text-black/65">{authorizedMemberships.length} organization context(s) can author opportunities for this account.</p>
        </div>
        <Link to="/industry/opportunities/new" className="min-h-11 border-2 border-black bg-black px-5 py-3 font-mono-ui text-xs font-black uppercase text-white">
          New opportunity
        </Link>
      </div>

      {authorizedMemberships.length === 0 ? (
        <Notice>No recruiter, industry partner, institution admin or faculty authoring role is active for this account.</Notice>
      ) : loading ? (
        <Notice>Loading authorized opportunity versions…</Notice>
      ) : error ? (
        <Notice>{error}</Notice>
      ) : rows.length === 0 ? (
        <Notice>No opportunity versions have been authored for the visible organizations yet.</Notice>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((row) => (
            <article key={row.versionId} className="border-2 border-black bg-white p-5 shadow-[4px_4px_0_#111]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono-ui text-[10px] font-black uppercase text-[#d63c1d]">Version {row.versionNumber} · {row.versionStatus}</p>
                  <h2 className="mt-2 text-xl font-black">{row.title}</h2>
                </div>
                <span className="border border-black bg-[#e7ff57] px-2 py-1 font-mono-ui text-[9px] font-black uppercase">{row.opportunityType.replaceAll('_', ' ')}</span>
              </div>
              <dl className="mt-4 grid gap-2 text-xs">
                <div><dt className="font-mono-ui uppercase text-black/45">Organization</dt><dd className="mt-1">{organizationNameById.get(row.ownerOrganizationId) ?? 'Authorized organization'}</dd></div>
                <div><dt className="font-mono-ui uppercase text-black/45">Opportunity status</dt><dd className="mt-1">{row.opportunityStatus}</dd></div>
                <div><dt className="font-mono-ui uppercase text-black/45">Version ID</dt><dd className="mt-1 break-all font-mono-ui">{row.versionId}</dd></div>
              </dl>
              {row.versionStatus === 'published' ? (
                <Link to={`/opportunities/${row.versionId}`} className="mt-4 inline-flex min-h-10 items-center underline">Open published version</Link>
              ) : (
                <p className="mt-4 text-sm text-black/60">Draft editing for persisted versions is the next authoring convergence slice; published versions remain immutable.</p>
              )}
            </article>
          ))}
        </div>
      )}
    </IndustryFrame>
  );
}

export function IndustryNewOpportunityPage() {
  const navigate = useNavigate();
  const { actorId, memberships, dal } = useSihProduction();
  const service = useAuthoringService();
  const authorizedMemberships = useMemo(() => authorMemberships(memberships), [memberships]);
  const [ownerOrganizationId, setOwnerOrganizationId] = useState<OrganizationId | undefined>(authorizedMemberships[0]?.organizationId);
  const [savedDraft, setSavedDraft] = useState<SavedProductionOpportunityDraft>();

  useEffect(() => {
    if (!ownerOrganizationId && authorizedMemberships[0]) {
      setOwnerOrganizationId(authorizedMemberships[0].organizationId);
    }
  }, [authorizedMemberships, ownerOrganizationId]);

  const saveDraft = async (draft: OpportunityAuthoringDraftState) => {
    if (!service || !ownerOrganizationId) throw new Error('Production opportunity draft persistence is not configured for an authorized organization.');
    const saved = await service.saveDraft({
      ownerOrganizationId,
      ...(savedDraft ? { opportunityId: savedDraft.opportunityId, opportunityVersionId: savedDraft.opportunityVersionId } : {}),
      basics: draft.basics,
      requirements: draft.requirements,
      eligibilityRules: draft.eligibilityRules,
    });
    setSavedDraft(saved);
  };

  const publishDraft = async (opportunityVersionId: OpportunityVersionId) => {
    if (!dal) throw new Error('Authenticated opportunity publication authority is unavailable.');
    await dal.publishOpportunityVersion(opportunityVersionId);
    navigate('/industry/opportunities');
  };

  return (
    <IndustryFrame
      eyebrow="Atomic draft save · explicit human publish"
      title="Author Opportunity"
      description="Human-authored structure is persisted atomically. Unresolved skill wording stays literal, review-required suggestions remain non-authoritative, and publication is a separate audited action after complete confirmation."
    >
      {!actorId || authorizedMemberships.length === 0 ? (
        <Notice>No active organization authoring authority is available for this account.</Notice>
      ) : !service ? (
        <Notice>Supabase is not configured for production opportunity authoring.</Notice>
      ) : (
        <>
          <section className="mx-auto mb-6 max-w-4xl border-2 border-black bg-[#fff4c7] p-5">
            <label className="grid gap-2 font-mono-ui text-[10px] font-black uppercase">
              Authoring organization
              <select
                value={ownerOrganizationId ?? ''}
                disabled={Boolean(savedDraft)}
                onChange={(event) => setOwnerOrganizationId(event.target.value as OrganizationId)}
                className="min-h-11 border-2 border-black bg-white px-3 text-sm normal-case disabled:opacity-60"
              >
                {authorizedMemberships.map((membership) => (
                  <option key={membership.organizationId} value={membership.organizationId}>{membership.organizationName}</option>
                ))}
              </select>
            </label>
            {savedDraft && (
              <p className="mt-3 font-mono-ui text-[10px] uppercase text-black/60">
                Draft authority locked to this organization for version {savedDraft.versionNumber}.
              </p>
            )}
          </section>

          <OpportunityAuthoringShell
            currentActorId={actorId}
            persistedOpportunityVersionId={savedDraft?.opportunityVersionId}
            canonicalSkillOptions={canonicalSkillOptions}
            onSaveDraft={saveDraft}
            onPublishPersistedVersion={publishDraft}
            modeLabel="Authenticated production authoring · deterministic human confirmation"
          />
        </>
      )}
    </IndustryFrame>
  );
}
