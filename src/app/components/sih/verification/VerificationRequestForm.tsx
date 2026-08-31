import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../../ui/card';
import { Button } from '../../ui/button';
import { CheckCircle, Loader2, ShieldAlert } from 'lucide-react';
import type { EvidenceRecordReadModel } from '../../../services/sih/types';

export interface VerificationRequestFormData {
  requestedVerifierActorId: string;
  requestedVerifierOrganizationId: string;
  consentGranted: boolean;
}

export interface VerificationRequestFormProps {
  evidence: EvidenceRecordReadModel;
  isSubmitting?: boolean;
  error?: Error | null;
  isSuccess?: boolean;
  onCancel?: () => void;
  onSubmit: (data: VerificationRequestFormData) => Promise<void> | void;
}

export function VerificationRequestForm({
  evidence,
  isSubmitting = false,
  error = null,
  isSuccess = false,
  onCancel,
  onSubmit,
}: VerificationRequestFormProps) {
  const [verifierActorId, setVerifierActorId] = useState('');
  const [verifierOrgId, setVerifierOrgId] = useState('');
  const [consentGranted, setConsentGranted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentGranted) {
      console.warn("VerificationRequestForm: Submission blocked because consent is not granted.");
      return;
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(verifierOrgId.trim())) {
      return;
    }
    await onSubmit({
      requestedVerifierActorId: verifierActorId.trim(),
      requestedVerifierOrganizationId: verifierOrgId.trim(),
      consentGranted,
    });
  };

  const renderScope = () => {
    const scope = evidence.scope;
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
            <h3 className="text-lg font-medium">Verification Requested</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Your request has been submitted to the specified verifier. You will be notified when they review your evidence.
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
        <CardTitle>Request Verification</CardTitle>
        <CardDescription>
          Request a mentor, faculty member, or institution to verify this specific evidence claim.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {/* Evidence Context */}
          <div className="space-y-3 p-4 bg-muted/30 rounded-md border">
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Evidence Claim</div>
              <div className="text-sm font-medium">{evidence.literalClaim}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Verification Scope</div>
              <div className="text-sm">{renderScope()}</div>
            </div>
            <div className="flex items-start gap-2 text-xs text-muted-foreground border-l-2 border-primary/50 pl-2 mt-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-primary/70" />
              <p>
                Verification is bounded to this explicit scope. It does not certify global mastery, and requesting verification does not guarantee approval.
              </p>
            </div>
          </div>

          {/* Verifier Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="verifierActorId" className="text-sm font-medium">
                Institution-provided verifier ID (Optional)
              </label>
              <input
                id="verifierActorId"
                type="text"
                value={verifierActorId}
                onChange={(e) => setVerifierActorId(e.target.value)}
                placeholder="Paste an authorized verifier UUID"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="verifierOrgId" className="text-sm font-medium">
                Verifier organization ID
              </label>
              <input
                id="verifierOrgId"
                type="text"
                value={verifierOrgId}
                onChange={(e) => setVerifierOrgId(e.target.value)}
                placeholder="Paste the authorized organization UUID"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Consent and Boundaries */}
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="consentCheck"
                checked={consentGranted}
                onChange={(e) => setConsentGranted(e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 rounded-sm border-primary text-primary focus:ring-primary"
                disabled={isSubmitting}
              />
              <label htmlFor="consentCheck" className="text-sm leading-tight text-muted-foreground">
                I consent to share this evidence claim, its provenance, and attached artifacts with the requested verifier for the purpose of bounded verification.
              </label>
            </div>
            <p className="text-xs text-muted-foreground pl-7">
              Use identifiers supplied by an authorized institution directory. The database rejects unrelated or unauthorized verifiers. A searchable directory remains an integration requirement.
            </p>
          </div>

          {error && (
            <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md">
              {error.message || 'An error occurred submitting the verification request.'}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={Boolean(isSubmitting || !consentGranted || !/^[0-9a-f-]{36}$/i.test(verifierOrgId.trim()))}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting
              </>
            ) : (
              'Submit Request'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
