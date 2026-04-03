import { useState, useRef, useCallback } from 'react';
import { Upload, X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FileUploadFieldProps {
  accept?: string;
  maxSizeBytes?: number;
  onFileSelect: (file: File | null) => void;
  existingFile?: { name: string; size: number } | null;
}

const DEFAULT_ACCEPT = 'application/pdf,image/jpeg,image/png';
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUploadField({
  accept = DEFAULT_ACCEPT,
  maxSizeBytes = DEFAULT_MAX_SIZE,
  onFileSelect,
  existingFile = null,
}: FileUploadFieldProps) {
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: number } | null>(
    existingFile,
  );
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptList = accept.split(',').map((t) => t.trim());

  const validateAndSelect = useCallback(
    (file: File) => {
      setError(null);

      // Validate file type
      if (!acceptList.some((t) => file.type === t)) {
        setError('Dieser Dateityp wird nicht unterstuetzt. Erlaubt: PDF, JPG, PNG.');
        return;
      }

      // Validate file size
      if (file.size > maxSizeBytes) {
        setError('Die Datei ist zu gross. Maximale Dateigroesse: 5 MB.');
        return;
      }

      setSelectedFile({ name: file.name, size: file.size });
      onFileSelect(file);
    },
    [acceptList, maxSizeBytes, onFileSelect],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSelect(file);
    }
    // Reset input so the same file can be re-selected after clearing
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndSelect(file);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setError(null);
    onFileSelect(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />

      {selectedFile ? (
        <div className="flex items-center gap-3 rounded-md border border-border bg-muted/50 px-4 py-3">
          <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(selectedFile.size)}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClear}
            aria-label="Datei entfernen"
            className="h-8 w-8 shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={handleClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleClick();
            }
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-6 py-8 text-center transition-colors cursor-pointer',
            isDragOver
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50',
          )}
        >
          <Upload className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Datei hierher ziehen oder klicken zum Auswaehlen
          </p>
          <p className="text-xs text-muted-foreground">
            PDF, JPG oder PNG (max. 5 MB)
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
