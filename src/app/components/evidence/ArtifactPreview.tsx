import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Loader2, FileText, Download } from 'lucide-react';
import type { ArtifactReference } from '../../domain/evidence';

interface ArtifactPreviewProps {
  artifact: ArtifactReference;
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

  useEffect(() => {
    let active = true;
    if (onFetchPreviewUrl) {
      setIsLoading(true);
      setError(null);
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
    return () => { active = false; };
  }, [artifact.storageReference, onFetchPreviewUrl]);

  const renderPreview = () => {
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
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="truncate pr-4" title={artifact.displayName}>
            {artifact.displayName}
          </span>
          <span className="text-xs text-muted-foreground font-normal shrink-0">
            {artifact.mediaType}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        {renderPreview()}
      </CardContent>
    </Card>
  );
}
