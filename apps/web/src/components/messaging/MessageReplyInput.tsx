import { useState, useRef, useCallback } from 'react';
import { Send, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Per UI-SPEC: fixed at bottom of detail panel. Textarea (auto-expand 1-3 lines)
 * with placeholder "Nachricht eingeben...". Paperclip button (attachment, wired in
 * Plan 06). Send button (Send icon, accent color). Enter sends, Shift+Enter newline.
 */

interface MessageReplyInputProps {
  onSend: (body: string) => void;
  disabled?: boolean;
}

export function MessageReplyInput({
  onSend,
  disabled = false,
}: MessageReplyInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue('');
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value, onSend]);

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

  return (
    <div className="flex items-end gap-2 p-4 border-t border-border bg-background">
      {/* Attachment button (placeholder for Plan 06) */}
      <Button
        variant="ghost"
        size="sm"
        className="shrink-0 h-10 w-10 p-0"
        disabled={disabled}
        title="Anhang hinzufuegen"
        type="button"
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
        disabled={disabled || !value.trim()}
        onClick={handleSend}
        title="Nachricht senden"
        type="button"
      >
        <Send className="h-5 w-5" />
      </Button>
    </div>
  );
}
