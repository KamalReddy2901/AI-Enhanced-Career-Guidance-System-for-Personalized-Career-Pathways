import type {
  DevelopmentProgramId,
  DevelopmentProgramVersionId,
  IsoTimestamp,
  OrganizationId,
} from './shared';
import type { CanonicalResolutionState } from './skillResolution';

export type DevelopmentProgramKind = 'training' | 'certification' | 'workshop' | 'mentorship';
export type DevelopmentProgramStatus = 'draft' | 'published' | 'paused' | 'closed' | 'archived';
export type DevelopmentProgramVersionStatus = 'draft' | 'published';
export type DevelopmentDeliveryMode = 'online' | 'onsite' | 'hybrid' | 'self_paced';

export interface DevelopmentProgramSkillTarget {
  readonly literalSourceWording: string;
  readonly canonicalResolution: CanonicalResolutionState;
  readonly humanConfirmed: boolean;
  readonly confirmationMethod?: 'structured_human_entry' | 'ai_assisted_review' | 'connector_review';
}

export interface DevelopmentProgramVersion {
  readonly id: DevelopmentProgramVersionId;
  readonly developmentProgramId: DevelopmentProgramId;
  readonly versionNumber: number;
  readonly status: DevelopmentProgramVersionStatus;
  readonly providerOrganizationId: OrganizationId;
  readonly providerDisplayName?: string;
  readonly kind: DevelopmentProgramKind;
  readonly title: string;
  readonly description: string;
  readonly deliveryMode: DevelopmentDeliveryMode;
  readonly externalRegistrationUrl?: string;
  readonly startsAt?: IsoTimestamp;
  readonly endsAt?: IsoTimestamp;
  readonly publishedAt?: IsoTimestamp;
  readonly skillTargets: readonly DevelopmentProgramSkillTarget[];
}

export interface DevelopmentProgramSummary {
  readonly id: DevelopmentProgramId;
  readonly currentVersionId: DevelopmentProgramVersionId;
  readonly currentVersionNumber: number;
  readonly providerOrganizationId: OrganizationId;
  readonly status: DevelopmentProgramStatus;
  readonly versionStatus: DevelopmentProgramVersionStatus;
  readonly title: string;
  readonly kind: DevelopmentProgramKind;
}
