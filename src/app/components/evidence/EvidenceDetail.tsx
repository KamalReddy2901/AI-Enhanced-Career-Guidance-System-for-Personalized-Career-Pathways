import React from 'react';
import type { EvidenceRecord } from '../../domain/evidence';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { ArtifactPreview } from './ArtifactPreview';
import { VerificationHistoryTimeline } from './VerificationHistoryTimeline';
import type { VerificationEvent } from '../../domain/evidence';

interface EvidenceDetailProps {
  evidence: EvidenceRecord;
  historyEvents?: VerificationEvent[];
  onFetchArtifactUrl?: (storageReference: string) => Promise<string>;
}

export function EvidenceDetail({ evidence, historyEvents = [], onFetchArtifactUrl }: EvidenceDetailProps) {
  const getVerificationStateColor = (state: string) => {
    switch (state) {
      case 'human_verified':
      case 'issuer_verified':
        return 'default';
      case 'self_confirmed':
        return 'secondary';
      case 'disputed':
      case 'revoked':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto p-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <CardTitle className="text-2xl">{evidence.literalClaim}</CardTitle>
              <CardDescription className="mt-2 text-base">
                Provenance: <span className="font-semibold text-foreground">{evidence.provenance.replace('_', ' ')}</span>
              </CardDescription>
            </div>
            <Badge variant={getVerificationStateColor(evidence.verificationState)} className="text-sm px-3 py-1">
              {evidence.verificationState.replace('_', ' ')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-muted-foreground mt-4">
            <div>
              <span className="font-semibold block text-foreground">Added On</span>
              {new Date(evidence.createdAt).toLocaleString()}
            </div>
            <div>
              <span className="font-semibold block text-foreground">Visibility</span>
              {evidence.visibility.replace('_', ' ')}
            </div>
            {evidence.verificationState === 'proposed' && 'proposalSource' in evidence && (
              <div>
                <span className="font-semibold block text-foreground">Proposal Source</span>
                {evidence.proposalSource?.replace('_', ' ')}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {evidence.artifacts.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-semibold tracking-tight">Attached Artifacts</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {evidence.artifacts.map(artifact => (
              <ArtifactPreview
                key={artifact.id}
                artifact={artifact}
                onFetchPreviewUrl={onFetchArtifactUrl}
              />
            ))}
          </div>
        </div>
      )}

      {historyEvents.length > 0 && (
        <div className="flex flex-col gap-4 mt-4">
          <Separator />
          <h3 className="text-lg font-semibold tracking-tight">Verification History</h3>
          <VerificationHistoryTimeline events={historyEvents} />
        </div>
      )}
    </div>
  );
}
