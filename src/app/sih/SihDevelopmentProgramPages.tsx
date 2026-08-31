import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import type {
  DevelopmentDeliveryMode,
  DevelopmentProgramId,
  DevelopmentProgramKind,
  DevelopmentProgramSkillTarget,
  DevelopmentProgramSummary,
  DevelopmentProgramVersion,
  DevelopmentProgramVersionId,
  OrganizationId,
} from '../domain';
import { SKILLS } from '../data/knowledge/skills';
import { ProductionDevelopmentPrograms } from '../services/sih/productionDevelopmentPrograms';
import { supabase } from '../services/supabase';
import { useSihProduction, type SihMembershipContext } from './SihProductionContext';

const AUTHOR_ROLES = new Set(['faculty', 'institution_admin', 'industry_partner']);
const KIND_OPTIONS: readonly DevelopmentProgramKind[] = ['training', 'certification', 'workshop', 'mentorship'];
const DELIVERY_OPTIONS: readonly DevelopmentDeliveryMode[] = ['online', 'onsite', 'hybrid', 'self_paced'];

function Frame({ eyebrow, title, description, children }: { readonly eyebrow: string; readonly title: string; readonly description: string; readonly children: ReactNode }) {
  const { loading, error, actorId } = useSihProduction();
  return <div className="mx-auto max-w-6xl px-4 py-10">
    <p className="font-mono-ui text-[10px] font-black uppercase tracking-[.2em] text-[var(--accent-news)]">{eyebrow}</p>
    <h1 className="mt-2 text-4xl font-black tracking-tight">{title}</h1>
    <p className="mt-3 max-w-3xl text-sm leading-6 text-black/65">{description}</p>
    {loading ? <Notice>Loading authenticated authority…</Notice> : error ? <Notice>{error}</Notice> : !actorId ? <Notice>Sign in with a provisioned CareerCase role to use this production workspace.</Notice> : <div className="mt-8">{children}</div>}
  </div>;
}
function Notice({ children }: { readonly children: ReactNode }) { return <div className="border-2 border-black bg-white p-5 text-sm shadow-[4px_4px_0_#111]">{children}</div>; }
function label(value: string) { return value.replaceAll('_', ' '); }
function usePrograms() { return useMemo(() => supabase ? new ProductionDevelopmentPrograms(supabase) : null, []); }
function authorMemberships(memberships: readonly SihMembershipContext[]) { return memberships.filter((membership) => membership.roles.some((role) => AUTHOR_ROLES.has(role))); }
function toDateTimeLocal(value?: string): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function DevelopmentProgramsPage() {
  const service = usePrograms();
  const [searchParams] = useSearchParams();
  const canonicalSkillId = searchParams.get('canonicalSkillId') ?? undefined;
  const requirementId = searchParams.get('requirementId') ?? undefined;
  const [programs, setPrograms] = useState<readonly DevelopmentProgramVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!service) { setLoading(false); setError('Supabase is not configured for development-program discovery.'); return; }
    let active = true;
    setLoading(true);
    void service.listPublished(canonicalSkillId).then((next) => { if (active) setPrograms(next); }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load development programs.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [service, canonicalSkillId]);

  return <Frame eyebrow="Prove · practice · learn · experience" title="Development Programs" description="Browse human-published training, certification, workshop and mentorship listings. CareerCase does not rank providers, promise outcomes, or treat a listing as evidence or verification.">
    {canonicalSkillId && <div className="mb-5 border-2 border-black bg-[#fff4c7] p-4 text-sm">
      <p className="font-black">Exact gap-closure linkage</p>
      <p className="mt-1 text-black/70">This view is filtered only by the exact canonical skill ID already resolved in the opportunity requirement{requirementId ? ` (${requirementId})` : ''}. No fuzzy skill guess or suitability ranking is used.</p>
    </div>}
    {loading ? <Notice>Loading published programs…</Notice> : error ? <Notice>{error}</Notice> : programs.length === 0 ? <Notice>No published programs match this exact filter. This does not mean no suitable learning exists elsewhere.</Notice> : <div className="grid gap-4 md:grid-cols-2">
      {programs.map((program) => <article key={program.id} className="border-2 border-black bg-white p-5 shadow-[4px_4px_0_#111]">
        <div className="flex flex-wrap gap-2"><span className="border border-black px-2 py-1 font-mono-ui text-[10px] font-black uppercase">{label(program.kind)}</span><span className="border border-black px-2 py-1 font-mono-ui text-[10px] font-black uppercase">{label(program.deliveryMode)}</span></div>
        <h2 className="mt-3 text-xl font-black">{program.title}</h2>
        <p className="mt-1 text-xs font-bold text-black/60">{program.providerDisplayName}</p>
        <p className="mt-3 text-sm leading-6 text-black/70">{program.description}</p>
        <div className="mt-4"><p className="font-mono-ui text-[10px] font-black uppercase">Provider-authored capability targets</p><ul className="mt-2 space-y-1 text-sm">{program.skillTargets.map((target, index) => <li key={`${program.id}-${index}`}>• {target.literalSourceWording}{target.canonicalResolution.state === 'resolved' ? ` — ${target.canonicalResolution.label ?? target.canonicalResolution.skillId}` : ' — literal/unresolved'}</li>)}</ul></div>
        {program.externalRegistrationUrl && <a className="mt-4 inline-flex min-h-11 items-center border-2 border-black bg-[#e7ff57] px-4 font-mono-ui text-xs font-black uppercase" href={program.externalRegistrationUrl} target="_blank" rel="noreferrer">Open provider registration</a>}
        <p className="mt-3 text-xs leading-5 text-black/55">External links and provider claims are listings supplied by the provider organization. CareerCase does not infer enrollment, completion, certification, verification or endorsement.</p>
      </article>)}
    </div>}
  </Frame>;
}

export function DevelopmentProgramManagePage() {
  const { memberships } = useSihProduction();
  const providers = authorMemberships(memberships);
  const service = usePrograms();
  const [providerId, setProviderId] = useState<OrganizationId | undefined>(providers[0]?.organizationId);
  const [programs, setPrograms] = useState<readonly DevelopmentProgramSummary[]>([]);
  const [error, setError] = useState<string>();

  useEffect(() => { if (!providerId && providers[0]) setProviderId(providers[0].organizationId); }, [providerId, providers]);
  useEffect(() => {
    if (!service || !providerId) return;
    let active = true;
    void service.listManaged(providerId).then((next) => { if (active) setPrograms(next); }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load managed programs.'); });
    return () => { active = false; };
  }, [service, providerId]);

  return <Frame eyebrow="Human-authored provider catalog" title="Manage Development Programs" description="Authorized faculty, institution administrators and industry partners can author provider listings. Publication is a separate human action and published versions are immutable.">
    {providers.length === 0 ? <Notice>Your authenticated memberships do not grant development-program authoring authority.</Notice> : <>
      <div className="flex flex-wrap items-end gap-3"><label className="grid gap-1 text-sm font-bold">Provider organization<select className="min-h-11 border-2 border-black bg-white px-3" value={providerId ?? ''} onChange={(event) => setProviderId(event.target.value as OrganizationId)}>{providers.map((provider) => <option key={provider.organizationId} value={provider.organizationId}>{provider.organizationName}</option>)}</select></label><Link className="min-h-11 bg-black px-4 py-3 font-mono-ui text-xs font-black uppercase text-white" to={providerId ? `/development/new?providerOrganizationId=${providerId}` : '/development/new'}>Create program</Link></div>
      {error && <div className="mt-5"><Notice>{error}</Notice></div>}
      <div className="mt-6 grid gap-3">{programs.length === 0 ? <Notice>No program versions are currently managed by this organization.</Notice> : programs.map((program) => <article key={program.id} className="flex flex-wrap items-center justify-between gap-4 border-2 border-black bg-white p-4"><div><h2 className="font-black">{program.title}</h2><p className="text-xs text-black/60">{label(program.kind)} · v{program.currentVersionNumber} · {program.versionStatus}</p></div><Link className="min-h-11 border-2 border-black px-4 py-3 font-mono-ui text-xs font-black uppercase" to={`/development/manage/${program.currentVersionId}`}>{program.versionStatus === 'draft' ? 'Edit draft' : 'Create successor'}</Link></article>)}</div>
    </>}
  </Frame>;
}

type EditableTarget = { literalSourceWording: string; canonicalSkillId: string; reviewed: boolean };
type DraftState = { kind: DevelopmentProgramKind; title: string; description: string; deliveryMode: DevelopmentDeliveryMode; externalRegistrationUrl: string; startsAt: string; endsAt: string; targets: EditableTarget[] };
const emptyDraft = (): DraftState => ({ kind: 'training', title: '', description: '', deliveryMode: 'online', externalRegistrationUrl: '', startsAt: '', endsAt: '', targets: [{ literalSourceWording: '', canonicalSkillId: '', reviewed: false }] });

function targetFromEditable(target: EditableTarget): DevelopmentProgramSkillTarget {
  const selected = target.canonicalSkillId ? SKILLS.find((skill) => skill.id === target.canonicalSkillId) : undefined;
  const literal = target.literalSourceWording.trim();
  const matchKind = selected && literal.toLocaleLowerCase() === selected.name.toLocaleLowerCase() ? 'exact' as const : 'alias' as const;
  return {
    literalSourceWording: target.literalSourceWording,
    canonicalResolution: selected ? { state: 'resolved', skillId: selected.id, label: selected.name, matchKind } : { state: 'unresolved', literalText: target.literalSourceWording },
    humanConfirmed: target.reviewed,
    ...(target.reviewed ? { confirmationMethod: 'structured_human_entry' as const } : {}),
  };
}
function editableFromTarget(target: DevelopmentProgramSkillTarget, resetReview = false): EditableTarget {
  return {
    literalSourceWording: target.literalSourceWording,
    canonicalSkillId: target.canonicalResolution.state === 'resolved' ? target.canonicalResolution.skillId : '',
    reviewed: resetReview ? false : target.humanConfirmed,
  };
}

export function DevelopmentProgramAuthoringPage() {
  const { developmentProgramVersionId } = useParams();
  const [searchParams] = useSearchParams();
  const { memberships } = useSihProduction();
  const providers = authorMemberships(memberships);
  const service = usePrograms();
  const navigate = useNavigate();
  const [providerId, setProviderId] = useState<OrganizationId | undefined>((searchParams.get('providerOrganizationId') as OrganizationId | null) ?? providers[0]?.organizationId);
  const [programId, setProgramId] = useState<DevelopmentProgramId>();
  const [versionId, setVersionId] = useState<DevelopmentProgramVersionId | undefined>(developmentProgramVersionId as DevelopmentProgramVersionId | undefined);
  const [versionNumber, setVersionNumber] = useState<number>();
  const [loadedVersionStatus, setLoadedVersionStatus] = useState<'draft' | 'published'>();
  const [draft, setDraft] = useState<DraftState>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => { if (!providerId && providers[0]) setProviderId(providers[0].organizationId); }, [providerId, providers]);
  useEffect(() => {
    if (!service || !developmentProgramVersionId) return;
    let active = true;
    void service.getManagedVersion(developmentProgramVersionId as DevelopmentProgramVersionId).then((version) => {
      if (!active || !version) return;
      const successorSource = version.status === 'published';
      setProviderId(version.providerOrganizationId); setProgramId(version.developmentProgramId); setVersionId(version.id); setVersionNumber(version.versionNumber); setLoadedVersionStatus(version.status);
      setDraft({ kind: version.kind, title: version.title, description: version.description, deliveryMode: version.deliveryMode, externalRegistrationUrl: version.externalRegistrationUrl ?? '', startsAt: toDateTimeLocal(version.startsAt), endsAt: toDateTimeLocal(version.endsAt), targets: version.skillTargets.map((target) => editableFromTarget(target, successorSource)) });
      setDirty(false);
    }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load program version.'); });
    return () => { active = false; };
  }, [service, developmentProgramVersionId]);

  function patch(next: Partial<DraftState>) { setDraft((current) => ({ ...current, ...next })); setDirty(true); }
  function patchTarget(index: number, next: Partial<EditableTarget>) { setDraft((current) => ({ ...current, targets: current.targets.map((target, targetIndex) => targetIndex === index ? { ...target, ...next } : target) })); setDirty(true); }

  async function save(event?: FormEvent) {
    event?.preventDefault();
    if (!service || !providerId) return;
    setSaving(true); setError(undefined);
    try {
      const successor = loadedVersionStatus === 'published';
      const saved = await service.saveDraft({ providerOrganizationId: providerId, developmentProgramId: programId, developmentProgramVersionId: successor ? undefined : versionId, kind: draft.kind, title: draft.title, description: draft.description, deliveryMode: draft.deliveryMode, ...(draft.externalRegistrationUrl ? { externalRegistrationUrl: draft.externalRegistrationUrl } : {}), ...(draft.startsAt ? { startsAt: draft.startsAt } : {}), ...(draft.endsAt ? { endsAt: draft.endsAt } : {}), skillTargets: draft.targets.map(targetFromEditable) });
      setProgramId(saved.developmentProgramId); setVersionId(saved.developmentProgramVersionId); setVersionNumber(saved.versionNumber); setLoadedVersionStatus('draft'); setDirty(false);
      if (successor || developmentProgramVersionId !== saved.developmentProgramVersionId) navigate(`/development/manage/${saved.developmentProgramVersionId}`, { replace: true });
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save program draft.'); } finally { setSaving(false); }
  }
  async function publish() {
    if (!service || !versionId || dirty || loadedVersionStatus !== 'draft') return;
    setPublishing(true); setError(undefined);
    try { await service.publish(versionId); setLoadedVersionStatus('published'); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to publish development program.'); } finally { setPublishing(false); }
  }

  const allReviewed = draft.targets.length > 0 && draft.targets.every((target) => target.literalSourceWording.trim() && target.reviewed);
  return <Frame eyebrow="Conservative canonical resolution" title={loadedVersionStatus === 'published' ? 'Create Program Successor' : 'Author Development Program'} description="Keep provider wording literal. Canonical skill selection is an explicit human action; leaving the canonical field blank retains the target as unresolved literal wording. Publication never certifies learner completion.">
    {providers.length === 0 ? <Notice>Your authenticated memberships do not grant development-program authoring authority.</Notice> : <form className="grid gap-5" onSubmit={(event) => void save(event)}>
      {error && <Notice>{error}</Notice>}
      {versionNumber && <Notice>Program version v{versionNumber} · {loadedVersionStatus}. {loadedVersionStatus === 'published' ? 'Published content is immutable. Creating a successor preserves wording/mapping for review but clears every prior confirmation; each target must be explicitly reconfirmed.' : 'Save the exact draft before publication.'}</Notice>}
      <label className="grid gap-1 text-sm font-bold">Provider organization<select disabled={Boolean(programId)} className="min-h-11 border-2 border-black bg-white px-3 disabled:opacity-60" value={providerId ?? ''} onChange={(event) => { setProviderId(event.target.value as OrganizationId); setDirty(true); }}>{providers.map((provider) => <option key={provider.organizationId} value={provider.organizationId}>{provider.organizationName}</option>)}</select></label>
      <div className="grid gap-4 md:grid-cols-2"><label className="grid gap-1 text-sm font-bold">Program kind<select className="min-h-11 border-2 border-black bg-white px-3" value={draft.kind} onChange={(event) => patch({ kind: event.target.value as DevelopmentProgramKind })}>{KIND_OPTIONS.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label><label className="grid gap-1 text-sm font-bold">Delivery mode<select className="min-h-11 border-2 border-black bg-white px-3" value={draft.deliveryMode} onChange={(event) => patch({ deliveryMode: event.target.value as DevelopmentDeliveryMode })}>{DELIVERY_OPTIONS.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label></div>
      <label className="grid gap-1 text-sm font-bold">Title<input className="min-h-11 border-2 border-black px-3" value={draft.title} onChange={(event) => patch({ title: event.target.value })} /></label>
      <label className="grid gap-1 text-sm font-bold">Description<textarea className="min-h-32 border-2 border-black p-3" value={draft.description} onChange={(event) => patch({ description: event.target.value })} /></label>
      <label className="grid gap-1 text-sm font-bold">External registration URL (optional)<input className="min-h-11 border-2 border-black px-3" placeholder="https://provider.example/..." value={draft.externalRegistrationUrl} onChange={(event) => patch({ externalRegistrationUrl: event.target.value })} /><span className="text-xs font-normal text-black/55">A link is not a live CareerCase integration or endorsement.</span></label>
      <div className="grid gap-4 md:grid-cols-2"><label className="grid gap-1 text-sm font-bold">Starts at (optional)<input type="datetime-local" className="min-h-11 border-2 border-black px-3" value={draft.startsAt} onChange={(event) => patch({ startsAt: event.target.value })} /></label><label className="grid gap-1 text-sm font-bold">Ends at (optional)<input type="datetime-local" className="min-h-11 border-2 border-black px-3" value={draft.endsAt} onChange={(event) => patch({ endsAt: event.target.value })} /></label></div>
      <section><div className="flex items-center justify-between gap-3"><div><h2 className="text-2xl font-black">Skill / capability targets</h2><p className="text-sm text-black/60">No fuzzy mapping is performed. Select a trusted canonical skill only when you explicitly confirm the mapping.</p></div><button type="button" className="min-h-11 border-2 border-black px-3 font-mono-ui text-xs font-black uppercase" onClick={() => patch({ targets: [...draft.targets, { literalSourceWording: '', canonicalSkillId: '', reviewed: false }] })}>Add target</button></div><div className="mt-4 grid gap-3">{draft.targets.map((target, index) => <article key={index} className="border-2 border-black bg-white p-4"><label className="grid gap-1 text-sm font-bold">Literal provider wording<input className="min-h-11 border-2 border-black px-3" value={target.literalSourceWording} onChange={(event) => patchTarget(index, { literalSourceWording: event.target.value, reviewed: false })} /></label><label className="mt-3 grid gap-1 text-sm font-bold">Canonical skill (optional)<select className="min-h-11 border-2 border-black bg-white px-3" value={target.canonicalSkillId} onChange={(event) => patchTarget(index, { canonicalSkillId: event.target.value, reviewed: false })}><option value="">Keep literal / unresolved</option>{SKILLS.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}</select></label><label className="mt-3 flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 size-4" checked={target.reviewed} onChange={(event) => patchTarget(index, { reviewed: event.target.checked })} /><span><strong>Human review complete.</strong> I confirm the selected canonical mapping, or explicitly retain the literal wording as unresolved.</span></label>{draft.targets.length > 1 && <button type="button" className="mt-3 text-xs font-bold underline" onClick={() => patch({ targets: draft.targets.filter((_, targetIndex) => targetIndex !== index) })}>Remove target</button>}</article>)}</div></section>
      <div className="flex flex-wrap gap-3"><button disabled={saving || !providerId} className="min-h-11 bg-black px-5 font-mono-ui text-xs font-black uppercase text-white disabled:opacity-40" type="submit">{saving ? 'Saving…' : loadedVersionStatus === 'published' ? 'Create successor draft' : 'Save exact draft'}</button><button disabled={!versionId || dirty || loadedVersionStatus !== 'draft' || publishing || !allReviewed} type="button" onClick={() => void publish()} className="min-h-11 border-2 border-black bg-[#e7ff57] px-5 font-mono-ui text-xs font-black uppercase disabled:opacity-40">{publishing ? 'Publishing…' : 'Publish human-reviewed version'}</button><Link className="min-h-11 border-2 border-black px-5 py-3 font-mono-ui text-xs font-black uppercase" to="/development/manage">Back to programs</Link></div>
      {!allReviewed && <p className="text-xs text-black/60">Publication remains blocked until every target has an explicit human review. Saving an unconfirmed draft is allowed.</p>}
    </form>}
  </Frame>;
}
