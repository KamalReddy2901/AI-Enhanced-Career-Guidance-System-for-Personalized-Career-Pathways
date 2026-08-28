import type { Opportunity, OpportunityVersion } from "../../../../domain/opportunity";

interface OpportunityDiscoveryProps {
  opportunities: readonly {
    opportunity: Opportunity;
    version: OpportunityVersion;
  }[];
}

export default function OpportunityDiscovery({
  opportunities,
}: OpportunityDiscoveryProps) {
  return (
    <section className="explorer">
      <div className="explorer-header">
        <p className="explorer-label">OPPORTUNITIES</p>
        <h2>Discover Opportunities</h2>
        <p className="explorer-description">
          Explore available opportunities and review the requirements before
          deciding what to pursue.
        </p>
      </div>

      <div className="explorer-grid">
        {opportunities.map(({ opportunity, version }) => (
          <article className="explorer-card" key={opportunity.id}>
            <span className="explorer-label">
              {version.type.replaceAll("_", " ")}
            </span>

            <h3>{version.title}</h3>

            <p>{version.description}</p>

            <p>
              <strong>Version:</strong> {version.version}
            </p>

            <p>
              <strong>Status:</strong> {opportunity.status}
            </p>

            <p>
              <strong>Requirements:</strong> {version.requirements.length}
            </p>

            <button type="button">View Opportunity</button>
          </article>
        ))}
      </div>
    </section>
  );
}