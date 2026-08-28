type ReadinessProps = {
  band?: string;
  requiredCoverage?: {
    met: number;
    total: number;
  };
  verificationCoverage?: {
    supported: number;
    total: number;
  };
  partialCount?: number;
  gapCount?: number;
  workSamples?: number;
};

export default function Readiness({
  band = "UNKNOWN",
  requiredCoverage = { met: 0, total: 0 },
  verificationCoverage = { supported: 0, total: 0 },
  partialCount = 0,
  gapCount = 0,
  workSamples = 0,
}: ReadinessProps) {
  return (
    <section className="readiness">
      <div className="readiness-header">
        <div>
          <p className="readiness-label">CAREER READINESS</p>
          <h2>Current Readiness</h2>
        </div>

        <div className="readiness-band-badge">
          {band.replaceAll("_", " ")}
        </div>
      </div>

      <div className="readiness-stats">
        <div>
          <span>Required coverage</span>
          <strong>
            {requiredCoverage.met} / {requiredCoverage.total}
          </strong>
        </div>

        <div>
          <span>Verification</span>
          <strong>
            {verificationCoverage.supported} / {verificationCoverage.total}
          </strong>
        </div>

        <div>
          <span>Partial</span>
          <strong>{partialCount}</strong>
        </div>

        <div>
          <span>Gaps</span>
          <strong>{gapCount}</strong>
        </div>

        <div>
          <span>Work samples</span>
          <strong>{workSamples}</strong>
        </div>
      </div>

      <p className="readiness-note">
        This readiness result describes the current evidence state. It does
        not predict hiring, selection, or career success.
      </p>
    </section>
  );
}