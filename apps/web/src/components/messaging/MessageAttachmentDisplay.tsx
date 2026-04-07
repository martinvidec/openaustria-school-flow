import { FileText, ImageIcon, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MessageAttachmentDto } from '@schoolflow/shared';

/**
 * Per UI-SPEC COMM-04: Read-only attachment display in a message bubble.
 * Each attachment shows: file icon (per type), filename (truncated 30 chars),
 * size, download button. Image attachments show 48x48 thumbnail.
 */

interface MessageAttachmentDisplayProps {
  attachments: MessageAttachmentDto[];
  schoolId: string;
  conversationId: string;
  messageId: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function truncateFilename(name: string, maxLen = 30): string {
  if (name.length <= maxLen) return name;
  const ext = name.lastIndexOf('.');
  if (ext < 0) return name.slice(0, maxLen - 3) + '...';
  const extension = name.slice(ext);
  const base = name.slice(0, maxLen - extension.length - 3);
  return `${base}...${extension}`;
}

function isImageMime(mimeType: string): boolean {
  return mimeType === 'image/jpeg' || mimeType === 'image/png';
}

function getDownloadUrl(
  schoolId: string,
  conversationId: string,
  messageId: string,
  attachmentId: string,
): string {
  return `/api/v1/schools/${schoolId}/conversations/${conversationId}/messages/${messageId}/attachments/${attachmentId}/download`;
}

export function MessageAttachmentDisplay({
  attachments,
  schoolId,
  conversationId,
  messageId,
}: MessageAttachmentDisplayProps) {
  if (attachments.length === 0) return null;

  return (
    <div className="mt-2 space-y-1.5">
      {attachments.map((att) => {
        const url = getDownloadUrl(schoolId, conversationId, messageId, att.id);
        const isImage = isImageMime(att.mimeType);

        return (
          <div
            key={att.id}
            className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2"
          >
            {/* Thumbnail for images, icon for documents */}
            {isImage ? (
              <img
                src={url}
                alt={att.filename}
                className="h-12 w-12 rounded object-cover shrink-0"
              />
            ) : (
              <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
            )}

            {/* Filename + size */}
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">
                {truncateFilename(att.filename)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatBytes(att.sizeBytes)}
              </p>
            </div>

            {/* Download button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              asChild
            >
              <a
                href={url}
                download={att.filename}
                aria-label={`Herunterladen: ${att.filename}`}
              >
                <Download className="h-4 w-4" />
              </a>
            </Button>
          </div>
        );
      })}
    </div>
  );
}
