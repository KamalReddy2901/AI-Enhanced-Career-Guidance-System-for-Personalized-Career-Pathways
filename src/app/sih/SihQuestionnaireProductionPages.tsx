import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { QuestionnaireAuthoringForm } from '../components/questionnaire/QuestionnaireAuthoringForm';
import {
  createQuestionnaire,
  getQuestionnaireVersion,
  getStudentSubmission,
  listOrganizationQuestionnaires,
  publishQuestionnaireVersion,
  saveResponse,
  startSubmission,
  submitQuestionnaire,
} from '../services/questionnaireDb';
import type { QuestionnaireFormData, QuestionnaireResponse } from '../types/questionnaire';
import { useSihProduction } from './SihProductionContext';

const AUTHOR_ROLES = new Set(['recruiter', 'industry_partner', 'institution_admin']);

function Frame({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return <main className="mx-auto max-w-5xl px-4 py-10"><p className="font-mono-ui text-[10px] font-black uppercase tracking-[.2em] text-[#d63c1d]">{eyebrow}</p><h1 className="mt-2 text-4xl font-black tracking-tight">{title}</h1><div className="mt-8">{children}</div></main>;
}

function Notice({ children, alert = false }: { children: ReactNode; alert?: boolean }) {
  return <div role={alert ? 'alert' : 'status'} className="border-2 border-black bg-white p-5 text-sm shadow-[4px_4px_0_#111]">{children}</div>;
}

export function IndustryQuestionnairesPage() {
  const { memberships, loading, actorId } = useSihProduction();
  const authorized = useMemo(() => memberships.filter((item) => item.roles.some((role) => AUTHOR_ROLES.has(role))), [memberships]);
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listOrganizationQuestionnaires>>>([]);
  const [error, setError] = useState<string>();
  useEffect(() => {
    if (!actorId || authorized.length === 0) return;
    let active = true;
    Promise.all(authorized.map((item) => listOrganizationQuestionnaires(item.organizationId)))
      .then((groups) => { if (active) setRows(groups.flat()); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load questionnaires.'); });
    return () => { active = false; };
  }, [actorId, authorized]);

  return <Frame eyebrow="Industry · contextual assessment" title="Questionnaires">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-2 border-black bg-[#fff4c7] p-5"><p className="max-w-2xl text-sm">Questionnaires are human-published, versioned and context-bound. Results are assessed evidence—not hiring probability or automatic rejection.</p><Link className="min-h-11 border-2 border-black bg-black px-5 py-3 font-mono-ui text-xs font-black uppercase text-white" to="/industry/questionnaires/new">New questionnaire</Link></div>
    {loading ? <Notice>Loading organization authority…</Notice> : error ? <Notice alert>{error}</Notice> : authorized.length === 0 ? <Notice>No questionnaire-authoring role is active for this account.</Notice> : rows.length === 0 ? <Notice>No questionnaires have been authored for your organizations.</Notice> : <div className="grid gap-4 md:grid-cols-2">{rows.map((row) => <article key={row.id} className="border-2 border-black bg-white p-5 shadow-[4px_4px_0_#111]"><p className="font-mono-ui text-[10px] font-black uppercase text-[#d63c1d]">{row.status}</p><h2 className="mt-2 text-xl font-black">{row.current_version?.title ?? 'Untitled draft'}</h2><p className="mt-2 text-sm text-black/65">{row.current_version?.description}</p>{row.current_version ? <Link className="mt-4 inline-flex min-h-11 items-center underline" to={`/industry/questionnaires/${row.current_version.id}`}>Review version</Link> : null}</article>)}</div>}
  </Frame>;
}

export function IndustryNewQuestionnairePage() {
  const { memberships } = useSihProduction();
  const navigate = useNavigate();
  const authorized = memberships.filter((item) => item.roles.some((role) => AUTHOR_ROLES.has(role)));
  const [organizationId, setOrganizationId] = useState<string>(authorized[0]?.organizationId ?? '');
  useEffect(() => { if (!organizationId && authorized[0]) setOrganizationId(authorized[0].organizationId); }, [authorized, organizationId]);
  return <Frame eyebrow="Explicit human authoring" title="Create questionnaire">
    {authorized.length === 0 ? <Notice>No authoring organization is available.</Notice> : <><label htmlFor="questionnaire-organization" className="mb-2 block text-sm font-black">Authoring organization</label><select id="questionnaire-organization" className="mb-6 min-h-11 w-full border-2 border-black bg-white px-3" value={organizationId} onChange={(event) => setOrganizationId(event.target.value)}>{authorized.map((item) => <option key={item.organizationId} value={item.organizationId}>{item.organizationName}</option>)}</select><QuestionnaireAuthoringForm onCancel={() => navigate('/industry/questionnaires')} onSubmit={async (data: QuestionnaireFormData) => { await createQuestionnaire(data, organizationId); navigate('/industry/questionnaires'); }} /></>}
  </Frame>;
}

export function IndustryQuestionnaireReviewPage() {
  const { questionnaireVersionId } = useParams();
  const [data, setData] = useState<Awaited<ReturnType<typeof getQuestionnaireVersion>>>();
  const [error, setError] = useState<string>();
  const [publishing, setPublishing] = useState(false);
  useEffect(() => { if (questionnaireVersionId) void getQuestionnaireVersion(questionnaireVersionId).then(setData).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load questionnaire.')); }, [questionnaireVersionId]);
  return <Frame eyebrow="Review · explicit publication" title={data?.version.title ?? 'Questionnaire review'}>{error ? <Notice alert>{error}</Notice> : !data ? <Notice>Loading questionnaire…</Notice> : <div className="grid gap-5"><Notice>{data.version.description}</Notice><ol className="grid gap-3">{data.questions.map((question) => <li key={question.id} className="border-2 border-black bg-white p-4"><span className="font-mono-ui text-[10px] font-black uppercase">{question.question_type.replaceAll('_', ' ')}</span><p className="mt-2 font-bold">{question.question_text}</p></li>)}</ol>{data.version.status === 'draft' ? <button disabled={publishing} className="min-h-11 border-2 border-black bg-[#d63c1d] px-5 py-3 font-mono-ui text-xs font-black uppercase text-white disabled:opacity-50" onClick={async () => { setPublishing(true); try { await publishQuestionnaireVersion(data.version.id); setData(await getQuestionnaireVersion(data.version.id)); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Publication failed.'); } finally { setPublishing(false); } }}>{publishing ? 'Publishing…' : 'Publish this exact version'}</button> : <Notice>Published content is immutable. A revision must use a successor version.</Notice>}</div>}</Frame>;
}

export function StudentQuestionnairePage() {
  const { questionnaireVersionId } = useParams();
  const [search] = useSearchParams();
  const { actorId } = useSihProduction();
  const [data, setData] = useState<Awaited<ReturnType<typeof getQuestionnaireVersion>>>();
  const [answers, setAnswers] = useState<Record<string, QuestionnaireResponse['response_value']>>({});
  const [status, setStatus] = useState<string>();
  const [error, setError] = useState<string>();
  useEffect(() => { if (questionnaireVersionId) void getQuestionnaireVersion(questionnaireVersionId).then(setData).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load questionnaire.')); }, [questionnaireVersionId]);
  if (!actorId) return <Frame eyebrow="Student · contextual assessment" title="Questionnaire"><Notice>Sign in with a provisioned student actor to continue.</Notice></Frame>;
  return <Frame eyebrow="Student · contextual assessment" title={data?.version.title ?? 'Questionnaire'}>{error ? <Notice alert>{error}</Notice> : !data || !questionnaireVersionId ? <Notice>Loading questionnaire…</Notice> : <form className="grid gap-5" onSubmit={async (event) => { event.preventDefault(); setError(undefined); const missing = data.questions.find((question) => answers[question.id] == null || (Array.isArray(answers[question.id]) && answers[question.id].length === 0)); if (missing) { setError(`Answer required: ${missing.question_text}`); return; } try { const current = await getStudentSubmission(questionnaireVersionId, actorId, search.get('opportunityId') ?? undefined); let submission = current.submission; if (!submission) submission = await startSubmission(questionnaireVersionId, actorId, search.get('opportunityId') ?? undefined, search.get('opportunityVersionId') ?? undefined); for (const question of data.questions) await saveResponse(submission.id, question.id, answers[question.id]); await submitQuestionnaire(submission.id); setStatus('Submitted. The authoritative result is immutable and context-bound.'); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Submission failed.'); } }}>{status ? <Notice>{status}</Notice> : null}{data.questions.map((question) => <fieldset key={question.id} className="border-2 border-black bg-white p-5"><legend className="px-2 font-black">{question.question_text}</legend>{question.question_type === 'single_choice' ? <div className="grid gap-2">{question.choice_options?.map((option) => <label key={option.value} className="flex min-h-11 items-center gap-3"><input required name={question.id} type="radio" value={option.value} onChange={() => setAnswers((current) => ({ ...current, [question.id]: option.value }))} />{option.label}</label>)}</div> : question.question_type === 'multiple_choice' ? <div className="grid gap-2">{question.choice_options?.map((option) => <label key={option.value} className="flex min-h-11 items-center gap-3"><input type="checkbox" value={option.value} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.checked ? [...((current[question.id] as string[] | undefined) ?? []), option.value] : ((current[question.id] as string[] | undefined) ?? []).filter((value) => value !== option.value) }))} />{option.label}</label>)}</div> : <input required className="min-h-11 w-full border-2 border-black px-3" type={question.question_type === 'numeric' ? 'number' : 'text'} min={question.numeric_min} max={question.numeric_max} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: question.question_type === 'numeric' ? Number(event.target.value) : event.target.value }))} />}</fieldset>)}<p className="text-sm text-black/65">Free text and structured scenarios are not automatically scored. Any result is assessed evidence for its declared context—not universal certification or a hiring decision.</p><button className="min-h-11 border-2 border-black bg-black px-5 py-3 font-mono-ui text-xs font-black uppercase text-white">Submit immutable response</button></form>}</Frame>;
}
