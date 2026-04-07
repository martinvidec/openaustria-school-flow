import { useRef, useCallback } from 'react';
import { Paperclip, X, FileText, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Per UI-SPEC COMM-04: File attachment upload component.
 * Accepts PDF, JPG, PNG, DOC, DOCX. Max 5 MB per file, max 5 files per message.
 * Shows inline error messages per UI-SPEC copywriting.
 */

interface MessageAttachmentUploadProps {
  files: File[];
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
  maxFiles: number;
  maxSizeBytes: number;
}

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
const ALLOWED_ACCEPT =
  'application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function getExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf('.');
  return dotIndex >= 0 ? filename.slice(dotIndex).toLowerCase() : '';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(filename: string) {
  const ext = getExtension(filename);
  if (['.jpg', '.jpeg', '.png'].includes(ext)) {
    return <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" />;
  }
  return <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />;
}

export function MessageAttachmentUpload({
  files,
  onAdd,
  onRemove,
  maxFiles,
  maxSizeBytes,
}: MessageAttachmentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<string | null>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files ?? []);
      if (selected.length === 0) return;

      errorRef.current = null;
      const valid: File[] = [];

      for (const file of selected) {
        const ext = getExtension(file.name);
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
          errorRef.current =
            'Dieser Dateityp wird nicht unterstuetzt. Erlaubt: PDF, JPG, PNG, DOC, DOCX.';
          continue;
        }
        if (file.size > maxSizeBytes) {
          errorRef.current =
            'Die Datei ist zu gross. Maximale Dateigroesse: 5 MB.';
          continue;
        }
        valid.push(file);
      }

      if (files.length + valid.length > maxFiles) {
        errorRef.current = 'Maximale Anzahl an Anhaengen erreicht (5).';
        const remaining = maxFiles - files.length;
        onAdd(valid.slice(0, Math.max(0, remaining)));
      } else {
        onAdd(valid);
      }

      // Reset input so the same file can be re-selected
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
    [files, maxFiles, maxSizeBytes, onAdd],
  );

  const error = errorRef.current;

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_ACCEPT}
        onChange={handleFileChange}
        className="hidden"
        multiple
        aria-hidden="true"
      />

      {/* Attached file list */}
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2"
            >
              {getFileIcon(file.name)}
              <span className="flex-1 text-sm truncate">{file.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">
                {formatBytes(file.size)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => onRemove(index)}
                aria-label="Anhang entfernen"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add file button */}
      {files.length < maxFiles && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          className="gap-2"
        >
          <Paperclip className="h-4 w-4" />
          Datei anfuegen
        </Button>
      )}

      {/* Hint text */}
      <p className="text-xs text-muted-foreground">
        PDF, JPG, PNG, DOC oder DOCX (max. 5 MB pro Datei)
      </p>

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
