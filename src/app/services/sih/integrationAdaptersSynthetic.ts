/**
 * Synthetic Data Generators for External Integration Adapters
 *
 * These generators produce representative data for testing integration contracts
 * WITHOUT live credentials or API access. All data is CLEARLY LABELED as synthetic.
 *
 * Status: TESTING ONLY - Not production integrations
 */

export interface SyntheticNcsOpportunity {
  readonly ncsJobId: string;
  readonly title: string;
  readonly description: string;
  readonly requirements: readonly string[];
  readonly nsqfLevel?: number;
  readonly provenance: 'ncs_import_synthetic';
  readonly sourceUrl: string;
  readonly location: string;
  readonly sector: string;
  readonly _synthetic: true;
}

export interface SyntheticSidhCertificate {
  readonly certificateId: string;
  readonly skillName: string;
  readonly nsqfLevel: number;
  readonly issuingBody: string;
  readonly issueDate: string;
  readonly expiryDate?: string;
  readonly _synthetic: true;
}

export interface SyntheticDigiLockerDocument {
  readonly documentType: 'degree' | 'certificate' | 'marksheet' | 'diploma';
  readonly issuingInstitution: string;
  readonly issueDate: string;
  readonly documentHash: string;
  readonly nadVerified: boolean;
  readonly _synthetic: true;
}

/**
 * Generate synthetic NCS job opportunities for testing
 * Clearly labeled as synthetic with _synthetic flag
 */
export function generateSyntheticNcsOpportunities(count: number): SyntheticNcsOpportunity[] {
  const titles = [
    'Full Stack Developer',
    'Data Analyst',
    'UI/UX Designer',
    'DevOps Engineer',
    'Business Analyst',
    'Quality Assurance Engineer',
    'Product Manager',
    'Systems Administrator',
  ];

  const sectors = ['IT', 'Finance', 'Healthcare', 'Education', 'Manufacturing'];
  const locations = ['Bangalore', 'Hyderabad', 'Mumbai', 'Delhi', 'Chennai', 'Pune'];

  return Array.from({ length: count }, (_, i) => {
    const titleIndex = i % titles.length;
    const sectorIndex = i % sectors.length;
    const locationIndex = i % locations.length;

    return {
      ncsJobId: `NCS-SYNTH-${String(i + 1).padStart(6, '0')}`,
      title: `${titles[titleIndex]} (Synthetic)`,
      description: `Synthetic NCS opportunity for testing integration contracts. This is NOT a real job posting.`,
      requirements: [
        'Programming fundamentals',
        'Problem solving',
        'Team collaboration',
      ],
      nsqfLevel: 7,
      provenance: 'ncs_import_synthetic' as const,
      sourceUrl: `https://example.com/synthetic/ncs/${String(i + 1).padStart(6, '0')}`,
      location: locations[locationIndex],
      sector: sectors[sectorIndex],
      _synthetic: true,
    };
  });
}

/**
 * Generate synthetic SIDH skill certificates for testing
 */
export function generateSyntheticSidhCertificates(skills: readonly string[]): SyntheticSidhCertificate[] {
  return skills.map((skill, i) => ({
    certificateId: `SIDH-SYNTH-${String(i + 1).padStart(8, '0')}`,
    skillName: `${skill} (Synthetic)`,
    nsqfLevel: 5 + (i % 3),
    issuingBody: 'Synthetic NSDC Training Partner',
    issueDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    _synthetic: true,
  }));
}

/**
 * Generate synthetic DigiLocker educational documents for testing
 */
export function generateSyntheticDigiLockerDocuments(): SyntheticDigiLockerDocument[] {
  return [
    {
      documentType: 'degree',
      issuingInstitution: 'Synthetic University (Testing Only)',
      issueDate: '2023-06-15',
      documentHash: 'synth_' + Math.random().toString(36).substring(2, 15),
      nadVerified: true,
      _synthetic: true,
    },
    {
      documentType: 'marksheet',
      issuingInstitution: 'Synthetic University (Testing Only)',
      issueDate: '2023-05-01',
      documentHash: 'synth_' + Math.random().toString(36).substring(2, 15),
      nadVerified: true,
      _synthetic: true,
    },
  ];
}

/**
 * Simulate NCS API delay for realistic testing
 */
export async function simulateNcsApiDelay(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000));
}

/**
 * Simulate SIDH API delay for realistic testing
 */
export async function simulateSidhApiDelay(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 700));
}

/**
 * Check if data is synthetic
 */
export function isSyntheticData(data: unknown): boolean {
  return typeof data === 'object' && data !== null && '_synthetic' in data && data._synthetic === true;
}

/**
 * Label for UI display
 */
export function getSyntheticLabel(data: unknown): string | null {
  if (isSyntheticData(data)) {
    return '⚠️ SYNTHETIC TEST DATA - Not a real integration';
  }
  return null;
}
