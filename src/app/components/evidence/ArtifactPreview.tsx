import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Loader2, FileText, Download, ShieldAlert, Fingerprint } from 'lucide-react';
import type { ArtifactReference } from '../../domain/evidence';

export interface ExtendedArtifactReference extends ArtifactReference {
  scanStatus?: 'pending' | 'clean' | 'quarantined' | 'rejected' | 'not_scanned';
  integrityFingerprint?: string;
}

interface ArtifactPreviewProps {
  artifact: ExtendedArtifactReference;
  /**
   * Securely fetches the artifact data or returns a short-lived signed URL for preview.
   * This ensures we do not expose raw storage paths directly in the DOM.
   */
  onFetchPreviewUrl?: (storageReference: string) => Promise<string>;
}

export function ArtifactPreview({ artifact, onFetchPreviewUrl }: ArtifactPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status = artifact.scanStatus || 'not_scanned';
  const isSafeToPreview = status === 'clean';

  useEffect(() => {
    let active = true;
    setPreviewUrl(null);
    setError(null);
    if (onFetchPreviewUrl && isSafeToPreview) {
      setIsLoading(true);
      onFetchPreviewUrl(artifact.storageReference)
        .then(url => {
          if (active) setPreviewUrl(url);
        })
        .catch(err => {
          if (active) setError('Failed to load artifact preview.');
        })
        .finally(() => {
          if (active) setIsLoading(false);
        });
    }
    if (!isSafeToPreview) setIsLoading(false);
    return () => { active = false; };
  }, [artifact.storageReference, onFetchPreviewUrl, isSafeToPreview]);

  const renderScanBadge = () => {
    switch (status) {
      case 'clean':
        return <Badge variant="default" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25 border-emerald-500/20 text-[10px] h-5 px-1.5 font-medium shrink-0">Clean</Badge>;
      case 'quarantined':
      case 'rejected':
        return <Badge variant="destructive" className="text-[10px] h-5 px-1.5 font-medium shrink-0">Quarantined</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-medium shrink-0">Scanning...</Badge>;
      case 'not_scanned':
      default:
        return <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-medium text-muted-foreground border-dashed shrink-0">Not Scanned</Badge>;
    }
  };

  const renderPreview = () => {
    if (!isSafeToPreview) {
      const isQuarantined = status === 'quarantined' || status === 'rejected';
      return (
        <div className={`flex h-48 flex-col items-center justify-center rounded-md ${isQuarantined ? 'bg-destructive/10' : 'bg-muted/20'}`}>
          <ShieldAlert className={`mb-2 h-10 w-10 opacity-80 ${isQuarantined ? 'text-destructive' : 'text-muted-foreground'}`} />
          <span className={`text-sm font-semibold ${isQuarantined ? 'text-destructive' : 'text-muted-foreground'}`}>
            {isQuarantined ? 'Artifact Quarantined' : 'Security scan required'}
          </span>
          <span className={`mt-1 max-w-[80%] text-center text-xs ${isQuarantined ? 'text-destructive/80' : 'text-muted-foreground'}`}>
            {isQuarantined
              ? 'This file was flagged by security scanners. Preview and download are disabled.'
              : 'Preview and download stay disabled until the artifact has a clean scan result.'}
          </span>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-48 bg-muted/20 rounded-md">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <span className="mt-2 text-sm text-muted-foreground">Loading preview...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-48 bg-destructive/10 rounded-md text-destructive">
          <span className="text-sm font-medium">{error}</span>
        </div>
      );
    }

    if (!previewUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-48 bg-muted/20 rounded-md">
          <FileText className="w-12 h-12 text-muted-foreground/50 mb-2" />
          <span className="text-sm text-muted-foreground">Preview not available</span>
        </div>
      );
    }

    if (artifact.mediaType.startsWith('image/')) {
      return (
        <div className="relative w-full h-48 overflow-hidden rounded-md bg-muted/20 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={artifact.displayName}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      );
    }

    // For non-images or generic files
    return (
      <div className="flex flex-col items-center justify-center h-48 bg-muted/20 rounded-md">
        <FileText className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <Button variant="outline" asChild>
          <a href={previewUrl} target="_blank" rel="noopener noreferrer">
            <Download className="w-4 h-4 mr-2" />
            Download {artifact.displayName}
          </a>
        </Button>
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader className="py-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between gap-2 overflow-hidden">
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate" title={artifact.displayName}>
              {artifact.displayName}
            </span>
            {renderScanBadge()}
          </div>
          <span className="text-xs text-muted-foreground font-normal shrink-0">
            {artifact.mediaType}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        {renderPreview()}
      </CardContent>
      {artifact.integrityFingerprint && (
        <CardFooter className="py-2 bg-muted/30 border-t flex items-center gap-2 text-xs text-muted-foreground">
          <Fingerprint className="w-3.5 h-3.5" />
          <span className="truncate font-mono" title={artifact.integrityFingerprint}>
            {artifact.integrityFingerprint}
          </span>
        </CardFooter>
      )}
    </Card>
  );
}
