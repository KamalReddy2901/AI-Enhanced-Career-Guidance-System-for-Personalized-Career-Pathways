import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import type { EvidenceRecord } from '../../domain/evidence';

interface EvidenceCardProps {
  evidence: EvidenceRecord;
  onClick?: (evidence: EvidenceRecord) => void;
}

export function EvidenceCard({ evidence, onClick }: EvidenceCardProps) {
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
    <Card
      className={`cursor-pointer hover:border-primary transition-colors ${onClick ? 'interactive' : ''}`}
      onClick={() => onClick?.(evidence)}
    >
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{evidence.literalClaim}</CardTitle>
          <Badge variant={getVerificationStateColor(evidence.verificationState)}>
            {evidence.verificationState.replace('_', ' ')}
          </Badge>
        </div>
        <CardDescription>
          Provenance: {evidence.provenance.replace('_', ' ')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {evidence.artifacts.length > 0 && (
          <div className="text-sm text-muted-foreground mt-2">
            {evidence.artifacts.length} Artifact(s) attached
          </div>
        )}
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground justify-between">
        <span>Added {new Date(evidence.createdAt).toLocaleDateString()}</span>
        <span>Visibility: {evidence.visibility.replace('_', ' ')}</span>
      </CardFooter>
    </Card>
  );
}
