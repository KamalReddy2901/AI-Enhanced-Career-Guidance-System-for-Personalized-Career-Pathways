import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../../ui/card';
import { Button } from '../../ui/button';
import { CheckCircle, Loader2, ShieldAlert } from 'lucide-react';
import type { VerificationRequestReadModel } from '../../../services/sih/types';
import type { VerificationAction } from '../../../domain/evidence';

export interface VerificationActionFormData {
  action: VerificationAction;
  reason?: string;
}

export interface VerificationActionFormProps {
  request: VerificationRequestReadModel;
  isSubmitting?: boolean;
  error?: Error | null;
  isSuccess?: boolean;
  onCancel?: () => void;
  onSubmit: (data: VerificationActionFormData) => Promise<void> | void;
}

export function VerificationActionForm({
  request,
  isSubmitting = false,
  error = null,
  isSuccess = false,
  onCancel,
  onSubmit,
}: VerificationActionFormProps) {
  const [reason, setReason] = useState('');

  const handleAction = async (action: VerificationAction) => {
    await onSubmit({
      action,
      reason: reason.trim() || undefined,
    });
  };

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

  if (isSuccess) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center space-y-3 py-6">
            <CheckCircle className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-lg font-medium">Action Recorded</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Your verification decision has been successfully recorded for this request.
            </p>
          </div>
        </CardContent>
        {onCancel && (
          <CardFooter className="flex justify-center border-t pt-4">
            <Button variant="outline" onClick={onCancel}>
              Close
            </Button>
          </CardFooter>
        )}
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Review Verification Request</CardTitle>
        <CardDescription>
          Review the requested evidence and provide your verification decision.
        </CardDescription>
      </CardHeader>
      <div className="px-6 space-y-6 pb-6">
        {/* Request Context */}
        <div className="space-y-3 p-4 bg-muted/30 rounded-md border">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Evidence Record ID</div>
              <div className="text-sm font-mono break-all">{request.evidenceRecordId}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Request Status</div>
              <div className="text-sm capitalize">{request.status}</div>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Bounded Verification Scope</div>
            <div className="text-sm font-medium">{renderScope()}</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Requested At</div>
              <div className="text-sm">{new Date(request.requestedAt).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Expires At</div>
              <div className="text-sm">{request.expiresAt ? new Date(request.expiresAt).toLocaleString() : 'N/A'}</div>
            </div>
          </div>
          
          <div className="flex items-start gap-2 text-xs text-muted-foreground border-l-2 border-primary/50 pl-2 mt-4">
            <ShieldAlert className="w-4 h-4 shrink-0 text-primary/70" />
            <p>
              Your verification is strictly bounded to this specific request and scope. It does NOT constitute a universal certification or alter the original provenance of the claim.
            </p>
          </div>
        </div>

        {/* Verifier Action Input */}
        <div className="space-y-3">
          <label htmlFor="reasonInput" className="text-sm font-medium">
            Rationale / Comment (Optional)
          </label>
          <textarea
            id="reasonInput"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Provide any context for your decision..."
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[80px] resize-y disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitting}
          />
        </div>

        {error && (
          <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md">
            {error.message || 'An error occurred while submitting your decision.'}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-4 border-t">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting} className="mr-auto">
              Cancel
            </Button>
          )}
          
          <Button 
            type="button" 
            variant="destructive" 
            onClick={() => handleAction('disputed')} 
            disabled={isSubmitting || request.status !== 'requested'}
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Dispute
          </Button>

          <Button 
            type="button" 
            variant="secondary" 
            onClick={() => handleAction('verified_by_human')} 
            disabled={isSubmitting || request.status !== 'requested'}
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Verify (Human)
          </Button>

          <Button 
            type="button" 
            variant="default" 
            onClick={() => handleAction('verified_by_issuer')} 
            disabled={isSubmitting || request.status !== 'requested'}
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Verify (Issuer)
          </Button>
        </div>
      </div>
    </Card>
  );
}
