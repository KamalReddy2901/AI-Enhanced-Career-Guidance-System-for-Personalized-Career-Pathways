import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Loader2, Clock, CheckCircle2, XCircle, AlertCircle, Inbox, ChevronRight } from 'lucide-react';
import type { VerificationRequestReadModel, EvidenceScopeReadModel } from '../../../services/sih/types';

export interface VerificationRequestInboxProps {
  requests: readonly VerificationRequestReadModel[];
  isLoading?: boolean;
  error?: Error | null;
  onOpenRequest: (requestId: string) => void;
}

export function VerificationRequestInbox({
  requests,
  isLoading = false,
  error = null,
  onOpenRequest,
}: VerificationRequestInboxProps) {

  const renderScope = (scope: EvidenceScopeReadModel) => {
    switch (scope.kind) {
      case 'global_skill':
        return `Skill: ${scope.literalSkillLabel}`;
      case 'opportunity':
        return `Opportunity Requirement: ${scope.requirementId || scope.opportunityId}`;
      case 'organization':
        return `Organization: ${scope.organizationId}`;
      case 'outcome':
        return `Outcome Event: ${scope.outcomeEventId}`;
      default:
        return 'Unknown Scope';
    }
  };

  const getStatusBadge = (request: VerificationRequestReadModel) => {
    const isExpired = request.expiresAt && new Date(request.expiresAt) < new Date();

    if (isExpired && request.status === 'requested') {
      return <Badge variant="destructive" className="shrink-0 bg-red-100 text-red-800 hover:bg-red-200 border-red-200 dark:bg-red-900/30 dark:text-red-400">Expired</Badge>;
    }

    switch (request.status) {
      case 'requested':
        return <Badge variant="secondary" className="shrink-0 text-blue-700 bg-blue-100 hover:bg-blue-200 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400">Pending</Badge>;
      case 'accepted':
        return <Badge variant="default" className="shrink-0 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400">Accepted</Badge>;
      case 'closed':
        return <Badge variant="outline" className="shrink-0 text-muted-foreground">Closed</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="shrink-0 text-muted-foreground border-dashed">Cancelled</Badge>;
      default:
        return <Badge variant="outline" className="shrink-0">{request.status}</Badge>;
    }
  };

  const isExpired = (request: VerificationRequestReadModel) => {
    return request.expiresAt && new Date(request.expiresAt) < new Date();
  };

  if (error) {
    return (
      <Card className="w-full border-destructive/50 bg-destructive/5">
        <CardContent className="flex flex-col items-center justify-center p-8 text-center text-destructive">
          <AlertCircle className="w-10 h-10 mb-4 opacity-80" />
          <p className="font-semibold text-lg">Failed to load verification requests</p>
          <p className="text-sm opacity-80 mt-1">{error.message || 'An unexpected error occurred.'}</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading && requests.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center p-12 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mb-4" />
          <p>Loading inbox...</p>
        </CardContent>
      </Card>
    );
  }

  if (!isLoading && requests.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center p-12 text-muted-foreground">
          <Inbox className="w-12 h-12 mb-4 opacity-40" />
          <p className="text-lg font-medium text-foreground">Inbox is empty</p>
          <p className="text-sm mt-1">You have no pending verification requests.</p>
        </CardContent>
      </Card>
    );
  }

  // Sort: Pending requests first, then others, sorted by date descending.
  const sortedRequests = [...requests].sort((a, b) => {
    if (a.status === 'requested' && b.status !== 'requested') return -1;
    if (a.status !== 'requested' && b.status === 'requested') return 1;
    return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime();
  });

  return (
    <div className="w-full flex flex-col space-y-4">
      {sortedRequests.map((request) => (
        <Card key={request.id} className={`transition-colors hover:bg-muted/30 ${request.status === 'requested' ? 'border-l-4 border-l-primary' : ''}`}>
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">

            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-base truncate" title={request.subjectActorId}>
                  Requester: {request.subjectActorId}
                </span>
                {getStatusBadge(request)}
              </div>

              <div className="text-sm text-muted-foreground mt-1 break-words">
                <span className="font-medium text-foreground">Requested scope:</span> {renderScope(request.scope)}
              </div>

              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Requested on {new Date(request.requestedAt).toLocaleDateString()}
                </span>

                {request.expiresAt && (
                  <span className={`flex items-center gap-1.5 ${isExpired(request) && request.status === 'requested' ? 'text-destructive font-medium' : ''}`}>
                    <AlertCircle className="w-3.5 h-3.5" />
                    Expires on {new Date(request.expiresAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            <Button
              onClick={() => onOpenRequest(request.id)}
              variant={request.status === 'requested' ? 'default' : 'secondary'}
              className="w-full sm:w-auto shrink-0 mt-2 sm:mt-0"
            >
              View Request
              <ChevronRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </Card>
      ))}

      {isLoading && requests.length > 0 && (
        <div className="flex items-center justify-center p-4 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          Refreshing...
        </div>
      )}
    </div>
  );
}
