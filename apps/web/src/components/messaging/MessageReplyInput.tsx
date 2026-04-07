import { useState, useRef, useCallback } from 'react';
import { Send, Paperclip, X, FileText, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Per UI-SPEC: fixed at bottom of detail panel. Textarea (auto-expand 1-3 lines)
 * with placeholder "Nachricht eingeben...". Paperclip button for file attachments.
 * Send button (Send icon, accent color). Enter sends, Shift+Enter newline.
 */

interface MessageReplyInputProps {
  onSend: (body: string, files?: File[]) => void;
  disabled?: boolean;
}

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
const ALLOWED_ACCEPT =
  'application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 5;

function getExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf('.');
  return dotIndex >= 0 ? filename.slice(dotIndex).toLowerCase() : '';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(filename: string): boolean {
  const ext = getExtension(filename);
  return ['.jpg', '.jpeg', '.png'].includes(ext);
}

export function MessageReplyInput({
  onSend,
  disabled = false,
}: MessageReplyInputProps) {
  const [value, setValue] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed && files.length === 0) return;
    onSend(trimmed, files.length > 0 ? files : undefined);
    setValue('');
    setFiles([]);
    setFileError(null);
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value, files, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    // Clamp between 1 line (~36px) and 3 lines (~84px)
    el.style.height = `${Math.min(el.scrollHeight, 84)}px`;
  };

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files ?? []);
      if (selected.length === 0) return;

      setFileError(null);
      const valid: File[] = [];

      for (const file of selected) {
        const ext = getExtension(file.name);
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
          setFileError(
            'Dieser Dateityp wird nicht unterstuetzt. Erlaubt: PDF, JPG, PNG, DOC, DOCX.',
          );
          continue;
        }
        if (file.size > MAX_SIZE_BYTES) {
          setFileError('Die Datei ist zu gross. Maximale Dateigroesse: 5 MB.');
          continue;
        }
        valid.push(file);
      }

      const remaining = MAX_FILES - files.length;
      if (valid.length > remaining) {
        setFileError('Maximale Anzahl an Anhaengen erreicht (5).');
      }
      setFiles((prev) => [...prev, ...valid.slice(0, Math.max(0, remaining))]);

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [files],
  );

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setFileError(null);
  };

  return (
    <div className="border-t border-border bg-background">
      {/* Attached files preview */}
      {files.length > 0 && (
        <div className="px-4 pt-3 space-y-1">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-1.5"
            >
              {isImageFile(file.name) ? (
                <ImageIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              ) : (
                <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
              <span className="text-xs truncate flex-1">{file.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">
                {formatBytes(file.size)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5 shrink-0"
                onClick={() => removeFile(index)}
                aria-label="Anhang entfernen"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          {fileError && (
            <p className="text-xs text-destructive">{fileError}</p>
          )}
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2 p-4">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_ACCEPT}
          onChange={handleFileChange}
          className="hidden"
          multiple
          aria-hidden="true"
        />

        {/* Attachment button */}
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 h-10 w-10 p-0"
          disabled={disabled || files.length >= MAX_FILES}
          title="Datei anfuegen"
          aria-label="Datei anfuegen"
          type="button"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="h-5 w-5 text-muted-foreground" />
        </Button>

        {/* Message input */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder="Nachricht eingeben..."
          disabled={disabled}
          rows={1}
          className={cn(
            'flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm',
            'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            'min-h-[36px] max-h-[84px]',
          )}
        />

        {/* Send button */}
        <Button
          size="sm"
          className="shrink-0 h-10 w-10 p-0"
          disabled={disabled || (!value.trim() && files.length === 0)}
          onClick={handleSend}
          title="Nachricht senden"
          aria-label="Nachricht senden"
          type="button"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
