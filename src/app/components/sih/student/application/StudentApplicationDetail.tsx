import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import type { ApplicationReadModel, ApplicationEventReadModel } from '../../../../services/sih/types';
import type { ApplicationStage } from '../../../../domain';

interface Props {
  readonly application: ApplicationReadModel;
  readonly events: readonly ApplicationEventReadModel[];
}

function stageLabel(stage: ApplicationStage): string {
  return stage.replaceAll('_', ' ').toUpperCase();
}

function eventActionLabel(action: string): string {
  return action.replaceAll('_', ' ');
}

export function StudentApplicationDetail({ application, events }: Props) {
  return (
    <div className="space-y-6">
      <div className="border-2 border-black bg-white p-6 shadow-[4px_4px_0_#111]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono-ui text-[10px] font-black uppercase tracking-[0.18em] text-[#d63c1d]">
              Application
            </p>
            <h2 className="mt-1 text-2xl font-black">
              {stageLabel(application.currentStage)}
            </h2>
          </div>
          <span className="border-2 border-black bg-[#e7ff57] px-3 py-2 font-mono-ui text-[10px] font-black uppercase">
            {application.currentStage === 'applied' || application.currentStage === 'under_review' || application.currentStage === 'screening'
              ? 'Active'
              : application.currentStage === 'shortlisted' || application.currentStage === 'offered'
              ? 'Progressing'
              : application.currentStage === 'accepted' || application.currentStage === 'completed'
              ? 'Successful'
              : 'Concluded'}
          </span>
        </div>

        <dl className="mt-6 grid gap-3 border-t-2 border-black pt-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-mono-ui text-[10px] font-bold uppercase text-black/50">
              Application ID
            </dt>
            <dd className="mt-1 break-all font-mono-ui text-xs">{application.id}</dd>
          </div>
          <div>
            <dt className="font-mono-ui text-[10px] font-bold uppercase text-black/50">
              Opportunity Version
            </dt>
            <dd className="mt-1 break-all font-mono-ui text-xs">
              {application.opportunityVersionId}
            </dd>
          </div>
          <div>
            <dt className="font-mono-ui text-[10px] font-bold uppercase text-black/50">
              Submitted At
            </dt>
            <dd className="mt-1">{new Date(application.createdAt).toLocaleString()}</dd>
          </div>
        </dl>

        <div className="mt-4 flex gap-3">
          <Link
            to={`/opportunities/${application.opportunityVersionId}`}
            className="border-2 border-black bg-white px-4 py-2 font-mono-ui text-[10px] font-black uppercase"
          >
            View Opportunity
          </Link>
          <Link
            to="/applications"
            className="border-2 border-black bg-white px-4 py-2 font-mono-ui text-[10px] font-black uppercase"
          >
            All Applications
          </Link>
        </div>
      </div>

      <div className="border-2 border-black bg-white p-6 shadow-[4px_4px_0_#111]">
        <p className="font-mono-ui text-[10px] font-black uppercase tracking-[0.18em] text-[#d63c1d]">
          Application Timeline
        </p>
        <h3 className="mt-2 text-xl font-black">Stage History</h3>
        <p className="mt-2 text-sm leading-relaxed text-black/70">
          This is the append-only event timeline for your application. All stage transitions
          are recorded with timestamps and actor attribution.
        </p>

        {events.length === 0 ? (
          <p className="mt-6 border-2 border-black bg-[#f7f4ed] p-4 text-sm text-black/60">
            No events recorded yet.
          </p>
        ) : (
          <div className="mt-6 space-y-4">
            {events.map((event) => {
              const isTransition = event.eventKind === 'stage_transition';
              const isRejection = event.toStage === 'rejected_by_human';
              return (
                <article
                  key={event.id}
                  className={`border-l-4 pl-4 ${
                    isRejection
                      ? 'border-[#d63c1d] bg-[#fff1ec]'
                      : 'border-black bg-[#f7f4ed]'
                  } p-4`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono-ui text-[10px] font-black uppercase">
                        {eventActionLabel(event.eventKind)}
                      </p>
                      {isTransition && event.fromStage && event.toStage && (
                        <p className="mt-1 text-sm font-bold">
                          {stageLabel(event.fromStage)} → {stageLabel(event.toStage)}
                        </p>
                      )}
                    </div>
                    <span className="font-mono-ui text-[10px] text-black/50">
                      {new Date(event.occurredAt).toLocaleString()}
                    </span>
                  </div>

                  {event.reason && (
                    <div className="mt-3 border-t border-black/20 pt-3">
                      <p className="font-mono-ui text-[9px] font-bold uppercase text-black/50">
                        Reason
                      </p>
                      <p className="mt-1 text-sm">{event.reason}</p>
                    </div>
                  )}

                  {event.note && (
                    <div className="mt-3 border-t border-black/20 pt-3">
                      <p className="font-mono-ui text-[9px] font-bold uppercase text-black/50">
                        Note
                      </p>
                      <p className="mt-1 text-sm">{event.note}</p>
                    </div>
                  )}

                  <dl className="mt-3 grid gap-2 border-t border-black/20 pt-3 text-xs">
                    <div>
                      <dt className="font-mono-ui text-[9px] uppercase text-black/45">
                        Event ID
                      </dt>
                      <dd className="mt-1 break-all font-mono-ui">{event.id}</dd>
                    </div>
                    {event.applicationSnapshotId && (
                      <div>
                        <dt className="font-mono-ui text-[9px] uppercase text-black/45">
                          Snapshot ID
                        </dt>
                        <dd className="mt-1 break-all font-mono-ui">
                          {event.applicationSnapshotId}
                        </dd>
                      </div>
                    )}
                  </dl>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {application.currentStage === 'evidence_requested' && (
        <div className="border-2 border-[#d63c1d] bg-[#fff1ec] p-5">
          <p className="font-mono-ui text-[10px] font-black uppercase tracking-[0.18em] text-[#d63c1d]">
            Action Required
          </p>
          <h3 className="mt-2 text-xl font-black">Additional Evidence Requested</h3>
          <p className="mt-3 text-sm leading-relaxed">
            The recruiter has requested additional evidence or clarification. Review the timeline
            for specific requirements, then navigate to your Evidence page to upload artifacts or
            request verification.
          </p>
          <div className="mt-4 flex gap-3">
            <Link
              to="/evidence"
              className="border-2 border-black bg-[#e7ff57] px-4 py-2 font-mono-ui text-[10px] font-black uppercase"
            >
              Upload Evidence
            </Link>
            <Link
              to="/verification"
              className="border-2 border-black bg-white px-4 py-2 font-mono-ui text-[10px] font-black uppercase"
            >
              Request Verification
            </Link>
          </div>
        </div>
      )}

      {application.currentStage === 'rejected_by_human' && (
        <div className="border-2 border-[#d63c1d] bg-[#fff1ec] p-5">
          <p className="font-mono-ui text-[10px] font-black uppercase tracking-[0.18em] text-[#d63c1d]">
            Application Status
          </p>
          <h3 className="mt-2 text-xl font-black">Application Not Progressing</h3>
          <p className="mt-3 text-sm leading-relaxed">
            This application has been closed by the recruiter. Review the timeline for the stated
            reason and use the feedback to strengthen future applications.
          </p>
        </div>
      )}

      {(application.currentStage === 'shortlisted' || application.currentStage === 'offered') && (
        <div className="border-2 border-black bg-[#e7ff57] p-5">
          <p className="font-mono-ui text-[10px] font-black uppercase tracking-[0.18em] text-[#111]">
            Great News
          </p>
          <h3 className="mt-2 text-xl font-black">
            {application.currentStage === 'shortlisted'
              ? 'You Have Been Shortlisted'
              : 'Offer Extended'}
          </h3>
          <p className="mt-3 text-sm leading-relaxed">
            {application.currentStage === 'shortlisted'
              ? 'Your application has progressed to the shortlist stage. Expect further communication from the recruiter regarding next steps.'
              : 'An offer has been extended. Please review any communication from the recruiter regarding acceptance procedures.'}
          </p>
        </div>
      )}
    </div>
  );
}
