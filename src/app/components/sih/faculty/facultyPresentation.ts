import type { Actor, CollaborationEngagement, CollaborationKind, Organization } from '../../../domain';

export type FacultyCollaborationGroup = 'training_fdp' | 'consultancy_research' | 'mentoring_workshop_guest_lecture' | 'other';

export function collaborationKindLabel(kind: CollaborationKind): string {
  return kind.replaceAll('_', ' ');
}

export function collaborationGroup(kind: CollaborationKind): FacultyCollaborationGroup {
  if (kind === 'industrial_training' || kind === 'faculty_development_program') return 'training_fdp';
  if (kind === 'consultancy' || kind === 'collaborative_research') return 'consultancy_research';
  if (kind === 'mentoring' || kind === 'workshop' || kind === 'guest_lecture') return 'mentoring_workshop_guest_lecture';
  return 'other';
}

export function collaborationGroupLabel(group: FacultyCollaborationGroup): string {
  const labels: Record<FacultyCollaborationGroup, string> = {
    training_fdp: 'Training and FDP',
    consultancy_research: 'Consultancy and research',
    mentoring_workshop_guest_lecture: 'Mentoring, workshops and guest lectures',
    other: 'Other collaboration',
  };
  return labels[group];
}

export function collaborationStatusLabel(status: CollaborationEngagement['status']): string {
  return status.replaceAll('_', ' ');
}

export function organizationName(organizationId: Organization['id'], organizations: readonly Organization[]): string {
  return organizations.find(organization => organization.id === organizationId)?.displayName ?? 'Organization not represented in fixture';
}

export function participantNames(participantIds: readonly Actor['id'][], personas: readonly Actor[]): string[] {
  return participantIds.map(id => personas.find(persona => persona.id === id)?.displayName ?? 'Persona not represented in fixture');
}

export function formatDate(timestamp?: CollaborationEngagement['startsAt']): string {
  if (!timestamp) return 'Not specified by the current fixture';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(timestamp));
}

export function collaborationDuration(engagement: CollaborationEngagement): string {
  if (!engagement.startsAt || !engagement.endsAt) return 'Not represented by the current contract or fixture';
  const days = Math.max(1, Math.ceil((new Date(engagement.endsAt).getTime() - new Date(engagement.startsAt).getTime()) / 86_400_000));
  return `${days} day${days === 1 ? '' : 's'}`;
}

export const unsupportedFacultyField = 'Not represented by the current collaboration contract or fixture';