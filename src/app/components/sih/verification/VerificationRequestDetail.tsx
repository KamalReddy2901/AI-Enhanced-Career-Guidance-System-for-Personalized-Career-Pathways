import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card';
import { Button } from '../../ui/button';
import { ArrowLeft, FileText, History, Info, ShieldAlert } from 'lucide-react';
import type { VerificationRequestReadModel, EvidenceRecordReadModel } from '../../../services/sih/types';
import type { VerificationEvent } from '../../../domain/evidence';
import { VerificationActionForm, type VerificationActionFormData } from './VerificationActionForm';
import { ArtifactPreview, type ExtendedArtifactReference } from '../../evidence/ArtifactPreview';
import { VerificationHistoryTimeline } from '../../evidence/VerificationHistoryTimeline';
import { Badge } from '../../ui/badge';

export interface VerificationRequestDetailProps {
  request: VerificationRequestReadModel;
  evidence?: EvidenceRecordReadModel;
  artifacts?: ExtendedArtifactReference[];
  history?: VerificationEvent[];
  isSubmitting?: boolean;
  error?: Error | null;
  isSuccess?: boolean;
  onBack?: () => void;
  onSubmit: (data: VerificationActionFormData) => Promise<void> | void;
}

export function VerificationRequestDetail({
  request,
  evidence,
  artifacts,
  history,
  isSubmitting,
  error,
  isSuccess,
  onBack,
  onSubmit,
}: VerificationRequestDetailProps) {
  const renderScope = () => {
    const scope = request.scope;
    switch (scope.kind) {
      case 'global_skill':
        return `Skill: ${scope.literalSkillLabel}`;
      case 'opportunity':
        return `Opportunity: ${scope.opportunityId}${scope.requirementId ? ` (Requirement: ${scope.requirementId})` : ''}`;
      case 'organization':
        return `Organization: ${scope.organizationId}`;
      case 'outcome':
        return `Outcome Event: ${scope.outcomeEventId}`;
      default:
        return 'Unknown Scope';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header / Navigation */}
      <div className="flex items-center gap-4">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Verification Request Detail</h2>
          <p className="text-sm text-muted-foreground">
            Review the bounded claim, attached artifacts, and history before deciding.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Context & Evidence */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Verification Request Info & Scope */}
          <Card>
            <CardHeader className="pb-4 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="w-5 h-5 text-muted-foreground" />
                  Request Context
                </CardTitle>
                <Badge variant={request.status === 'requested' ? 'default' : 'secondary'} className="capitalize">
                  {request.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Request ID</div>
                  <div className="text-sm font-mono break-all">{request.id}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Requested At</div>
                  <div className="text-sm">{new Date(request.requestedAt).toLocaleString()}</div>
                </div>
              </div>
              <div className="p-3 bg-muted/30 rounded-md border">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Bounded Verification Scope</div>
                <div className="text-sm font-medium">{renderScope()}</div>
              </div>
              <div className="flex items-start gap-2 text-xs text-muted-foreground border-l-2 border-primary/50 pl-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-primary/70" />
                <p>
                  Verification is bounded strictly to this request and scope. It does not certify universal mastery.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Evidence Claim & Provenance */}
          <Card>
            <CardHeader className="pb-4 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-muted-foreground" />
                Evidence Claim & Provenance
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {!evidence ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Loading evidence details...
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Literal Claim</div>
                    <div className="text-base font-medium">{evidence.literalClaim}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Provenance</div>
                      <div className="text-sm capitalize">{evidence.provenance.replace(/_/g, ' ')}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Initial Verification State</div>
                      <div className="text-sm capitalize">{evidence.initialVerificationState.replace(/_/g, ' ')}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Source System</div>
                      <div className="text-sm">{evidence.source.system}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Captured At</div>
                      <div className="text-sm">{new Date(evidence.source.capturedAt).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Artifacts */}
          <Card>
            <CardHeader className="pb-4 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-muted-foreground" />
                Attached Artifacts
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {!artifacts ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Loading artifacts...
                </div>
              ) : artifacts.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No artifacts attached to this evidence record.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {artifacts.map(artifact => (
                    <ArtifactPreview key={artifact.id} artifact={artifact} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: History & Action */}
        <div className="space-y-6">
          
          {/* Action Form */}
          <VerificationActionForm
            request={request}
            isSubmitting={isSubmitting}
            error={error}
            isSuccess={isSuccess}
            onSubmit={onSubmit}
          />

          {/* History Timeline */}
          <Card>
            <CardHeader className="pb-4 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="w-5 h-5 text-muted-foreground" />
                Verification History
              </CardTitle>
              <CardDescription>
                Scoped specifically to this evidence record
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {!history ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Loading verification history...
                </div>
              ) : (
                <VerificationHistoryTimeline events={history} />
              )}
            </CardContent>
          </Card>
          
        </div>
      </div>
    </div>
  );
}
