import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Loader2, UploadCloud, File, X, CheckCircle } from 'lucide-react';
import { Progress } from '../ui/progress';

export interface ArtifactUploadFormProps {
  onUpload: (file: File) => Promise<void>;
  isUploading?: boolean;
  uploadProgress?: number;
  error?: Error | null;
  onClearError?: () => void;
}

export function ArtifactUploadForm({
  onUpload,
  isUploading = false,
  uploadProgress = 0,
  error = null,
  onClearError,
}: ArtifactUploadFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isUploading && !isSuccess) setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (isUploading || isSuccess) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!isUploading && !isSuccess) {
        fileInputRef.current?.click();
      }
    }
  };

  const handleFileSelection = (file: File) => {
    setValidationError(null);
    setIsSuccess(false);
    if (onClearError) onClearError();
    setSelectedFile(file);
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setIsSuccess(false);
    setValidationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onClearError) onClearError();
  };

  const handleUploadClick = async () => {
    if (!selectedFile) return;
    try {
      await onUpload(selectedFile);
      setIsSuccess(true);
      setValidationError(null);
    } catch (e) {
      // Error is handled via props, but we unset local success
      setIsSuccess(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Attach Artifact</CardTitle>
        <CardDescription>Upload a document, image, or file to back your evidence claim.</CardDescription>
      </CardHeader>
      <CardContent>
        {!selectedFile ? (
          <div className="flex flex-col space-y-4">
            <div
              role="button"
              tabIndex={0}
              aria-label="File upload dropzone"
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={handleKeyDown}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="flex flex-col items-center justify-center space-y-3">
                <UploadCloud className="w-10 h-10 text-muted-foreground" />
                <div className="text-sm font-medium">Click to select or drag and drop</div>
                <div className="text-xs text-muted-foreground">Attach your evidence artifact</div>
              </div>
            </div>
            {(validationError || error) && (
              <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md">
                {validationError || error?.message || 'An error occurred.'}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
              <div className="flex items-center space-x-3 overflow-hidden">
                <File className="w-8 h-8 text-muted-foreground shrink-0" />
                <div className="flex flex-col overflow-hidden pr-2">
                  <span className="text-sm font-medium truncate">{selectedFile.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              </div>
              {!isUploading && !isSuccess && (
                <Button variant="ghost" size="icon" onClick={handleClearFile} className="shrink-0">
                  <X className="w-4 h-4 text-muted-foreground" />
                </Button>
              )}
            </div>

            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            {error && (
              <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md">
                {error.message || 'An error occurred during upload.'}
              </div>
            )}

            {isSuccess && (
              <div className="flex items-center text-sm font-medium text-emerald-600 bg-emerald-50 p-3 rounded-md dark:bg-emerald-950/50 dark:text-emerald-400">
                <CheckCircle className="w-4 h-4 mr-2" />
                Artifact successfully attached.
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        {selectedFile && !isSuccess && (
          <>
            <Button variant="outline" onClick={handleClearFile} disabled={isUploading}>
              Cancel
            </Button>
            <Button onClick={handleUploadClick} disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading
                </>
              ) : (
                'Upload Artifact'
              )}
            </Button>
          </>
        )}
        {isSuccess && (
          <Button variant="outline" onClick={handleClearFile}>
            Upload Another
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
