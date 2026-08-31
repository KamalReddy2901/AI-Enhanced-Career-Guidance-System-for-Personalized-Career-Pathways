# External Integration Adapter Architecture

**Status:** INTEGRATION-READY CONTRACTS  
**Implementation:** Target architecture only - no live integrations  
**Last Updated:** 2026-08-31

---

## Overview

CareerCase SIH26044 v1.2 defines **integration-ready adapter contracts** for external government and institutional systems. These are **target architectures**, not implemented integrations.

**Critical Labels:**
- ✅ **IMPLEMENTED:** Live integration with credentials and working data flow
- 🔄 **CONTROLLED:** Sandbox/controlled environment with real API but synthetic data
- 📋 **INTEGRATION-READY:** Contract defined, no live connection
- 🎯 **TARGET ARCHITECTURE:** Design intent, requires credentials/authority

**Current Status:** All adapters are **INTEGRATION-READY** or **TARGET ARCHITECTURE** only.

---

## National Career Service (NCS) Adapter

**Status:** 📋 INTEGRATION-READY  
**Authority Required:** NCS API credentials, organizational approval  
**Purpose:** Opportunity discovery, job posting import, placement tracking

### Contract

```typescript
interface NcsAdapter {
  /**
   * Import current NCS job postings matching skill/qualification filters
   * Maps to CareerCase opportunity schema with NCS provenance
   */
  importOpportunities(filters: NcsOpportunityFilters): Promise<ImportedOpportunity[]>;

  /**
   * Report successful placement for NCS analytics
   * Requires consent and outcome event
   */
  reportPlacement(placement: PlacementReport): Promise<void>;

  /**
   * Sync applicant profile to NCS (consent-gated)
   */
  syncApplicantProfile(actorId: ActorId, consentId: ConsentGrantId): Promise<void>;
}

interface NcsOpportunityFilters {
  readonly skillTags?: readonly string[];
  readonly qualificationLevels?: readonly number[];  // NSQF levels
  readonly locations?: readonly string[];
  readonly sectors?: readonly string[];
}

interface ImportedOpportunity {
  readonly ncsJobId: string;
  readonly title: string;
  readonly description: string;
  readonly requirements: readonly string[];
  readonly nsqfLevel?: number;
  readonly provenance: 'ncs_import';
  readonly sourceUrl: string;
}
```

### Implementation Notes

- NCS API endpoint: `https://www.ncs.gov.in/api/v1/...` (requires credentials)
- Opportunity imports create versioned records with `source_system='ncs'`
- Placement reports require active `outcome_event` + applicant consent
- No automatic profile sync without explicit consent grant

### Testing Without Credentials

```typescript
// Synthetic NCS data generator for testing
function generateSyntheticNcsOpportunities(count: number): ImportedOpportunity[] {
  return Array.from({ length: count }, (_, i) => ({
    ncsJobId: `NCS-${String(i + 1).padStart(6, '0')}`,
    title: `Software Developer ${i + 1}`,
    description: 'Synthetic NCS opportunity for testing',
    requirements: ['JavaScript', 'React', 'Problem Solving'],
    nsqfLevel: 7,
    provenance: 'ncs_import' as const,
    sourceUrl: `https://www.ncs.gov.in/jobs/NCS-${String(i + 1).padStart(6, '0')}`,
  }));
}
```

---

## Skill India Digital Hub (SIDH) Adapter

**Status:** 📋 INTEGRATION-READY  
**Authority Required:** SIDH API credentials, NSDC partnership  
**Purpose:** Training provider discovery, skill certification import

### Contract

```typescript
interface SidhAdapter {
  /**
   * Search SIDH training providers by skill/location
   */
  searchTrainingProviders(query: SidhTrainingQuery): Promise<TrainingProvider[]>;

  /**
   * Import skill certificates from SIDH
   * Creates evidence records with 'issuer_verified' state
   */
  importSkillCertificate(certificate: SidhCertificate): Promise<EvidenceRecordId>;

  /**
   * Verify certificate authenticity against SIDH registry
   */
  verifyCertificate(certificateId: string): Promise<CertificateVerificationResult>;
}

interface SidhTrainingQuery {
  readonly skillName: string;
  readonly nsqfLevel?: number;
  readonly location?: string;
  readonly sector?: string;
}

interface SidhCertificate {
  readonly certificateId: string;
  readonly skillName: string;
  readonly nsqfLevel: number;
  readonly issuingBody: string;
  readonly issueDate: string;
  readonly expiryDate?: string;
}
```

### Implementation Notes

- SIDH connector requires NSDC organizational credentials
- Certificate imports create evidence with `provenance='issuer_verified'`
- Training provider results feed gap-closure recommendations
- No automatic certificate import without learner consent

---

## DigiLocker / NAD Adapter

**Status:** 🎯 TARGET ARCHITECTURE  
**Authority Required:** DigiLocker integration partner approval  
**Purpose:** Document verification, educational credential import

### Contract

```typescript
interface DigiLockerAdapter {
  /**
   * Initiate DigiLocker OAuth flow for document access
   * Returns authorization URL
   */
  initiateDocumentAccess(actorId: ActorId, purpose: 'education_verification' | 'identity_verification'): Promise<string>;

  /**
   * Import educational documents after OAuth consent
   * Creates artifact records with DigiLocker provenance
   */
  importEducationalDocuments(authCode: string, actorId: ActorId): Promise<ImportedDocument[]>;

  /**
   * Verify document authenticity against issuing institution
   * Uses NAD (National Academic Depository) for degree verification
   */
  verifyEducationalDocument(documentId: string): Promise<VerificationResult>;
}

interface ImportedDocument {
  readonly documentType: 'degree' | 'certificate' | 'marksheet' | 'diploma';
  readonly issuingInstitution: string;
  readonly issueDate: string;
  readonly documentHash: string;  // DigiLocker integrity hash
  readonly nadVerified: boolean;
}
```

### Implementation Notes

- DigiLocker OAuth: `https://digilocker.gov.in/public/oauth2/...`
- NAD verification: `https://nad.gov.in/api/...`
- All document imports require explicit user consent via DigiLocker OAuth
- Verification results create evidence with `provenance='issuer_verified'`
- Documents stored in Supabase Storage with DigiLocker hash reference

---

## AICTE / University SIS Adapter

**Status:** 📋 INTEGRATION-READY  
**Authority Required:** Institution-specific API credentials  
**Purpose:** Academic record import, institutional skill mapping

### Contract

```typescript
interface AicteSisAdapter {
  /**
   * Import student academic records from institution SIS
   * Requires institution consent and student authorization
   */
  importAcademicRecords(studentId: string, institutionId: string): Promise<AcademicRecord[]>;

  /**
   * Map course completions to CareerCase skill taxonomy
   * Uses institution-maintained course-skill mappings
   */
  mapCourseToSkills(courseCode: string, institutionId: string): Promise<SkillMapping[]>;

  /**
   * Report institutional outcomes for AICTE analytics
   * Aggregated, anonymized data only
   */
  reportInstitutionalOutcomes(report: InstitutionOutcomeReport): Promise<void>;
}

interface AcademicRecord {
  readonly courseCode: string;
  readonly courseName: string;
  readonly credits: number;
  readonly grade: string;
  readonly semester: string;
  readonly completionDate: string;
}

interface SkillMapping {
  readonly skillLabel: string;
  readonly proficiencyLevel: 'beginner' | 'intermediate' | 'advanced';
  readonly evidenceStrength: 'assessed' | 'observed' | 'inferred';
}
```

### Implementation Notes

- Each institution has unique SIS API (no standard protocol)
- Adapter layer provides common interface, institution-specific implementations
- Academic records create evidence with `provenance='assessed'` or `'activity_observation'`
- Skill mappings maintained by institution faculty, not auto-inferred
- AICTE outcome reporting uses aggregate analytics (no individual PII)

---

## APAAR / Academic Bank of Credits (ABC) Adapter

**Status:** 🎯 TARGET ARCHITECTURE  
**Authority Required:** APAAR ID integration, ABC platform credentials  
**Purpose:** Credit accumulation, academic mobility, prior learning recognition

### Contract

```typescript
interface ApaarAbcAdapter {
  /**
   * Link CareerCase profile to APAAR ID
   * Requires student consent and APAAR authentication
   */
  linkApaarId(actorId: ActorId, apaarId: string): Promise<void>;

  /**
   * Fetch accumulated credits from ABC
   * Imports as assessed evidence with institutional provenance
   */
  fetchAccumulatedCredits(apaarId: string): Promise<CreditRecord[]>;

  /**
   * Propose credit for non-formal learning (skill evidence)
   * Requires institutional review and approval
   */
  proposeCreditForLearning(apaarId: string, evidence: EvidenceRecordId): Promise<CreditProposal>;
}

interface CreditRecord {
  readonly courseId: string;
  readonly institutionName: string;
  readonly credits: number;
  readonly gradePoint: number;
  readonly completionDate: string;
  readonly abcTransactionId: string;
}
```

### Implementation Notes

- APAAR integration requires national ID system connectivity
- ABC credit import creates evidence with institutional provenance
- Credit proposals require human institutional approval
- No automatic credit granting based on CareerCase evidence

---

## NATS / NAPS Placement Adapter

**Status:** 📋 INTEGRATION-READY  
**Authority Required:** NATS/NAPS API credentials  
**Purpose:** Apprenticeship discovery, placement tracking

### Contract

```typescript
interface NatsNapsAdapter {
  /**
   * Search available apprenticeships from NATS/NAPS
   */
  searchApprenticeships(filters: ApprenticeshipFilters): Promise<Apprenticeship[]>;

  /**
   * Apply to apprenticeship (with consent)
   * Creates application snapshot and forwards to NATS/NAPS
   */
  applyToApprenticeship(applicationSnapshot: ApplicationSnapshotId): Promise<void>;

  /**
   * Report apprenticeship completion
   * Creates outcome event with work experience evidence
   */
  reportApprenticeshipCompletion(completion: ApprenticeshipCompletion): Promise<void>;
}

interface ApprenticeshipFilters {
  readonly tradeArea?: string;
  readonly duration?: number;  // months
  readonly location?: string;
  readonly stipendRange?: { min: number; max: number };
}
```

### Implementation Notes

- NATS/NAPS API: `https://nats.gov.in/api/...` and `https://naps.gov.in/api/...`
- Apprenticeships imported as opportunity versions with `category='apprenticeship'`
- Application forwarding requires consent and immutable snapshot
- Completion reports create evidence with `provenance='outcome_linked'`

---

## Integration Architecture Principles

### 1. Consent-First

All external integrations require explicit user consent:
- Profile sync → consent grant
- Document import → OAuth consent flow
- Outcome reporting → outcome-specific consent

### 2. Provenance Preservation

Imported data retains source attribution:
- `source_system` field on opportunities/evidence
- `provenance` type reflects authority level
- External IDs stored for reconciliation

### 3. No Automatic Inference

Integrations NEVER auto-infer:
- Skills from job titles
- Evidence strength from external data
- Readiness from external profiles

### 4. Failure Resilience

All adapters handle:
- Credential expiry → graceful degradation
- API unavailability → fallback to manual entry
- Rate limits → queue and retry
- Data conflicts → human resolution

### 5. Audit Trail

All integration events logged:
- Import timestamps and actor
- Sync operations and results
- Consent usage and scope
- API call provenance

---

## Testing Strategy

### Without Live Credentials

1. **Synthetic Data Generators:**
   - Generate representative NCS/SIDH/AICTE responses
   - Match schema and validation rules
   - Label clearly as synthetic

2. **Mock Adapter Implementations:**
   - Return synthetic data
   - Simulate network delays
   - Test error handling

3. **Integration Tests:**
   - Verify contract interfaces
   - Test consent requirements
   - Validate provenance flow

### With Controlled Environment

1. **Sandbox APIs:**
   - Use provider sandbox/test environments
   - Real authentication flow
   - Synthetic/test data

2. **Staging Deployment:**
   - Test credential rotation
   - Verify rate limit handling
   - Validate error recovery

### Production Readiness

1. **Credential Security:**
   - Secrets in environment variables
   - Key rotation procedures
   - Access audit logging

2. **Monitoring:**
   - API availability tracking
   - Error rate alerting
   - Data quality checks

3. **Compliance:**
   - Data retention policies
   - Consent audit trail
   - Privacy impact assessment

---

## Current Implementation Status

| Adapter | Contract | Synthetic Generator | Controlled Test | Live Integration |
|---|---|---|---|---|
| NCS | ✅ Defined | ✅ Available | ⏳ Pending credentials | ❌ Not implemented |
| SIDH | ✅ Defined | ✅ Available | ⏳ Pending credentials | ❌ Not implemented |
| DigiLocker/NAD | ✅ Defined | ✅ Available | ⏳ Pending approval | ❌ Not implemented |
| AICTE/SIS | ✅ Defined | ✅ Available | ⏳ Institution-specific | ❌ Not implemented |
| APAAR/ABC | ✅ Defined | ⏳ Pending | ⏳ Pending approval | ❌ Not implemented |
| NATS/NAPS | ✅ Defined | ✅ Available | ⏳ Pending credentials | ❌ Not implemented |

**NO FAKE "CONNECTED ✓" INDICATORS** will be shown in UI without live authenticated integration.

---

## Next Steps for Production Deployment

1. **Obtain Credentials:**
   - Apply for NCS API access
   - Partner with SIDH/NSDC
   - Register as DigiLocker integrator
   - Coordinate with AICTE and institutions

2. **Implement Adapters:**
   - Create adapter classes implementing contracts
   - Add credential management
   - Implement retry/circuit breaker patterns
   - Add comprehensive error handling

3. **Deploy Controlled Environment:**
   - Staging environment with sandbox APIs
   - Synthetic data validation
   - End-to-end integration testing

4. **Production Deployment:**
   - Credential rotation procedures
   - Monitoring and alerting
   - Incident response runbook
   - User communication plan

5. **Iterate Based on Usage:**
   - Monitor API performance
   - Optimize data sync frequency
   - Add additional providers as needed
   - Refine consent flows based on user feedback
