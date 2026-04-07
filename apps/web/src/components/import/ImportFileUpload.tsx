import { useState, useRef, useCallback } from 'react';
import { Upload } from 'lucide-react';

interface ImportFileUploadProps {
  onFileSelect: (file: File, detectedType: string) => void;
}

function detectFileType(file: File): string {
  const ext = file.name.toLowerCase().split('.').pop() ?? '';
  if (ext === 'xml') return 'UNTIS_XML';
  if (ext === 'csv') return 'CSV';
  if (ext === 'txt') return 'UNTIS_DIF';
  return 'CSV'; // fallback
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * ImportFileUpload -- Step 1 of ImportWizard.
 *
 * Drop zone with dashed border (200px min height) accepting .xml, .csv, .txt files.
 * Drag-and-drop or click-to-browse. Shows filename and size after selection.
 * Detects file type (Untis XML vs CSV vs DIF) and advances to next step.
 *
 * UI-SPEC: "Datei hierher ziehen oder klicken zum Auswaehlen"
 * Accessibility: role="button" aria-label="Datei auswaehlen"
 */
export function ImportFileUpload({ onFileSelect }: ImportFileUploadProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        setSelectedFile(file);
        const detectedType = detectFileType(file);
        onFileSelect(file, detectedType);
      }
    },
    [onFileSelect],
  );

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setSelectedFile(file);
        const detectedType = detectFileType(file);
        onFileSelect(file, detectedType);
      }
    },
    [onFileSelect],
  );

  return (
    <div className="space-y-4">
      <div
        role="button"
        aria-label="Datei auswaehlen"
        tabIndex={0}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        className={`
          min-h-[200px] flex flex-col items-center justify-center gap-4
          border-dashed border-2 rounded-lg cursor-pointer
          transition-colors
          ${
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-muted-foreground'
          }
        `}
      >
        <Upload className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {isDragActive
            ? 'Datei hier ablegen'
            : 'Datei hierher ziehen oder klicken zum Auswaehlen'}
        </p>
        <p className="text-xs text-muted-foreground">
          Untis XML, CSV oder DIF-Dateien
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".xml,.csv,.txt"
        className="hidden"
        onChange={handleFileChange}
      />

      {selectedFile && (
        <div className="flex items-center gap-2 rounded-md border border-border p-3 bg-muted/50">
          <Upload className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(selectedFile.size)} &middot;{' '}
              {detectFileType(selectedFile) === 'UNTIS_XML'
                ? 'Untis XML'
                : detectFileType(selectedFile) === 'UNTIS_DIF'
                  ? 'Untis DIF'
                  : 'CSV'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
