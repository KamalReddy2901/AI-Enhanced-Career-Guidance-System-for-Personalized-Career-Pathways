import type {
  ProductionRecruiterProjection,
  ProductionRecruiterRequirementItem,
  ProductionRecruiterEvidenceItem,
  ProductionRecruiterWorkSample,
} from '../../../services/sih/productionRecruiterProjection';
import type { EvidenceRecordId } from '../../../domain';
import ReadinessBandExplanation from './ReadinessBandExplanation';

interface Props {
  readonly projection: ProductionRecruiterProjection | 'unavailable';
}

export default function ApplicationDetailView({ projection }: Props) {
  if (projection === 'unavailable') {
    return (
      <div className="border-2 border-black bg-[#f7f4ed] p-6 shadow-[4px_4px_0_#111]">
        <h2 className="mb-2 font-mono-ui text-sm font-black uppercase text-[#d63c1d]">
          Projection Unavailable
        </h2>
        <p className="text-sm text-black/70">
          The requested recruiter projection is not available or you are not authorized to view it.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-2 border-black bg-white p-6 shadow-[4px_4px_0_#111]">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight">
              {projection.applicant.displayName}
            </h2>
            <p className="font-mono-ui text-[11px] font-black uppercase text-[#d63c1d]">
              Application Snapshot ID: {projection.applicationSnapshotId.substring(0, 8)}...
            </p>
          </div>
          <span className="bg-black px-3 py-1 font-mono-ui text-[10px] font-black uppercase text-[#e7ff57]">
            {projection.applicationStage.replace('_', ' ')}
          </span>
        </div>

        <ReadinessBandExplanation band={projection.readinessBand} />

        <div className="mt-6 border-t-2 border-black pt-4">
          <h3 className="mb-2 font-mono-ui text-[11px] font-black uppercase text-[#d63c1d]">
            Education Summary
          </h3>
          <p className="text-sm">{projection.educationSummary}</p>
        </div>
      </div>

      <div className="border-2 border-black bg-white p-6 shadow-[4px_4px_0_#111]">
        <h3 className="mb-4 font-mono-ui text-[11px] font-black uppercase text-[#d63c1d]">
          Requirements Assessment
        </h3>
        
        {projection.requirements.length === 0 ? (
          <p className="text-sm text-black/60">No requirements found.</p>
        ) : (
          <div className="grid gap-4">
            {projection.requirements.map((req: ProductionRecruiterRequirementItem) => (
              <div key={req.requirementId} className="border border-black p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className={`px-2 py-0.5 font-mono-ui text-[9px] font-black uppercase ${req.priority === 'required' ? 'bg-black text-white' : 'bg-[#e7ff57] text-black'}`}>
                    {req.priority}
                  </span>
                  <span className="font-mono-ui text-[10px] font-bold uppercase">
                    State: {req.state.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sm font-bold">{req.literalSourceWording}</p>
                
                {req.supportingEvidenceIds.length > 0 && (
                  <div className="mt-3 bg-[#f7f4ed] p-2">
                    <p className="mb-1 font-mono-ui text-[9px] font-black uppercase text-[#d63c1d]">
                      Supporting Evidence
                    </p>
                    <ul className="list-inside list-disc font-mono-ui text-[10px]">
                      {req.supportingEvidenceIds.map((eid: EvidenceRecordId) => {
                        const ev = projection.evidence.find((e: ProductionRecruiterEvidenceItem) => e.evidenceRecordId === eid);
                        return <li key={eid}>{ev?.literalClaim ?? eid}</li>;
                      })}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {projection.sharedWorkSamples.length > 0 && (
        <div className="border-2 border-black bg-white p-6 shadow-[4px_4px_0_#111]">
          <h3 className="mb-4 font-mono-ui text-[11px] font-black uppercase text-[#d63c1d]">
            Shared Work Samples
          </h3>
          <ul className="list-inside list-disc text-sm">
            {projection.sharedWorkSamples.map((sample: ProductionRecruiterWorkSample) => (
              <li key={sample.artifactId}>
                <strong>{sample.displayName}</strong>
                <span className="ml-2 font-mono-ui text-[10px] text-black/50">
                  (Artifact ID: {sample.artifactId.substring(0, 8)}...)
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
