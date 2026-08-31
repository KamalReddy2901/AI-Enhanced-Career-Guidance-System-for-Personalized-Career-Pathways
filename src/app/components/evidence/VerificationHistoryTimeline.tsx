import React from 'react';
import type { VerificationAction } from '../../domain/evidence';

interface VerificationTimelineEvent {
  readonly id: string;
  readonly action: VerificationAction;
  readonly actorId: string;
  readonly actorOrganizationId?: string;
  readonly reason?: string;
  readonly supersedesEventId?: string;
  readonly occurredAt: string;
}
import { Badge } from '../ui/badge';

interface VerificationHistoryTimelineProps {
  events: readonly VerificationTimelineEvent[];
}

export function VerificationHistoryTimeline({ events }: VerificationHistoryTimelineProps) {
  // Sort events chronologically (oldest first)
  const sortedEvents = [...events].sort((a, b) =>
    new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
  );

  const getActionColor = (action: string) => {
    switch (action) {
      case 'verified_by_human':
      case 'verified_by_issuer':
      case 'self_confirmed':
        return 'default';
      case 'disputed':
      case 'revoked':
        return 'destructive';
      case 'corrected':
        return 'secondary';
      case 'submitted_for_review':
        return 'outline';
      default:
        return 'outline';
    }
  };

  if (sortedEvents.length === 0) {
    return <p className="text-sm text-muted-foreground">No verification history available.</p>;
  }

  return (
    <div className="relative pl-6 border-l border-muted-foreground/20 space-y-6">
      {sortedEvents.map((event, index) => {
        const isLast = index === sortedEvents.length - 1;
        return (
          <div key={event.id} className="relative">
            <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-primary border-2 border-background" />
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Badge variant={getActionColor(event.action)}>
                  {event.action.replace(/_/g, ' ')}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(event.occurredAt).toLocaleString()}
                </span>
              </div>
              <p className="text-sm font-medium mt-1">
                Actor: {event.actorId} {event.actorOrganizationId && `(Org: ${event.actorOrganizationId})`}
              </p>
              {event.reason && (
                <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded-md mt-1">
                  &quot;{event.reason}&quot;
                </p>
              )}
              {event.supersedesEventId && (
                <p className="text-xs text-muted-foreground mt-1">
                  Supersedes event: {event.supersedesEventId}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
