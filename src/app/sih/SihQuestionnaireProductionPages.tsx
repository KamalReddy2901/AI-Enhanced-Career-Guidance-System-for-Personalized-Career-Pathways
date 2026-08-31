import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { QuestionnaireAuthoringForm } from "../components/questionnaire/QuestionnaireAuthoringForm";
import {
  createQuestionnaire,
  createQuestionnaireSuccessor,
  assignQuestionnaireToOpportunity,
  getQuestionnaireVersion,
  getStudentSubmission,
  getSubmissionResponses,
  listOrganizationQuestionnaires,
  listDraftOpportunityVersionsForQuestionnaire,
  listQuestionnaireSubmissions,
  publishQuestionnaireVersion,
  saveResponse,
  startSubmission,
  submitQuestionnaire,
  updateQuestionnaireDraft,
} from "../services/questionnaireDb";
import type {
  QuestionnaireFormData,
  QuestionnaireResponse,
} from "../types/questionnaire";
import { useSihProduction } from "./SihProductionContext";

const AUTHOR_ROLES = new Set([
  "recruiter",
  "industry_partner",
  "institution_admin",
]);

function Frame({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <p className="font-mono-ui text-[10px] font-black uppercase tracking-[.2em] text-[var(--accent-news)]">
        {eyebrow}
      </p>
      <h1 className="mt-2 text-4xl font-black tracking-tight">{title}</h1>
      <div className="mt-8">{children}</div>
    </main>
  );
}

function Notice({
  children,
  alert = false,
}: {
  children: ReactNode;
  alert?: boolean;
}) {
  return (
    <div
      role={alert ? "alert" : "status"}
      className="border-2 border-black bg-white p-5 text-sm shadow-[4px_4px_0_#111]"
    >
      {children}
    </div>
  );
}

function answerIsMissing(
  value: QuestionnaireResponse["response_value"] | undefined,
): boolean {
  return value == null || (Array.isArray(value) && value.length === 0);
}

export function IndustryQuestionnairesPage() {
  const { memberships, loading, actorId } = useSihProduction();
  const authorized = useMemo(
    () =>
      memberships.filter((item) =>
        item.roles.some((role) => AUTHOR_ROLES.has(role)),
      ),
    [memberships],
  );
  const [rows, setRows] = useState<
    Awaited<ReturnType<typeof listOrganizationQuestionnaires>>
  >([]);
  const [error, setError] = useState<string>();
  useEffect(() => {
    if (!actorId || authorized.length === 0) return;
    let active = true;
    Promise.all(
      authorized.map((item) =>
        listOrganizationQuestionnaires(item.organizationId),
      ),
    )
      .then((groups) => {
        if (active) setRows(groups.flat());
      })
      .catch((reason) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Unable to load questionnaires.",
          );
      });
    return () => {
      active = false;
    };
  }, [actorId, authorized]);

  return (
    <Frame eyebrow="Industry · contextual assessment" title="Questionnaires">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-2 border-black bg-[#fff4c7] p-5">
        <p className="max-w-2xl text-sm">
          Questionnaires are human-published, versioned and context-bound.
          Results are assessed evidence—not hiring probability or automatic
          rejection.
        </p>
        <Link
          className="min-h-11 border-2 border-black bg-black px-5 py-3 font-mono-ui text-xs font-black uppercase text-white"
          to="/industry/questionnaires/new"
        >
          New questionnaire
        </Link>
      </div>
      {loading ? (
        <Notice>Loading organization authority…</Notice>
      ) : error ? (
        <Notice alert>{error}</Notice>
      ) : authorized.length === 0 ? (
        <Notice>
          No questionnaire-authoring role is active for this account.
        </Notice>
      ) : rows.length === 0 ? (
        <Notice>
          No questionnaires have been authored for your organizations.
        </Notice>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((row) => (
            <article
              key={row.id}
              className="border-2 border-black bg-white p-5 shadow-[4px_4px_0_#111]"
            >
              <p className="font-mono-ui text-[10px] font-black uppercase text-[var(--accent-news)]">
                {row.status}
              </p>
              <h2 className="mt-2 text-xl font-black">
                {row.current_version?.title ?? "Untitled draft"}
              </h2>
              <p className="mt-2 text-sm text-black/65">
                {row.current_version?.description}
              </p>
              {row.current_version ? (
                <Link
                  className="mt-4 inline-flex min-h-11 items-center underline"
                  to={`/industry/questionnaires/${row.current_version.id}`}
                >
                  Review version
                </Link>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </Frame>
  );
}

export function IndustryNewQuestionnairePage() {
  const { memberships } = useSihProduction();
  const navigate = useNavigate();
  const authorized = memberships.filter((item) =>
    item.roles.some((role) => AUTHOR_ROLES.has(role)),
  );
  const [organizationId, setOrganizationId] = useState<string>(
    authorized[0]?.organizationId ?? "",
  );
  useEffect(() => {
    if (!organizationId && authorized[0])
      setOrganizationId(authorized[0].organizationId);
  }, [authorized, organizationId]);
  return (
    <Frame eyebrow="Explicit human authoring" title="Create questionnaire">
      {authorized.length === 0 ? (
        <Notice>No authoring organization is available.</Notice>
      ) : (
        <>
          <label
            htmlFor="questionnaire-organization"
            className="mb-2 block text-sm font-black"
          >
            Authoring organization
          </label>
          <select
            id="questionnaire-organization"
            className="mb-6 min-h-11 w-full border-2 border-black bg-white px-3"
            value={organizationId}
            onChange={(event) => setOrganizationId(event.target.value)}
          >
            {authorized.map((item) => (
              <option key={item.organizationId} value={item.organizationId}>
                {item.organizationName}
              </option>
            ))}
          </select>
          <QuestionnaireAuthoringForm
            onCancel={() => navigate("/industry/questionnaires")}
            onSubmit={async (data: QuestionnaireFormData) => {
              await createQuestionnaire(data, organizationId);
              navigate("/industry/questionnaires");
            }}
          />
        </>
      )}
    </Frame>
  );
}

export function IndustryQuestionnaireReviewPage() {
  const navigate = useNavigate();
  const { questionnaireVersionId } = useParams();
  const [data, setData] =
    useState<Awaited<ReturnType<typeof getQuestionnaireVersion>>>();
  const [error, setError] = useState<string>();
  const [publishing, setPublishing] = useState(false);
  const [revising, setRevising] = useState(false);
  const [draftOpportunities, setDraftOpportunities] = useState<Array<{ id: string; title: string; versionNumber: number }>>([]);
  const [selectedOpportunityVersionId, setSelectedOpportunityVersionId] = useState("");
  const [attaching, setAttaching] = useState(false);
  const [attachmentStatus, setAttachmentStatus] = useState<string>();
  const [submissions, setSubmissions] = useState<Awaited<ReturnType<typeof listQuestionnaireSubmissions>>>([]);
  useEffect(() => {
    if (questionnaireVersionId)
      void getQuestionnaireVersion(questionnaireVersionId)
        .then(setData)
        .catch((reason) =>
          setError(
            reason instanceof Error
              ? reason.message
              : "Unable to load questionnaire.",
          ),
        );
  }, [questionnaireVersionId]);
  useEffect(() => {
    if (!data || data.version.status !== "published") return;
    void listDraftOpportunityVersionsForQuestionnaire(data.version.questionnaire_id)
      .then((rows) => {
        setDraftOpportunities(rows);
        setSelectedOpportunityVersionId((current) => current || rows[0]?.id || "");
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load draft opportunities."));
  }, [data?.version.id, data?.version.status, data?.version.questionnaire_id]);
  useEffect(() => {
    if (!data || data.version.status !== "published") return;
    void listQuestionnaireSubmissions(data.version.id)
      .then((rows) => setSubmissions(rows.filter((row) => row.submitted_at !== null)))
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load authorized results."));
  }, [data?.version.id, data?.version.status]);
  return (
    <Frame
      eyebrow="Review · explicit publication"
      title={data?.version.title ?? "Questionnaire review"}
    >
      {error ? (
        <Notice alert>{error}</Notice>
      ) : !data ? (
        <Notice>Loading questionnaire…</Notice>
      ) : (
        <div className="grid gap-5">
          {data.version.status === "draft" ? (
            <QuestionnaireAuthoringForm
              heading={`Edit draft version ${data.version.version_number}`}
              submitLabel="Save exact draft"
              initialData={{
                title: data.version.title,
                description: data.version.description,
                scope_declaration: data.version.scope_declaration,
                scoring_policy: data.version.scoring_policy ?? undefined,
                questions: data.questions.map((question) => ({
                  question_type: question.question_type,
                  question_text: question.question_text,
                  choice_options: question.choice_options,
                  numeric_min: question.numeric_min,
                  numeric_max: question.numeric_max,
                  skill_refs: question.skill_refs,
                  scoring_weight: question.scoring_weight,
                })),
              }}
              onCancel={() => navigate("/industry/questionnaires")}
              onSubmit={async (formData) => {
                await updateQuestionnaireDraft(data.version.id, formData);
                setData(await getQuestionnaireVersion(data.version.id));
              }}
            />
          ) : null}
          <Notice>{data.version.description}</Notice>
          <ol className="grid gap-3">
            {data.questions.map((question) => (
              <li
                key={question.id}
                className="border-2 border-black bg-white p-4"
              >
                <span className="font-mono-ui text-[10px] font-black uppercase">
                  {question.question_type.replaceAll("_", " ")}
                </span>
                <p className="mt-2 font-bold">{question.question_text}</p>
              </li>
            ))}
          </ol>
          {data.version.status === "draft" ? (
            <button
              disabled={publishing}
              className="min-h-11 border-2 border-black bg-[var(--accent-news)] px-5 py-3 font-mono-ui text-xs font-black uppercase text-white disabled:opacity-50"
              onClick={async () => {
                setPublishing(true);
                try {
                  await publishQuestionnaireVersion(data.version.id);
                  setData(await getQuestionnaireVersion(data.version.id));
                } catch (reason) {
                  setError(
                    reason instanceof Error
                      ? reason.message
                      : "Publication failed.",
                  );
                } finally {
                  setPublishing(false);
                }
              }}
            >
              {publishing ? "Publishing…" : "Publish this exact version"}
            </button>
          ) : (
            <>
              <Notice>
                Published content is immutable. A revision uses a successor
                draft while this version stays live.
              </Notice>
              <button
                disabled={revising}
                className="min-h-11 border-2 border-black bg-black px-5 py-3 font-mono-ui text-xs font-black uppercase text-white disabled:opacity-50"
                onClick={async () => {
                  setRevising(true);
                  setError(undefined);
                  try {
                    const successor = await createQuestionnaireSuccessor(data.version.id);
                    navigate(`/industry/questionnaires/${successor.successorVersionId}`);
                  } catch (reason) {
                    setError(reason instanceof Error ? reason.message : "Unable to create successor draft.");
                  } finally {
                    setRevising(false);
                  }
                }}
              >
                {revising ? "Creating successor…" : "Create successor revision"}
              </button>
              <section className="border-2 border-black bg-[#fff4c7] p-5" aria-labelledby="attach-questionnaire-title">
                <h2 id="attach-questionnaire-title" className="text-xl font-black">Attach this exact version</h2>
                <p className="mt-2 text-sm text-black/65">
                  Attachment is allowed only to a draft opportunity owned by the same organization. Publishing a successor will not rewrite this binding.
                </p>
                {attachmentStatus ? <p role="status" className="mt-3 text-sm font-bold">{attachmentStatus}</p> : null}
                {draftOpportunities.length === 0 ? (
                  <p className="mt-3 text-sm">No attachable draft opportunity versions are available.</p>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-3">
                    <label className="sr-only" htmlFor="questionnaire-opportunity-version">Draft opportunity version</label>
                    <select
                      id="questionnaire-opportunity-version"
                      className="min-h-11 flex-1 border-2 border-black bg-white px-3"
                      value={selectedOpportunityVersionId}
                      onChange={(event) => setSelectedOpportunityVersionId(event.target.value)}
                    >
                      {draftOpportunities.map((opportunity) => (
                        <option key={opportunity.id} value={opportunity.id}>
                          {opportunity.title} · draft v{opportunity.versionNumber}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={attaching || !selectedOpportunityVersionId}
                      className="min-h-11 border-2 border-black bg-[#e7ff57] px-5 font-mono-ui text-xs font-black uppercase disabled:opacity-50"
                      onClick={async () => {
                        setAttaching(true);
                        setError(undefined);
                        try {
                          await assignQuestionnaireToOpportunity(selectedOpportunityVersionId, data.version.id, true, 0);
                          setAttachmentStatus("Exact questionnaire version attached to the draft opportunity.");
                        } catch (reason) {
                          setError(reason instanceof Error ? reason.message : "Attachment failed.");
                        } finally {
                          setAttaching(false);
                        }
                      }}
                    >
                      {attaching ? "Attaching…" : "Attach exact version"}
                    </button>
                  </div>
                )}
              </section>
              <section className="border-2 border-black bg-white p-5" aria-labelledby="questionnaire-results-title">
                <h2 id="questionnaire-results-title" className="text-xl font-black">Authorized submitted results</h2>
                <p className="mt-2 text-sm text-black/65">Only submissions visible through organization-scoped RLS appear here. Scores are contextual assessment results, never applicant rankings or hiring recommendations.</p>
                {submissions.length === 0 ? (
                  <p className="mt-4 text-sm">No submitted results are visible for this exact version.</p>
                ) : (
                  <ul className="mt-4 grid gap-3">
                    {submissions.map((submission) => (
                      <SubmissionCard key={submission.id} submission={submission} />
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      )}
    </Frame>
  );
}

export function StudentQuestionnairePage() {
  const { questionnaireVersionId } = useParams();
  const [search] = useSearchParams();
  const { actorId } = useSihProduction();
  const [data, setData] =
    useState<Awaited<ReturnType<typeof getQuestionnaireVersion>>>();
  const [answers, setAnswers] = useState<
    Record<string, QuestionnaireResponse["response_value"]>
  >({});
  const [status, setStatus] = useState<string>();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string>();
  useEffect(() => {
    if (questionnaireVersionId)
      void getQuestionnaireVersion(questionnaireVersionId)
        .then(setData)
        .catch((reason) =>
          setError(
            reason instanceof Error
              ? reason.message
              : "Unable to load questionnaire.",
          ),
        );
  }, [questionnaireVersionId]);
  useEffect(() => {
    if (!actorId || !questionnaireVersionId) return;
    void getStudentSubmission(questionnaireVersionId, actorId, search.get("opportunityId") ?? undefined)
      .then(({ submission, responses }) => {
        setAnswers(Object.fromEntries(responses.map((response) => [response.question_id, response.response_value])));
        if (submission?.submitted_at) {
          setSubmitted(true);
          setStatus(submission.computed_score == null
            ? "Submitted and immutable. This questionnaire contains responses requiring authorized manual review; no automatic suitability judgment was produced."
            : `Submitted and immutable. Deterministic contextual score: ${submission.computed_score}. This is assessed evidence, not a hiring decision.`);
        }
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to restore questionnaire progress."));
  }, [actorId, questionnaireVersionId, search]);
  if (!actorId)
    return (
      <Frame eyebrow="Student · contextual assessment" title="Questionnaire">
        <Notice>Sign in with a provisioned student actor to continue.</Notice>
      </Frame>
    );
  return (
    <Frame
      eyebrow="Student · contextual assessment"
      title={data?.version.title ?? "Questionnaire"}
    >
      {error ? (
        <Notice alert>{error}</Notice>
      ) : !data || !questionnaireVersionId ? (
        <Notice>Loading questionnaire…</Notice>
      ) : (
        <form
          className="grid gap-5"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(undefined);
            const missing = data.questions.find(
              (question) => answerIsMissing(answers[question.id]),
            );
            if (missing) {
              setError(`Answer required: ${missing.question_text}`);
              return;
            }
            try {
              const current = await getStudentSubmission(
                questionnaireVersionId,
                actorId,
                search.get("opportunityId") ?? undefined,
              );
              let submission = current.submission;
              if (!submission)
                submission = await startSubmission(
                  questionnaireVersionId,
                  actorId,
                  search.get("opportunityId") ?? undefined,
                  search.get("opportunityVersionId") ?? undefined,
                );
              for (const question of data.questions)
                await saveResponse(
                  submission.id,
                  question.id,
                  answers[question.id],
                );
              const finalized = await submitQuestionnaire(submission.id);
              setSubmitted(true);
              setStatus(finalized.computed_score == null
                ? "Submitted and immutable. Unscored responses require authorized manual review; no automatic suitability judgment was produced."
                : `Submitted and immutable. Deterministic contextual score: ${finalized.computed_score}. This is assessed evidence, not a hiring decision.`);
            } catch (reason) {
              setError(
                reason instanceof Error ? reason.message : "Submission failed.",
              );
            }
          }}
        >
          {status ? <Notice>{status}</Notice> : null}
          <fieldset disabled={submitted} className="contents">
          {data.questions.map((question) => (
            <fieldset
              key={question.id}
              className="border-2 border-black bg-white p-5"
            >
              <legend className="px-2 font-black">
                {question.question_text}
              </legend>
              {question.question_type === "single_choice" ? (
                <div className="grid gap-2">
                  {question.choice_options?.map((option) => (
                    <label
                      key={option.value}
                      className="flex min-h-11 items-center gap-3"
                    >
                      <input
                        required
                        name={question.id}
                        type="radio"
                        value={option.value}
                        onChange={() =>
                          setAnswers((current) => ({
                            ...current,
                            [question.id]: option.value,
                          }))
                        }
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              ) : question.question_type === "multiple_choice" ? (
                <div className="grid gap-2">
                  {question.choice_options?.map((option) => (
                    <label
                      key={option.value}
                      className="flex min-h-11 items-center gap-3"
                    >
                      <input
                        type="checkbox"
                        value={option.value}
                        onChange={(event) =>
                          setAnswers((current) => ({
                            ...current,
                            [question.id]: event.target.checked
                              ? [
                                  ...((current[question.id] as
                                    string[] | undefined) ?? []),
                                  option.value,
                                ]
                              : (
                                  (current[question.id] as
                                    string[] | undefined) ?? []
                                ).filter((value) => value !== option.value),
                          }))
                        }
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              ) : (
                <input
                  required
                  className="min-h-11 w-full border-2 border-black px-3"
                  type={
                    question.question_type === "numeric" ? "number" : "text"
                  }
                  min={question.numeric_min}
                  max={question.numeric_max}
                  onChange={(event) =>
                    setAnswers((current) => ({
                      ...current,
                      [question.id]:
                        question.question_type === "numeric"
                          ? Number(event.target.value)
                          : event.target.value,
                    }))
                  }
                />
              )}
            </fieldset>
          ))}
          </fieldset>
          <p className="text-sm text-black/65">
            Free text and structured scenarios are not automatically scored. Any
            result is assessed evidence for its declared context—not universal
            certification or a hiring decision.
          </p>
          <button disabled={submitted} className="min-h-11 border-2 border-black bg-black px-5 py-3 font-mono-ui text-xs font-black uppercase text-white disabled:opacity-50">
            {submitted ? "Response submitted" : "Submit immutable response"}
          </button>
        </form>
      )}
    </Frame>
  );
}

/**
 * Expandable submission card with detailed response viewing for recruiters.
 */
function SubmissionCard({
  submission,
}: {
  submission: Awaited<ReturnType<typeof listQuestionnaireSubmissions>>[0];
}) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getSubmissionResponses>>>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const loadDetail = async () => {
    if (detail) {
      setExpanded(!expanded);
      return;
    }
    setLoading(true);
    setError(undefined);
    try {
      const data = await getSubmissionResponses(submission.id);
      setDetail(data);
      setExpanded(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load responses.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <li className="border-2 border-black bg-[#f7f4ed] p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="font-bold">{submission.respondent?.display_name ?? "Authorized respondent"}</p>
          <p className="mt-1 text-sm">
            {submission.computed_score == null
              ? "Submitted · manual review required for unscored responses"
              : `Deterministic contextual score: ${submission.computed_score}`}
          </p>
          <p className="mt-1 font-mono-ui text-[10px] uppercase text-black/55">
            Submitted {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : ""}
          </p>
        </div>
        <button
          type="button"
          className="min-h-11 border-2 border-black bg-white px-4 font-mono-ui text-xs font-black uppercase disabled:opacity-50"
          disabled={loading}
          onClick={loadDetail}
        >
          {loading ? "Loading…" : expanded ? "Collapse" : "View responses"}
        </button>
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-[var(--accent-news)]">
          {error}
        </p>
      ) : null}
      {expanded && detail ? (
        <div className="mt-4 grid gap-3 border-t-2 border-black pt-4">
          <p className="text-xs font-black uppercase text-black/65">Individual responses</p>
          {detail.responses.length === 0 ? (
            <p className="text-sm">No responses recorded.</p>
          ) : (
            detail.responses.map((response) => {
              const isScored = response.question.scoring_weight != null;
              const isFreeText = response.question.question_type === "text";
              const isScenario = response.question.question_type === "structured_scenario";
              const requiresManualReview = isFreeText || isScenario;

              return (
                <article
                  key={response.id}
                  className="border-2 border-black bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="flex-1 font-bold">{response.question.question_text}</p>
                    <span className="whitespace-nowrap font-mono-ui text-[10px] font-black uppercase text-black/55">
                      {requiresManualReview ? "Manual review" : isScored ? "Scored" : "Not scored"}
                    </span>
                  </div>
                  <div className="mt-2 border-l-2 border-black pl-3">
                    {Array.isArray(response.response_value) ? (
                      <ul className="list-inside list-disc text-sm">
                        {(response.response_value as string[]).map((value, idx) => (
                          <li key={idx}>{value}</li>
                        ))}
                      </ul>
                    ) : typeof response.response_value === "object" ? (
                      <pre className="text-sm">{JSON.stringify(response.response_value, null, 2)}</pre>
                    ) : (
                      <p className="text-sm">{String(response.response_value)}</p>
                    )}
                  </div>
                  {response.response_score != null ? (
                    <p className="mt-2 font-mono-ui text-xs text-black/65">
                      Response score: {response.response_score}
                    </p>
                  ) : null}
                </article>
              );
            })
          )}
        </div>
      ) : null}
    </li>
  );
}
