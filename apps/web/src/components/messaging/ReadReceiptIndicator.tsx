import { Check, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Inline read receipt icon with 4 visual states per UI-SPEC Read Receipt Visual Encoding.
 *
 *  1. Sent (no delivery confirmation): single Check, muted-foreground
 *  2. Delivered (not read):            double CheckCheck, muted-foreground
 *  3. Partial read:                    double CheckCheck, primary color
 *  4. All read:                        double CheckCheck, success color
 *
 * Only visible when isOwn=true (sender's messages only -- per UI-SPEC COMM-03).
 * On click: calls onShowDetail to open the ReadReceiptDetail popover.
 */

interface ReadReceiptIndicatorProps {
  readCount: number;
  totalRecipients: number;
  isOwn: boolean;
  messageId: string;
  onShowDetail: () => void;
}

export function ReadReceiptIndicator({
  readCount,
  totalRecipients,
  isOwn,
  onShowDetail,
}: ReadReceiptIndicatorProps) {
  // Only visible for sender's own messages
  if (!isOwn) return null;

  const iconSize = 'h-3.5 w-3.5';

  // State 1: Sent (not delivered) -- readCount===0 AND totalRecipients===0
  if (readCount === 0 && totalRecipients === 0) {
    return (
      <button
        type="button"
        onClick={onShowDetail}
        className="inline-flex items-center"
        aria-label="Gesendet"
      >
        <Check className={cn(iconSize, 'text-muted-foreground')} />
      </button>
    );
  }

  // State 2: Delivered (not read) -- readCount===0, totalRecipients > 0
  if (readCount === 0) {
    return (
      <button
        type="button"
        onClick={onShowDetail}
        className="inline-flex items-center"
        aria-label="Zugestellt"
      >
        <CheckCheck className={cn(iconSize, 'text-muted-foreground')} />
      </button>
    );
  }

  // State 3: Partial read -- some but not all
  if (readCount > 0 && readCount < totalRecipients) {
    return (
      <button
        type="button"
        onClick={onShowDetail}
        className="inline-flex items-center"
        aria-label={`${readCount} von ${totalRecipients} gelesen`}
      >
        <CheckCheck className={cn(iconSize, 'text-primary')} />
      </button>
    );
  }

  // State 4: All read -- readCount >= totalRecipients
  return (
    <button
      type="button"
      onClick={onShowDetail}
      className="inline-flex items-center"
      aria-label="Gelesen"
    >
      <CheckCheck className={cn(iconSize, 'text-[hsl(142,71%,45%)]')} />
    </button>
  );
}
