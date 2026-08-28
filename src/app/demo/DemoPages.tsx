import { Link } from 'react-router';
import { EvidenceTimeline } from '../components/demo/EvidenceTimeline';
import Explorer from '../components/sih/student/explorer/Explorer';
import Readiness from '../components/sih/student/readiness/Readiness';
import { EvidenceProvenanceBadge, RequirementEvidenceMatrix } from '../components/demo/RequirementEvidenceMatrix';
import { ReadinessVector } from '../components/demo/ReadinessVector';
import { useDemoSih } from '../context/DemoSihContext';
import { DEMO_IDS } from './demoFixtures';
import { applicationStageLabel } from './demoScenario';

function PageIntro({ eyebrow, title, description }: { readonly eyebrow: string; readonly title: string; readonly description: string }) {
  return (
    <header className="mb-8 max-w-4xl">
      <p className="font-mono-ui text-xs font-black uppercase tracking-[0.2em] text-[#d63c1d]">{eyebrow}</p>
      <h1 className="mt-2 text-4xl font-black leading-[0.95] tracking-[-0.04em] sm:text-6xl">{title}</h1>
      <p className="mt-4 max-w-3xl text-base leading-relaxed text-black/70 sm:text-lg">{description}</p>
    </header>
  );
}

function ActionButton({ children, onClick, disabled = false }: { readonly children: React.ReactNode; readonly onClick: () => void; readonly disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="min-h-12 border-2 border-black bg-[#e7ff57] px-5 py-3 text-left font-mono-ui text-xs font-black uppercase tracking-wide shadow-[4px_4px_0_#111] transition-transform enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-black/10 disabled:text-black/40 disabled:shadow-none focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#ff5c35] motion-reduce:transition-none"
    >
      {children}
    </button>
  );
}

export function DemoOverviewPage() {
  const { state, currentReadiness } = useDemoSih();
  const steps = [
    ['Student evidence', '/demo/student', 'Attach a controlled work sample and inspect deterministic readiness.'],
    ['Mentor verification', '/demo/mentor', 'Append a bounded contextual verification event.'],
    ['Recruiter review', '/demo/recruiter', 'Receive only the consented allowlist and record human events.'],
    ['Institution insight', '/demo/institution', 'Read privacy-protected descriptive aggregates.'],
    ['Faculty collaboration', '/demo/faculty', 'See academia–industry engagements beyond placement.'],
  ] as const;
  return (
    <div>
      <PageIntro
        eyebrow="Controlled causal vertical slice"
        title="Evidence travels. Private guidance does not."
        description="Replay one synthetic AYUSH-relevant opportunity from learner evidence through bounded verification, consented application, human review, recorded outcome and suppressed aggregate insight."
      />
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="border-2 border-black bg-white p-5 shadow-[6px_6px_0_#111]">
          <p className="font-mono-ui text-[10px] font-bold uppercase tracking-[0.18em]">Synthetic opportunity</p>
          <h2 className="mt-2 text-3xl font-black">{state.fixture.opportunityVersion.title}</h2>
          <p className="mt-3 leading-relaxed text-black/70">{state.fixture.opportunityVersion.description}</p>
          <dl className="mt-6 grid gap-px border border-black bg-black sm:grid-cols-3">
            <div className="bg-[#f7f4ed] p-3"><dt className="font-mono-ui text-[10px] uppercase">Required</dt><dd className="mt-1 text-xl font-black">3</dd></div>
            <div className="bg-[#f7f4ed] p-3"><dt className="font-mono-ui text-[10px] uppercase">Preferred</dt><dd className="mt-1 text-xl font-black">1</dd></div>
            <div className="bg-[#f7f4ed] p-3"><dt className="font-mono-ui text-[10px] uppercase">Current band</dt><dd className="mt-1 text-sm font-black">{currentReadiness.readinessBand.replaceAll('_', ' ')}</dd></div>
          </dl>
        </section>
        <section className="border-2 border-black bg-[#111] p-5 text-white">
          <p className="font-mono-ui text-[10px] font-bold uppercase tracking-[0.18em] text-[#e7ff57]">Reference implementation truth</p>
          <ul className="mt-4 grid gap-3 text-sm leading-relaxed text-white/75">
            <li>✓ Synthetic fixtures and predefined identifiers</li>
            <li>✓ In-memory reducer; reload resets everything</li>
            <li>✓ Deterministic Engine B; no model call</li>
            <li>✓ Explicit consent and recruiter allowlist</li>
            <li>✓ Append-only verification and application events</li>
          </ul>
        </section>
      </div>
      <section className="mt-10" aria-labelledby="demo-path-title">
        <h2 id="demo-path-title" className="text-2xl font-black">Choose a controlled view</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {steps.map(([label, to, copy], index) => (
            <Link key={to} to={to} className="group min-h-48 border-2 border-black bg-white p-4 focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#ff5c35]">
              <span className="font-mono-ui text-xs font-black text-[#d63c1d]">0{index + 1}</span>
              <h3 className="mt-6 text-lg font-black group-hover:underline">{label}</h3>
              <p className="mt-2 text-sm leading-relaxed text-black/60">{copy}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export function DemoStudentPage() {
  const { state, currentReadiness, recruiterSharePreview, dispatch } = useDemoSih();
  const hasWorkSample = state.evidenceLedger.some(entry => entry.record.id === DEMO_IDS.evidenceWorkSampleArtifact);
  const hasMentorVerification = state.verificationEvents.some(event => event.id === DEMO_IDS.mentorVerification);
  const hasConsent = state.consentRecords.length > 0;
  return (
    <div>
      <PageIntro
        eyebrow="Student / learner controlled view"
        title="Prove what exists. Preserve what is unknown."
        description="The matrix shows evidence state, not employability or hiring likelihood. Actions append controlled records and retain every earlier result."
      />
            <div className="mt-10">
        <Explorer opportunityVersion={state.fixture.opportunityVersion}/>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="grid gap-8">
          <ReadinessVector result={currentReadiness} />
          <Readiness
  band={currentReadiness.readinessBand}
  requiredCoverage={currentReadiness.requiredCoverage}
  verificationCoverage={currentReadiness.verificationCoverage}
  partialCount={currentReadiness.partialCount}
  gapCount={currentReadiness.gapCount}
  workSamples={currentReadiness.relevantWorkSamples}
/>
          <RequirementEvidenceMatrix readiness={currentReadiness} ledger={state.evidenceLedger} verificationEvents={state.verificationEvents} />
        </div>
        <aside className="grid content-start gap-4" aria-label="Controlled student actions">
          <section className="border-2 border-black bg-white p-4">
            <p className="font-mono-ui text-[10px] font-bold uppercase tracking-wide">Next controlled action</p>
            <h2 className="mt-2 text-xl font-black">Evidence and consent sequence</h2>
            <div className="mt-4 grid gap-3">
              <ActionButton onClick={() => dispatch({ type: 'ATTACH_CONTROLLED_WORK_SAMPLE' })} disabled={hasWorkSample}>
                {hasWorkSample ? 'Controlled work sample attached' : 'Attach controlled work sample'}
              </ActionButton>
              <p className="text-xs leading-relaxed text-black/55">This appends a predefined synthetic record. It is not a file upload.</p>
              {currentReadiness.readinessBand === 'READY_FOR_REVIEW' && (
                <ActionButton onClick={() => dispatch({ type: 'VIEW_RECRUITER_PREVIEW' })} disabled={state.recruiterPreviewViewed}>
                  {state.recruiterPreviewViewed ? 'Recruiter share preview viewed' : 'Preview what the recruiter will receive'}
                </ActionButton>
              )}
              {state.recruiterPreviewViewed && (
                <ActionButton onClick={() => dispatch({ type: 'GRANT_APPLICATION_CONSENT' })} disabled={hasConsent}>
                  {hasConsent ? 'Application review consent granted' : 'Grant application review consent'}
                </ActionButton>
              )}
              <ActionButton onClick={() => dispatch({ type: 'SUBMIT_APPLICATION' })} disabled={!hasConsent || Boolean(state.application)}>
                {state.application ? 'Application submitted' : 'Submit controlled application'}
              </ActionButton>
            </div>
            {!hasMentorVerification && hasWorkSample && (
              <p className="mt-4 border-l-4 border-[#ff5c35] pl-3 text-sm">Continue in the Mentor view to resolve the bounded verification requirement.</p>
            )}
          </section>
          {state.recruiterPreviewViewed && recruiterSharePreview && (
            <section className="border-2 border-black bg-[#fff4c7] p-4" aria-labelledby="share-preview-title">
              <h2 id="share-preview-title" className="text-lg font-black">Recruiter share preview</h2>
              <p className="mt-2 text-sm">Viewing this did not grant consent.</p>
              <dl className="mt-3 grid gap-2 text-sm">
                <div><dt className="font-mono-ui text-[10px] uppercase">Identity</dt><dd>{recruiterSharePreview.applicant.displayName}</dd></div>
                <div><dt className="font-mono-ui text-[10px] uppercase">Readiness reference</dt><dd>{recruiterSharePreview.readinessResultId}</dd></div>
                <div><dt className="font-mono-ui text-[10px] uppercase">Evidence records</dt><dd>{recruiterSharePreview.evidence.length}</dd></div>
                <div><dt className="font-mono-ui text-[10px] uppercase">Work samples</dt><dd>{recruiterSharePreview.sharedWorkSamples.length}</dd></div>
              </dl>
              <p className="mt-3 text-xs leading-relaxed">Private guidance dimensions, family/financial information, guardian data and unrelated accessibility information are excluded.</p>
            </section>
          )}
        </aside>
      </div>
      <div className="mt-10"><EvidenceTimeline events={state.traceEvents} /></div>
    </div>
  );
}

export function DemoMentorPage() {
  const { state, currentReadiness, dispatch } = useDemoSih();
  const requirement = state.fixture.opportunityVersion.requirements.find(item => item.id === DEMO_IDS.requirementAyushStandardization)!;
  const evidence = state.evidenceLedger.find(entry => entry.record.id === DEMO_IDS.evidenceAyushContribution)!;
  const verified = state.verificationEvents.some(event => event.id === DEMO_IDS.mentorVerification);
  const workSampleAttached = state.evidenceLedger.some(entry => entry.record.id === DEMO_IDS.evidenceWorkSampleArtifact);
  return (
    <div>
      <PageIntro
        eyebrow="Mentor / faculty verifier controlled view"
        title="Verify one observed contribution — nothing more."
        description="This attestation is scoped to one requirement in one synthetic opportunity. It is not a universal skill certification or issuer-grade credential."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <section className="border-2 border-black bg-white p-5 shadow-[5px_5px_0_#111]">
          <p className="font-mono-ui text-[10px] font-bold uppercase tracking-wide">Exact requirement wording</p>
          <h2 className="mt-2 text-2xl font-black">{requirement.literalSourceWording}</h2>
          <div className="mt-5 border border-black bg-[#f7f4ed] p-4">
            <h3 className="font-bold">Student evidence under review</h3>
            <p className="mt-2 text-sm leading-relaxed">{evidence.record.literalClaim}</p>
            <div className="mt-3"><EvidenceProvenanceBadge provenance={evidence.record.provenance} verification={verified ? 'human_verified' : evidence.record.verificationState} /></div>
            <p className="mt-3 font-mono-ui text-[10px]">Artifacts directly on this record: {evidence.record.artifacts.length}. Related controlled work-sample context: {workSampleAttached ? 'attached' : 'not yet attached'}.</p>
          </div>
          <div className="mt-5 border-l-4 border-[#ff5c35] pl-4">
            <h3 className="font-bold">Precise attestation scope</h3>
            <p className="mt-1 text-sm leading-relaxed">Observed contribution during the controlled supervised terminology exercise, bounded to requirement {requirement.id}. It does not verify unrelated evidence or global mastery.</p>
          </div>
          <div className="mt-6">
            <ActionButton onClick={() => dispatch({ type: 'VERIFY_OBSERVED_CONTRIBUTION' })} disabled={!workSampleAttached || verified}>
              {verified ? 'Observed contribution verified' : 'Verify observed contribution'}
            </ActionButton>
            {!workSampleAttached && <p className="mt-3 text-sm text-black/55">The controlled student must attach the work sample first.</p>}
          </div>
        </section>
        <div className="grid content-start gap-6">
          <ReadinessVector result={currentReadiness} />
          <section className="border-2 border-black bg-[#111] p-5 text-white">
            <h2 className="text-xl font-black">Append-only guarantee</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/70">The action appends a VerificationEvent. The self-reported provenance remains self-reported; Engine B derives the independent human_verified state from scoped history.</p>
            <p className="mt-4 font-mono-ui text-xs text-[#e7ff57]">Verification events: {state.verificationEvents.length}</p>
          </section>
        </div>
      </div>
      <div className="mt-10"><EvidenceTimeline events={state.traceEvents} /></div>
    </div>
  );
}

export function DemoRecruiterPage() {
  const { state, recruiterProjection, dispatch } = useDemoSih();
  return (
    <div>
      <PageIntro
        eyebrow="Recruiter / industry reviewer controlled view"
        title="Purpose-limited review. Human-triggered decisions."
        description="No candidate payload appears until explicit student consent and submission. This view has no ranking, automatic shortlist, rejection automation or hiring prediction."
      />
      {!recruiterProjection || !state.application ? (
        <section className="border-2 border-dashed border-black bg-white p-8 text-center">
          <h2 className="text-2xl font-black">No candidate application received</h2>
          <p className="mx-auto mt-3 max-w-xl text-black/65">Complete readiness, view the recruiter-share preview, grant application_review consent and submit from the Student view.</p>
          <Link to="/demo/student" className="mt-5 inline-flex min-h-11 items-center border-2 border-black bg-[#e7ff57] px-4 font-mono-ui text-xs font-black uppercase">Go to student view</Link>
        </section>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
          <section className="border-2 border-black bg-white p-5">
            <div className="flex flex-col gap-4 border-b-2 border-black pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-mono-ui text-[10px] font-bold uppercase">Consented application projection</p>
                <h2 className="mt-1 text-3xl font-black">{recruiterProjection.applicant.displayName}</h2>
                <p className="mt-2 text-sm text-black/60">{recruiterProjection.educationSummary}</p>
              </div>
              <span className="w-fit border-2 border-black bg-[#e7ff57] px-3 py-2 font-mono-ui text-xs font-black uppercase">{applicationStageLabel(recruiterProjection.applicationStage)}</span>
            </div>
            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              <div><dt className="font-mono-ui text-[10px] uppercase">Immutable snapshot</dt><dd className="break-all text-sm font-bold">{recruiterProjection.applicationSnapshotId}</dd></div>
              <div><dt className="font-mono-ui text-[10px] uppercase">Submitted readiness</dt><dd className="break-all text-sm font-bold">{recruiterProjection.readinessResultId}</dd></div>
              <div><dt className="font-mono-ui text-[10px] uppercase">Band at submission</dt><dd className="text-sm font-bold">{recruiterProjection.readinessBand.replaceAll('_', ' ')}</dd></div>
              <div><dt className="font-mono-ui text-[10px] uppercase">Purpose consent</dt><dd className="break-all text-sm font-bold">{recruiterProjection.consentRecordId}</dd></div>
            </dl>
            <h3 className="mt-7 text-xl font-black">Shared requirement states</h3>
            <div className="mt-3 grid gap-2">
              {recruiterProjection.requirements.map(item => (
                <div key={item.requirementId} className="border border-black/30 bg-[#f7f4ed] p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-between"><p className="font-semibold">{item.literalSourceWording}</p><strong className="font-mono-ui text-xs">{item.state.replaceAll('_', ' ')}</strong></div>
                  <p className="mt-2 font-mono-ui text-[10px]">{item.priority} · {item.supportingEvidenceIds.length} shared evidence reference(s)</p>
                </div>
              ))}
            </div>
            <h3 className="mt-7 text-xl font-black">Explicitly consented evidence</h3>
            <div className="mt-3 grid gap-2">
              {recruiterProjection.evidence.map(item => (
                <div key={item.evidenceRecordId} className="border border-black/30 p-3">
                  <p className="text-sm font-semibold">{item.literalClaim}</p>
                  <div className="mt-2"><EvidenceProvenanceBadge provenance={item.provenance} verification={item.verificationState} /></div>
                </div>
              ))}
            </div>
          </section>
          <aside className="grid content-start gap-4">
            <section className="border-2 border-black bg-[#fff4c7] p-4">
              <h2 className="text-xl font-black">Human review actions</h2>
              <div className="mt-4 grid gap-3">
                <ActionButton onClick={() => dispatch({ type: 'START_HUMAN_REVIEW' })} disabled={state.application.currentStage !== 'applied'}>Start human review</ActionButton>
                <ActionButton onClick={() => dispatch({ type: 'SHORTLIST_APPLICATION' })} disabled={state.application.currentStage !== 'under_review'}>Record human shortlist</ActionButton>
                <ActionButton onClick={() => dispatch({ type: 'RECORD_SELECTED_OUTCOME' })} disabled={state.application.currentStage !== 'shortlisted' || state.outcomeEvents.length > 0}>{state.outcomeEvents.length ? 'Selected outcome recorded' : 'Record controlled selected outcome'}</ActionButton>
              </div>
            </section>
            <section className="border-2 border-black bg-[#111] p-4 text-white">
              <h2 className="font-black">Attributable events</h2>
              <ol className="mt-3 grid gap-2 text-sm text-white/70">
                {state.applicationEvents.map(event => <li key={event.id}>{event.fromStage ?? 'created'} → {event.toStage} · actor {event.actorId}</li>)}
              </ol>
              <p className="mt-4 text-xs text-[#e7ff57]">Recorded outcomes: {state.outcomeEvents.length}. No causal claim is made.</p>
            </section>
          </aside>
        </div>
      )}
      <div className="mt-10"><EvidenceTimeline events={state.traceEvents} /></div>
    </div>
  );
}

export function DemoInstitutionPage() {
  const { state, institutionAnalytics } = useDemoSih();
  const points = institutionAnalytics.points;
  return (
    <div>
      <PageIntro
        eyebrow="Institution / T&P controlled view"
        title="Aggregate signals without private guidance profiles."
        description="A deterministic cohort of 13 synthetic learners demonstrates minimum-cohort suppression and descriptive insight. No individual RIASEC, values, aspirations or private constraints are present."
      />
      <section className="border-2 border-black bg-white p-5 shadow-[5px_5px_0_#111]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="font-mono-ui text-[10px] font-bold uppercase">Methodology</p><h2 className="text-2xl font-black">Privacy-protected aggregate snapshot</h2></div>
          <p className="font-mono-ui text-xs">Minimum cohort: {institutionAnalytics.query.minimumCohortSize} · synthetic cohort: 13</p>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {points.filter(point => point.metric !== 'readiness_distribution').map((point, index) => (
            <article key={`${point.metric}-${index}`} className="border-2 border-black bg-[#f7f4ed] p-4">
              <p className="font-mono-ui text-[10px] font-bold uppercase">{point.metric.replaceAll('_', ' ')}</p>
              <p className="mt-3 text-3xl font-black">{point.suppressed ? 'Suppressed' : point.value}</p>
              <p className="mt-2 text-xs leading-relaxed text-black/55">{Object.values(point.dimensions).join(' · ')} · descriptive only</p>
            </article>
          ))}
        </div>
        <h3 className="mt-7 text-xl font-black">Readiness distribution</h3>
        <div className="mt-3 grid gap-px border border-black bg-black sm:grid-cols-5">
          {points.filter(point => point.metric === 'readiness_distribution').map(point => (
            <div key={point.dimensions.readiness_band} className="bg-white p-3"><p className="font-mono-ui text-[9px] uppercase">{point.dimensions.readiness_band?.replaceAll('_', ' ')}</p><p className="mt-2 text-2xl font-black">{point.suppressed ? '—' : point.value}</p></div>
          ))}
        </div>
        <p className="mt-5 border-l-4 border-[#ff5c35] pl-3 text-sm leading-relaxed">The recorded selected-outcome count is descriptive. This view does not claim mentor verification or readiness caused selection.</p>
      </section>
      <section className="mt-8 border-2 border-black bg-[#111] p-5 text-white">
        <h2 className="text-xl font-black">Current controlled trace contribution</h2>
        <p className="mt-2 text-sm text-white/70">Readiness: {state.readinessHistory.at(-1)?.readinessBand.replaceAll('_', ' ')} · Application: {state.application?.currentStage.replaceAll('_', ' ') ?? 'not submitted'} · Selected outcomes recorded: {state.outcomeEvents.length}</p>
      </section>
    </div>
  );
}

export function DemoFacultyPage() {
  const { state } = useDemoSih();
  return (
    <div>
      <PageIntro
        eyebrow="Faculty / academia controlled view"
        title="Collaboration is a first-class product surface."
        description="These synthetic engagements use the shared CollaborationEngagement contract. Faculty participation includes research, development and workshops—not only student verification."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {state.fixture.collaborations.map(engagement => (
          <article key={engagement.id} className="flex min-h-72 flex-col border-2 border-black bg-white p-5 shadow-[4px_4px_0_#111]">
            <div className="flex items-start justify-between gap-3">
              <span className="font-mono-ui text-[10px] font-black uppercase tracking-wide text-[#d63c1d]">{engagement.kind.replaceAll('_', ' ')}</span>
              <span className="border border-black bg-[#e7ff57] px-2 py-1 font-mono-ui text-[9px] font-bold uppercase">{engagement.status}</span>
            </div>
            <h2 className="mt-6 text-2xl font-black">{engagement.objectives[0]}</h2>
            <ul className="mt-4 grid gap-2 text-sm text-black/65">{engagement.objectives.slice(1).map(objective => <li key={objective}>→ {objective}</li>)}</ul>
            <dl className="mt-auto grid gap-2 border-t border-black/20 pt-4 font-mono-ui text-[10px]">
              <div><dt className="uppercase text-black/45">Partners</dt><dd>{engagement.partnerOrganizationIds.length}</dd></div>
              <div><dt className="uppercase text-black/45">Participants</dt><dd>{engagement.participantActorIds.length} controlled persona(s)</dd></div>
            </dl>
          </article>
        ))}
      </div>
      <section className="mt-8 border-2 border-black bg-[#fff4c7] p-5">
        <h2 className="text-xl font-black">Shared-domain proof</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed">Collaborative research, a faculty development program and a workshop are represented as canonical engagements between the controlled educational institution and controlled industry partner. No live institution integration is claimed.</p>
      </section>
    </div>
  );
}
